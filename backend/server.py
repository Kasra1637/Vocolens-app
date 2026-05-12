"""
VocoLens Backend - FastAPI Server
Implements the same API surface as the original Hono/Bun backend,
rewritten in Python/FastAPI to run in the Emergent platform ecosystem.
"""

import os
import re
import json
import random
import asyncio
from datetime import datetime
from typing import Optional, List, Any
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env vars from the project root .env.local
load_dotenv('/app/.env.local')

# ── Constants ──────────────────────────────────────────────────────────────────
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "anthropic/claude-3.5-sonnet-20241022"
# kept for compatibility
AUDIO_MODEL = MODEL
TEXT_FALLBACK_MODEL = MODEL
USAGE_LIMIT_MINUTES = 300

# Plutchik intensity labels
PLUTCHIK_LABELS = {
    "happiness":    {"low": "Serenity",     "mid": "Joy",          "high": "Ecstasy"},
    "trust":        {"low": "Acceptance",   "mid": "Trust",        "high": "Admiration"},
    "fear":         {"low": "Apprehension", "mid": "Fear",         "high": "Terror"},
    "surprise":     {"low": "Distraction",  "mid": "Surprise",     "high": "Amazement"},
    "sadness":      {"low": "Pensiveness",  "mid": "Sadness",      "high": "Grief"},
    "disgust":      {"low": "Boredom",      "mid": "Disgust",      "high": "Loathing"},
    "anger":        {"low": "Annoyance",    "mid": "Anger",        "high": "Rage"},
    "anticipation": {"low": "Interest",     "mid": "Anticipation", "high": "Vigilance"},
}

VALID_EMOTIONS = ["happiness", "sadness", "anger", "disgust", "fear", "surprise", "trust", "anticipation"]

# Plutchik primary dyads: blend → (emotion1, emotion2)
BLENDED_EMOTION_RULES = {
    "Love":           ("happiness", "trust"),
    "Optimism":       ("anticipation", "happiness"),
    "Submission":     ("trust", "fear"),
    "Awe":            ("fear", "surprise"),
    "Disapproval":    ("surprise", "sadness"),
    "Remorse":        ("sadness", "disgust"),
    "Contempt":       ("disgust", "anger"),
    "Aggressiveness": ("anger", "anticipation"),
}

OPPOSITE_PAIRS = [
    ("happiness", "sadness"),
    ("anger",     "fear"),
    ("trust",     "disgust"),
    ("anticipation", "surprise"),
]

CLAUDE_SYSTEM_PROMPT = """You are an expert emotional intelligence analyst specialising in Plutchik's wheel of emotions.
Analyse the journal transcript text and return ONLY a valid JSON object — no markdown, no explanation.

{
  "emotions": ["emotion1", "emotion2"],
  "primaryEmotion": "emotion",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2,
    "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45
  },
  "topThreeEmotions": [
    { "emotion": "happiness", "score": 80, "intensityLabel": "Ecstasy" },
    { "emotion": "trust",     "score": 60, "intensityLabel": "Admiration" },
    { "emotion": "surprise",  "score": 20, "intensityLabel": "Distraction" }
  ],
  "blendedEmotions": ["Love", "Optimism"],
  "ambivalenceFlags": ["happiness↔sadness"],
  "topics": ["topic1", "topic2"],
  "analysis": "compassionate analysis paragraph (2-3 sentences)",
  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",
  "insights": ["insight1", "insight2"],
  "confidence": 0.85,
  "valence": 45,
  "arousal": 62,
  "suggestedBodySensations": ["tight shoulders", "racing heart"],
  "distressLevel": "low"
}

Rules:
- emotionScores: all 8 emotions scored 0-100
- emotions: only emotions with score >= 30, max 4
- primaryEmotion: highest scoring emotion
- emotionIntensity: 0-100 overall intensity
- topThreeEmotions: top 3 by score with Plutchik intensity label
- blendedEmotions: Plutchik primary dyads when BOTH component emotions >= 40
  Values: Love(happiness+trust), Optimism(anticipation+happiness), Submission(trust+fear),
  Awe(fear+surprise), Disapproval(surprise+sadness), Remorse(sadness+disgust),
  Contempt(disgust+anger), Aggressiveness(anger+anticipation)
- ambivalenceFlags: opposite pairs both >= 35 -> "e1↔e2"
  Pairs: happiness↔sadness, anger↔fear, trust↔disgust, anticipation↔surprise
- valence: -100 to +100 | arousal: 0-100 | distressLevel: low|moderate|high
- reflection: warm, second-person ("you"), suitable for TTS
- Only valid base emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation"""

