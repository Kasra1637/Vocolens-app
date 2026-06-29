/**
 * Vocolens Cloudflare Worker — single-file deployment
 *
 * Endpoints:
 *   GET  /                              health ping
 *   GET  /health                        health ping
 *   GET  /api/journal/status            connection status
 *   POST /api/transcribe                Deepgram STT
 *   POST /api/analyze                   analyse transcript
 *   POST /api/journal/analyze           alias for /api/analyze
 *   POST /api/recommend                 recommendation card
 *   POST /api/journal/recommendation    alias for /api/recommend
 *   POST /api/journal/weekly-reflection weekly narrative digest
 *   POST /api/journal/ai-completion     deep insights / general AI
 */

const MODEL = "openai/gpt-5.4-mini";

const ALLOWED_ORIGINS = [
  "https://vocolens.com",
  "https://www.vocolens.com",
  "https://vocolens-api.kasrammarvel.workers.dev",
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id, X-Api-Key",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(data, status = 200, request = null) {
  const headers = request ? getCorsHeaders(request) : {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id, X-Api-Key",
  };
  return Response.json(data, { status, headers });
}

function orHeaders(apiKey) {
  return {
    "Authorization": "Bearer " + apiKey,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://vocolens-api.kasrammarvel.workers.dev",
    "X-Title": "Vocolens",
  };
}

function stripFences(str) {
  return str
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

const ANALYSIS_PROMPT = "You are the core AI engine for Vocolens, an expert emotional intelligence analyst specialising in Plutchik's Wheel of Emotions.\nAnalyse the journal transcript text and return ONLY a valid JSON object \u2014 no markdown, no explanation.\n\nRULES:\n\n1. TITLE: Create a 3 to 6 word evocative title.\n   - Complete, self-contained phrase.\n   - NO dangling prepositions or conjunctions at the end (never end on To, And, With, For, Because).\n   - Good: Excitement for European Travels\n   - Bad: Excited To Travel To\n\n2. RECOMMENDATION: Write a deeply supportive paragraph for users with ADHD, ADD, OCD, and Tourette's syndrome.\n   - LENGTH: Strictly 75 to 100 words.\n   - DO NOT quote the user's text back to them.\n   - TONE: Predictable, zero-stress, grounding, non-judgmental.\n   - Acknowledge their state, validate with self-compassion, then dictate exactly ONE specific low-effort tiny task.\n   - NEVER ask open-ended questions. Invent and dictate the exact task.\n\n3. EMOTION ANALYSIS:\n   - Base emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation.\n   - emotionScores: all 8 emotions scored 0-100.\n   - emotions: only emotions with score >= 30, max 4.\n   - topThreeEmotions: exactly 3 ranked objects with emotion, score, intensityLabel.\n   - intensityLabel Plutchik scale:\n       happiness: Serenity / Joy / Ecstasy\n       trust: Acceptance / Trust / Admiration\n       fear: Apprehension / Fear / Terror\n       surprise: Distraction / Surprise / Amazement\n       sadness: Pensiveness / Sadness / Grief\n       disgust: Boredom / Disgust / Loathing\n       anger: Annoyance / Anger / Rage\n       anticipation: Interest / Anticipation / Vigilance\n   - blendedEmotions: valid dyads when BOTH component emotions >= 40.\n   - ambivalenceFlags: opposite pairs both >= 35.\n   - valence: -100 (very unpleasant) to +100 (very pleasant).\n   - arousal: 0 (very calm) to 100 (very activated).\n   - distressLevel: low | moderate | high.\n\nReturn this exact JSON shape:\n{\n  \"title\": \"3-6 word self-contained phrase\",\n  \"recommendation\": \"75-100 word paragraph with one dictated tiny task\",\n  \"emotions\": [\"happiness\", \"trust\"],\n  \"primaryEmotion\": \"happiness\",\n  \"emotionIntensity\": 75,\n  \"emotionScores\": { \"happiness\": 80, \"sadness\": 10, \"anger\": 5, \"disgust\": 2, \"fear\": 15, \"surprise\": 20, \"trust\": 60, \"anticipation\": 45 },\n  \"topThreeEmotions\": [\n    { \"emotion\": \"happiness\", \"score\": 80, \"intensityLabel\": \"Ecstasy\" },\n    { \"emotion\": \"trust\", \"score\": 60, \"intensityLabel\": \"Admiration\" },\n    { \"emotion\": \"anticipation\", \"score\": 45, \"intensityLabel\": \"Anticipation\" }\n  ],\n  \"blendedEmotions\": [\"Love\"],\n  \"ambivalenceFlags\": [],\n  \"topics\": [\"work\"],\n  \"analysis\": \"Brief analysis string.\",\n  \"reflection\": \"Warm second-person reflection for TTS.\",\n  \"insights\": [\"Insight 1\", \"Insight 2\"],\n  \"confidence\": 0.85,\n  \"valence\": 45,\n  \"arousal\": 62,\n  \"suggestedBodySensations\": [\"chest\", \"shoulders\"],\n  \"distressLevel\": \"low\"\n}";

const RECOMMENDATION_PROMPT = "You are the core AI engine for Vocolens, an empathetic voice journaling application.\nGenerate a hyper-personalised advocacy paragraph based on the user's journal transcript.\n\nRULES:\n- LENGTH: Strictly 75 to 100 words. Count before responding.\n- TONE: Grounded, warm, peer-like, deeply encouraging. Not clinical. Not preachy.\n- VOCABULARY: Strong verbs, domain-specific nouns matching the user's context.\n- BANNED WORDS: Delve, Testament, Beacon, Masterclass, Landscape, Tapestry, Journey.\n- FORMAT: Single cohesive paragraph. No bullet points. No introductory filler.\n- ADDRESS: Second person only. Never start with I.\n- Acknowledge their exact state, validate with specificity, dictate one actionable tiny task.\n- NEVER ask open-ended questions. Invent and dictate the exact task.\n\nReturn ONLY this JSON \u2014 no markdown, no explanation:\n{\n  \"advice\": \"75-100 word personalised paragraph\",\n  \"audioAdvice\": \"50-70 word TTS version, natural rhythm, no special characters\"\n}";

const WEEKLY_PROMPT = "You are a warm, insightful journaling companion creating a weekly reflection digest.\nTone: compassionate, personal, encouraging. Write directly to the person.\n\nReturn ONLY this JSON \u2014 no markdown, no explanation:\n{\n  \"narrativeSummary\": \"2-3 sentence warm narrative overview\",\n  \"emotionalJourney\": \"1-2 sentences on how emotions evolved\",\n  \"keyThemes\": [\"theme1\", \"theme2\", \"theme3\"],\n  \"growthMoment\": \"1 sentence on a meaningful moment\",\n  \"weekAhead\": \"1 encouraging sentence for the coming week\",\n  \"dominantEmotion\": \"one of: happiness sadness anger disgust fear surprise trust anticipation\",\n  \"emotionalRange\": \"brief phrase e.g. Mostly grounded with moments of joy\"\n}";

async function handleTranscribe(request, env) {
  const body = await request.json();
  const audioBase64 = body.audioBase64;
  const language = body.language || "en";
  const mimeType = body.mimeType || "audio/mp4";

  if (!audioBase64) {
    return json({ error: "audioBase64 is required" }, 400);
  }

  const apiKey = env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return json({ error: "Deepgram API key not configured" }, 503);
  }

  const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

  const resp = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&language=" + language + "&punctuate=true&smart_format=true",
    {
      method: "POST",
      headers: {
        "Authorization": "Token " + apiKey,
        "Content-Type": mimeType,
      },
      body: binary,
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: "Deepgram error: " + err }, 502);
  }

  const data = await resp.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const transcript = alt?.transcript || "";
  const confidence = alt?.confidence || 0;
  const duration = data?.metadata?.duration || 0;

  return json({ success: true, transcript, confidence, duration });
}