# In-memory usage store (resets on restart, same as original Hono backend)
usage_store: dict = {}


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="VocoLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ───────────────────────────────────────────────────────────────────
def get_api_key() -> Optional[str]:
    return os.environ.get("OPENROUTER_API_KEY")


def is_openrouter_configured() -> bool:
    key = get_api_key()
    return bool(key and key.startswith("sk-or-"))


def get_intensity_label(emotion: str, score: float) -> str:
    labels = PLUTCHIK_LABELS.get(emotion, {"low": emotion, "mid": emotion, "high": emotion})
    if score <= 35:
        return labels["low"]
    elif score <= 69:
        return labels["mid"]
    else:
        return labels["high"]


def build_intensity_labels(scores: dict) -> dict:
    return {e: get_intensity_label(e, scores.get(e, 0)) for e in VALID_EMOTIONS}


def compute_top_three_emotions(scores: dict) -> list:
    sorted_emotions = sorted(
        [(e, scores.get(e, 0)) for e in VALID_EMOTIONS],
        key=lambda x: x[1], reverse=True
    )[:3]
    return [
        {
            "emotion": e,
            "score": score,
            "rank": i + 1,
            "intensityLabel": get_intensity_label(e, score),
        }
        for i, (e, score) in enumerate(sorted_emotions)
    ]


def compute_blended_emotions(scores: dict) -> list:
    threshold = 40
    result = []
    for blend, (e1, e2) in BLENDED_EMOTION_RULES.items():
        if scores.get(e1, 0) >= threshold and scores.get(e2, 0) >= threshold:
            result.append(blend)
    return result


def detect_ambivalence(scores: dict) -> list:
    threshold = 35
    return [
        f"{e1}↔{e2}"
        for e1, e2 in OPPOSITE_PAIRS
        if scores.get(e1, 0) >= threshold and scores.get(e2, 0) >= threshold
    ]


def compute_valence(scores: dict) -> float:
    positive = scores.get("happiness", 0) + scores.get("trust", 0) + scores.get("anticipation", 0) + scores.get("surprise", 0)
    negative = scores.get("sadness", 0) + scores.get("fear", 0) + scores.get("anger", 0) + scores.get("disgust", 0)
    total = positive + negative
    if total == 0:
        return 0
    return round(((positive - negative) / total) * 100)


def compute_arousal(scores: dict) -> float:
    high = scores.get("anger", 0) + scores.get("fear", 0) + scores.get("surprise", 0) + scores.get("anticipation", 0)
    low = scores.get("sadness", 0) + scores.get("trust", 0) + scores.get("disgust", 0) + scores.get("happiness", 0) * 0.5
    total = high + low
    if total == 0:
        return 50
    return round((high / total) * 100)


def compute_distress_level(valence: float, arousal: float) -> str:
    distress = (-valence * 0.5) + (arousal * 0.5)
    if distress > 60:
        return "high"
    elif distress > 30:
        return "moderate"
    return "low"


def strip_json_fences(content: str) -> str:
    return re.sub(r'^```json\s*|^```\s*|```\s*$', '', content, flags=re.MULTILINE).strip()


def _parse_emotion_scores(result: dict) -> dict:
    """Parse and clamp all 8 emotion scores from the AI response."""
    scores = {e: 0 for e in VALID_EMOTIONS}
    raw = result.get("emotionScores")
    if isinstance(raw, dict):
        for e in VALID_EMOTIONS:
            try:
                scores[e] = max(0, min(100, float(raw.get(e, 0))))
            except (ValueError, TypeError):
                scores[e] = 0
    return scores