async function handleAnalyze(request, env) {
  const body = await request.json();
  const transcript = body.transcript;
  const personalizationContext = body.personalizationContext;

  if (!transcript || transcript.trim().length === 0) {
    return json({ error: "transcript is required" }, 400);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "OpenRouter API key not configured" }, 503);
  }

  const systemPrompt = personalizationContext
    ? ANALYSIS_PROMPT + "\n\n" + personalizationContext
    : ANALYSIS_PROMPT;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyse this journal entry:\n\n\"" + transcript + "\"" },
      ],
      temperature: 0.7,
      max_tokens: 1400,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: "OpenRouter error: " + err }, 502);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: "Empty response from GPT 5.4 Mini" }, 502);
  }

  const result = JSON.parse(stripFences(content));
  return json({ success: true, data: result });
}

async function handleRecommend(request, env) {
  const body = await request.json();
  const transcript = body.transcript;
  const primaryEmotion = body.primaryEmotion || "happiness";

  if (!transcript || transcript.trim().length === 0) {
    return json({ error: "transcript is required" }, 400);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "OpenRouter API key not configured" }, 503);
  }

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: RECOMMENDATION_PROMPT },
        {
          role: "user",
          content: "Here is my journal entry:\n\n\"" + transcript + "\"\n\nPrimary emotion detected: " + primaryEmotion + "\n\nPlease provide a warm, personalised recommendation.",
        },
      ],
      temperature: 0.85,
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: "OpenRouter error: " + err }, 502);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: "Empty response from GPT 5.4 Mini" }, 502);
  }

  const result = JSON.parse(stripFences(content));

  const advice = (typeof result.advice === "string" && result.advice.trim().length >= 60)
    ? result.advice.trim()
    : "You showed up today and that already matters. Place both feet flat on the floor right now, feel the ground beneath you, and take three slow breaths in for four counts, hold for two, out for six. Do that once. That single act tells your nervous system it is safe, and from that calmer place everything else becomes a little more manageable.";

  const audioAdvice = (typeof result.audioAdvice === "string" && result.audioAdvice.trim().length > 0)
    ? result.audioAdvice.trim()
    : advice.split(".")[0] + ".";

  return json({ success: true, data: { advice, audioAdvice } });
}

async function handleWeeklyReflection(request, env) {
  const body = await request.json();
  const entries = body.entries;
  const weekLabel = body.weekLabel;

  if (!Array.isArray(entries) || entries.length === 0) {
    return json({ error: "entries array is required" }, 400);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "OpenRouter API key not configured" }, 503);
  }

  const entryDigest = entries.map(function(e, i) {
    const date = new Date(e.createdAt).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
    const transcript = e.transcript || "";
    const excerpt = transcript.slice(0, 300);
    const ellipsis = transcript.length > 300 ? "..." : "";
    const topics = Array.isArray(e.topics) ? e.topics.join(", ") : "";
    return "Entry " + (i + 1) + " (" + date + ") \u2014 Emotion: " + e.primaryEmotion + " (" + e.emotionIntensity + "% intensity)\nTopics: " + topics + "\nExcerpt: \"" + excerpt + ellipsis + "\"";
  }).join("\n\n---\n\n");

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: WEEKLY_PROMPT },
        {
          role: "user",
          content: "Here are my journal entries from " + weekLabel + ":\n\n" + entryDigest + "\n\nPlease create my weekly reflection digest.",
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: "OpenRouter error: " + err }, 502);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: "Empty response from GPT 5.4 Mini" }, 502);
  }

  const result = JSON.parse(stripFences(content));
  const validEmotions = ["happiness", "sadness", "anger", "disgust", "fear", "surprise", "trust", "anticipation"];

  return json({
    success: true,
    data: {
      narrativeSummary: result.narrativeSummary || "A week of meaningful reflection.",
      emotionalJourney: result.emotionalJourney || "Your emotions told a story this week.",
      keyThemes: Array.isArray(result.keyThemes) ? result.keyThemes.slice(0, 4) : [],
      growthMoment: result.growthMoment || "You showed up for yourself this week.",
      weekAhead: result.weekAhead || "Carry this week's wisdom forward.",
      dominantEmotion: validEmotions.includes(result.dominantEmotion) ? result.dominantEmotion : "trust",
      emotionalRange: result.emotionalRange || "A balanced week",
      entryCount: entries.length,
      weekLabel: weekLabel,
    },
  });
}

async function handleAICompletion(request, env) {
  const body = await request.json();
  const systemPrompt = body.systemPrompt;
  const userPrompt = body.userPrompt;
  const temperature = typeof body.temperature === "number" ? body.temperature : 0.7;
  const maxTokens = typeof body.maxTokens === "number" ? body.maxTokens : 2000;

  if (!systemPrompt || !userPrompt) {
    return json({ error: "systemPrompt and userPrompt are required" }, 400);
  }

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: "OpenRouter API key not configured" }, 503);
  }

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: "OpenRouter error: " + err }, 502);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: "Empty response from GPT 5.4 Mini" }, 502);
  }

  const result = JSON.parse(stripFences(content));
  return json({ success: true, data: result });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    if (path === "/" || path === "/health") {
      return json({ status: "ok", model: MODEL }, 200, request);
    }

    if (path === "/api/journal/status" && request.method === "GET") {
      const configured = Boolean(env.OPENROUTER_API_KEY);
      return json({
        openrouter: configured ? "connected" : "not_configured",
        model: MODEL,
        status: configured ? "ok" : "missing_api_key",
      }, 200, request);
    }

    if (request.method === "POST") {
      const clientKey = request.headers.get("X-Api-Key") || "";
      const serverKey = env.VOCOLENS_API_KEY || "";
      if (!serverKey || clientKey !== serverKey) {
        return json({ error: "Unauthorized" }, 401, request);
      }
    }

    if (request.method !== "POST") {
      return json({ error: "Not found" }, 404, request);
    }

    try {
      if (path === "/api/transcribe") {
        return await handleTranscribe(request, env);
      }
      if (path === "/api/analyze" || path === "/api/journal/analyze") {
        return await handleAnalyze(request, env);
      }
      if (path === "/api/recommend" || path === "/api/journal/recommendation") {
        return await handleRecommend(request, env);
      }
      if (path === "/api/journal/weekly-reflection") {
        return await handleWeeklyReflection(request, env);
      }
      if (path === "/api/journal/ai-completion") {
        return await handleAICompletion(request, env);
      }
      return json({ error: "Not found" }, 404, request);
    } catch (err) {
      console.error("[Worker] Unhandled error:", err.message);
      return json({ error: err.message }, 500, request);
    }
  },
};