def _parse_emotions_and_primary(result: dict, emotion_scores: dict) -> tuple:
    """Return (emotions_list, primary_emotion) validated against VALID_EMOTIONS."""
    emotions = [e for e in (result.get("emotions") or []) if e in VALID_EMOTIONS][:4]
    if not emotions:
        emotions = ["happiness"]
    primary = result.get("primaryEmotion")
    if primary not in VALID_EMOTIONS:
        primary = emotions[0]
    return emotions, primary


def _parse_valence_arousal_distress(result: dict, emotion_scores: dict) -> tuple:
    """Return (valence, arousal, distress_level) with computed fallbacks."""
    valence_raw = result.get("valence")
    arousal_raw = result.get("arousal")
    valence = float(valence_raw) if isinstance(valence_raw, (int, float)) else compute_valence(emotion_scores)
    arousal = float(arousal_raw) if isinstance(arousal_raw, (int, float)) else compute_arousal(emotion_scores)
    distress_raw = result.get("distressLevel")
    distress = distress_raw if distress_raw in ("low", "moderate", "high") else compute_distress_level(valence, arousal)
    return valence, arousal, distress


def _parse_plutchik_breakdown(result: dict, emotion_scores: dict) -> tuple:
    """Return (top_three, blended, ambivalence) — AI response preferred, computed as fallback."""
    valid_blends = list(BLENDED_EMOTION_RULES.keys())

    raw_top3 = result.get("topThreeEmotions")
    if isinstance(raw_top3, list) and raw_top3:
        top_three = [
            {
                "emotion": r["emotion"],
                "score": max(0, min(100, float(r.get("score", 0)))),
                "rank": i + 1,
                "intensityLabel": r.get("intensityLabel") or get_intensity_label(r["emotion"], float(r.get("score", 0))),
            }
            for i, r in enumerate(raw_top3[:3])
            if r.get("emotion") in VALID_EMOTIONS
        ]
    else:
        top_three = compute_top_three_emotions(emotion_scores)

    raw_blended = result.get("blendedEmotions")
    blended = (
        [b for b in raw_blended if b in valid_blends]
        if isinstance(raw_blended, list) and raw_blended
        else compute_blended_emotions(emotion_scores)
    )

    raw_ambivalence = result.get("ambivalenceFlags")
    ambivalence = (
        list(raw_ambivalence)
        if isinstance(raw_ambivalence, list) and raw_ambivalence
        else detect_ambivalence(emotion_scores)
    )

    return top_three, blended, ambivalence


def _build_analysis_response(
    result: dict,
    emotion_scores: dict,
    emotions: list,
    primary_emotion: str,
    valence: float,
    arousal: float,
    distress: str,
    top_three: list,
    blended: list,
    ambivalence: list,
    audio_analyzed: bool,
    model_used: str,
) -> dict:
    """Assemble the final analysis response dict."""
    return {
        "emotions": emotions,
        "primaryEmotion": primary_emotion,
        "emotionIntensity": max(0, min(100, float(result.get("emotionIntensity") or 50))),
        "emotionScores": emotion_scores,
        "emotionIntensityLabels": build_intensity_labels(emotion_scores),
        "topics": list(result.get("topics") or ["reflection"])[:5],
        "analysis": result.get("analysis") or "Your journal entry has been recorded.",
        "reflection": result.get("reflection") or "Thank you for sharing. Your feelings are valid.",
        "insights": list(result.get("insights") or [])[:3],
        "confidence": max(0, min(1, float(result.get("confidence") or 0.8))),
        "audioAnalyzed": audio_analyzed,
        "modelUsed": model_used,
        "valence": valence,
        "arousal": arousal,
        "suggestedBodySensations": list(result.get("suggestedBodySensations") or [])[:3],
        "distressLevel": distress,
        "aiTopThreeEmotions": top_three,
        "aiBlendedEmotions": blended,
        "aiAmbivalenceFlags": ambivalence,
    }


def parse_analysis_json(content: str, audio_analyzed: bool, model_used: str) -> dict:
    """Parse and validate a Claude/GPT analysis JSON response into a structured dict."""
    json_str = strip_json_fences(content)
    result = json.loads(json_str)

    emotion_scores = _parse_emotion_scores(result)
    emotions, primary_emotion = _parse_emotions_and_primary(result, emotion_scores)
    valence, arousal, distress = _parse_valence_arousal_distress(result, emotion_scores)
    top_three, blended, ambivalence = _parse_plutchik_breakdown(result, emotion_scores)

    print(
        f"[OpenRouter] Analysis complete | model={model_used} | primary={primary_emotion} "
        f"| blended={','.join(blended) or 'none'} | ambivalence={','.join(ambivalence) or 'none'}"
    )

    return _build_analysis_response(
        result, emotion_scores, emotions, primary_emotion,
        valence, arousal, distress, top_three, blended, ambivalence,
        audio_analyzed, model_used,
    )


def build_openrouter_headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://blink.new",
        "X-Title": "Vocolens",
    }


# ── Journal Analysis — Claude 3.5 Sonnet text-only ────────────────────────────
async def analyze_transcript(transcript: str, audio_base64: Optional[str] = None) -> dict:
    api_key = get_api_key()
    if not api_key or not api_key.startswith("sk-or-"):
        raise ValueError("[OpenRouter] OPENROUTER_API_KEY is missing or invalid.")

    headers = build_openrouter_headers(api_key)

    # Text-only pipeline: Deepgram transcribes; Claude analyses
    print(f"[OpenRouter] Sending request → model={MODEL}")
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": CLAUDE_SYSTEM_PROMPT},
            {"role": "user", "content": f'Analyse this journal entry:\n\n"{transcript}"'},
        ],
        "temperature": 0.7,
        "max_tokens": 1400,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload)
        if resp.status_code != 200:
            raise ValueError(f"[OpenRouter] Claude error ({resp.status_code}): {resp.text}")

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise ValueError("[OpenRouter] Claude returned empty content")

        resolved_model = data.get("model") or MODEL
        print(f"[OpenRouter] ✓ Claude response received | resolved_model={resolved_model}")
        return parse_analysis_json(content, False, resolved_model)


async def analyze_transcript_with_retry(transcript: str, max_retries: int = 3, audio_base64: Optional[str] = None) -> dict:
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            return await analyze_transcript(transcript)
        except Exception as e:
            last_error = e
            print(f"[OpenRouter] Attempt {attempt}/{max_retries} failed: {e}")
            if attempt < max_retries:
                delay = min(1000 * (2 ** (attempt - 1)), 5000) / 1000
                print(f"[OpenRouter] Retrying in {delay}s...")
                await asyncio.sleep(delay)
    raise last_error or ValueError("[OpenRouter] All retry attempts exhausted")


# ── Usage helpers ─────────────────────────────────────────────────────────────
def get_current_month() -> str:
    return datetime.now().strftime("%Y-%m")


def get_or_init_usage(device_id: str) -> dict:
    if device_id not in usage_store:
        usage_store[device_id] = {
            "monthlyMinutes": 0,
            "totalMinutes": 0,
            "lastResetMonth": get_current_month(),
        }
    record = usage_store[device_id]
    current_month = get_current_month()
    if record["lastResetMonth"] != current_month:
        record["monthlyMinutes"] = 0
        record["lastResetMonth"] = current_month
    return record


# ── Pydantic models ───────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    transcript: str
    audioBase64: Optional[str] = None
    personalizationContext: Optional[str] = None


class WeeklyReflectionEntry(BaseModel):
    transcript: str
    primaryEmotion: str
    emotionIntensity: float
    topics: List[str]
    createdAt: str
    title: str


class WeeklyReflectionRequest(BaseModel):
    entries: List[WeeklyReflectionEntry]
    weekLabel: str


class AICompletionRequest(BaseModel):
    systemPrompt: str
    userPrompt: str
    temperature: Optional[float] = 0.7
    maxTokens: Optional[int] = 2000


class RecordUsageRequest(BaseModel):
    seconds: int


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/sample/")
def sample():
    greetings = ["Hello", "Hola", "Namaste", "Bonjour"]
    return {
        "data": {
            "message": f"{random.choice(greetings)} from the backend!",
            "timestamp": datetime.now().strftime("%H:%M:%S"),
        }
    }


@app.get("/api/journal/status")
def journal_status():
    configured = is_openrouter_configured()
    return {
        "openrouter": "connected" if configured else "not_configured",
        "model": MODEL,
        "baseUrl": "https://openrouter.ai",
        "status": "ok" if configured else "missing_api_key",
    }


@app.post("/api/journal/analyze")
async def journal_analyze(body: AnalyzeRequest):
    if not body.transcript or not body.transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is required")

    if not is_openrouter_configured():
        raise HTTPException(status_code=503, detail="OpenRouter API key not configured on server")

    try:
        result = await analyze_transcript_with_retry(body.transcript, 3, body.audioBase64)
        print("Chart Data Updated")
        return {"success": True, "data": result}
    except Exception as e:
        message = str(e)
        print(f"Journal analysis error: {message}")
        raise HTTPException(status_code=500, detail=message)


WEEKLY_REFLECTION_SYSTEM_PROMPT = """You are a warm, insightful journaling companion creating a weekly reflection digest.
Your tone is compassionate, personal, and encouraging — like a wise friend who truly listened.
Write as if speaking directly to the person. Keep narratives warm and intimate, not clinical.

Respond with valid JSON only (no markdown, no code fences):
{
  "narrativeSummary": "2-3 sentence warm narrative overview of their week's emotional journey",
  "emotionalJourney": "1-2 sentences describing how their emotions evolved through the week",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "growthMoment": "1 sentence highlighting a meaningful moment or insight from their entries",
  "weekAhead": "1 encouraging sentence for the coming week",
  "dominantEmotion": "the most prevalent emotion (one of: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation)",
  "emotionalRange": "brief phrase describing their emotional range e.g. 'Mostly grounded with moments of joy'"
}"""


@app.post("/api/journal/weekly-reflection")


def _format_entry_digest(entries: list) -> str:
    """Format journal entries into a readable text digest for the AI prompt."""
    parts = []
    for i, e in enumerate(entries):
        try:
            date_str = datetime.fromisoformat(e.createdAt.replace('Z', '+00:00')).strftime('%A, %b %-d')
        except Exception:
            date_str = 'Unknown'
        excerpt = e.transcript[:300] + ('...' if len(e.transcript) > 300 else '')
        parts.append(
            f"Entry {i+1} ({date_str}) — Emotion: {e.primaryEmotion} ({e.emotionIntensity}% intensity)\n"
            f"Topics: {', '.join(e.topics)}\n"
            f'Excerpt: "{excerpt}"'
        )
    return "\n\n---\n\n".join(parts)


def _build_weekly_payload(entry_digest: str, week_label: str) -> dict:
    """Build the OpenRouter API payload for weekly reflection."""
    return {
        "model": TEXT_FALLBACK_MODEL,
        "messages": [
            {"role": "system", "content": WEEKLY_REFLECTION_SYSTEM_PROMPT},
            {"role": "user", "content": f"Here are my journal entries from {week_label}:\n\n{entry_digest}\n\nPlease create my weekly reflection digest."},
        ],
        "temperature": 0.8,
        "max_tokens": 800,
    }


async def _call_weekly_reflection_api(payload: dict, headers: dict) -> dict:
    """Call the OpenRouter API and return the parsed JSON result dict."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload)
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"OpenRouter error ({resp.status_code}): {resp.text}")
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not content:
            raise HTTPException(status_code=502, detail="Weekly reflection returned empty content")
        return json.loads(strip_json_fences(content))


def _build_reflection_response(result: dict, entry_count: int, week_label: str) -> dict:
    """Validate and normalise a weekly reflection result dict."""
    dominant = result.get("dominantEmotion") if result.get("dominantEmotion") in VALID_EMOTIONS else "trust"
    print(f"[OpenRouter] Weekly reflection generated | entries={entry_count} | dominant={dominant}")
    return {
        "success": True,
        "data": {
            "narrativeSummary": result.get("narrativeSummary") or "A week of meaningful reflection.",
            "emotionalJourney": result.get("emotionalJourney") or "Your emotions told a story this week.",
            "keyThemes": list(result.get("keyThemes") or [])[:4],
            "growthMoment": result.get("growthMoment") or "You showed up for yourself this week.",
            "weekAhead": result.get("weekAhead") or "Carry this week's wisdom forward.",
            "dominantEmotion": dominant,
            "emotionalRange": result.get("emotionalRange") or "A balanced week",
            "entryCount": entry_count,
            "weekLabel": week_label,
        },
    }


async def weekly_reflection(body: WeeklyReflectionRequest):
    if not body.entries:
        raise HTTPException(status_code=400, detail="At least one entry required")
    if not is_openrouter_configured():
        raise HTTPException(status_code=503, detail="OpenRouter API key not configured on server")

    api_key = get_api_key()
    headers = build_openrouter_headers(api_key)
    entry_digest = _format_entry_digest(body.entries)
    payload = _build_weekly_payload(entry_digest, body.weekLabel)

    try:
        result = await _call_weekly_reflection_api(payload, headers)
        return _build_reflection_response(result, len(body.entries), body.weekLabel)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/journal/ai-completion")
async def ai_completion(body: AICompletionRequest):
    if not is_openrouter_configured():
        raise HTTPException(status_code=503, detail="OpenRouter API key not configured on server")

    api_key = get_api_key()
    headers = build_openrouter_headers(api_key)

    payload = {
        "model": TEXT_FALLBACK_MODEL,
        "messages": [
            {"role": "system", "content": body.systemPrompt},
            {"role": "user", "content": body.userPrompt},
        ],
        "temperature": body.temperature or 0.7,
        "max_tokens": body.maxTokens or 2000,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", headers=headers, json=payload)
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=f"OpenRouter error ({resp.status_code}): {resp.text}")

            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content")
            if not content:
                raise HTTPException(status_code=502, detail="AI completion returned empty content")

            json_str = strip_json_fences(content)
            return {"success": True, "data": json.loads(json_str)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/usage/status")
def usage_status(x_device_id: Optional[str] = Header(default="anonymous", alias="X-Device-Id")):
    device_id = x_device_id or "anonymous"
    record = get_or_init_usage(device_id)
    return {
        "monthlyMinutesUsed": record["monthlyMinutes"],
        "totalMinutesUsed": record["totalMinutes"],
        "limitMinutes": USAGE_LIMIT_MINUTES,
        "remainingMinutes": max(0, USAGE_LIMIT_MINUTES - record["monthlyMinutes"]),
        "isAtLimit": record["monthlyMinutes"] >= USAGE_LIMIT_MINUTES,
    }


@app.post("/api/usage/record")
def usage_record(
    body: RecordUsageRequest,
    x_device_id: Optional[str] = Header(default="anonymous", alias="X-Device-Id"),
):
    device_id = x_device_id or "anonymous"

    if body.seconds < 1 or body.seconds > 7200:
        raise HTTPException(status_code=400, detail="seconds must be between 1 and 7200")

    minutes = body.seconds / 60
    record = get_or_init_usage(device_id)
    record["totalMinutes"] += minutes
    record["monthlyMinutes"] += minutes

    print(f"[Usage] device={device_id} session_minutes={minutes:.2f} monthly={record['monthlyMinutes']:.2f}/{USAGE_LIMIT_MINUTES}")

    return {
        "success": True,
        "monthlyMinutesUsed": record["monthlyMinutes"],
        "totalMinutesUsed": record["totalMinutes"],
        "limitMinutes": USAGE_LIMIT_MINUTES,
        "remainingMinutes": max(0, USAGE_LIMIT_MINUTES - record["monthlyMinutes"]),
        "isAtLimit": record["monthlyMinutes"] >= USAGE_LIMIT_MINUTES,
    }
