/**
 * Vocolens Cloudflare Worker — single-file deployment
 *
 * Endpoints:
 *   GET  /                              health ping
 *   GET  /health                        health ping
 *   POST /api/transcribe                Deepgram STT
 *   POST /api/analyze                   OpenRouter analyse transcript
 *   POST /api/recommend                 OpenRouter recommendation card
 *   POST /api/journal/analyze           alias → /api/analyze
 *   POST /api/journal/recommendation    alias → /api/recommend
 *   POST /api/journal/weekly-reflection weekly narrative digest
 *   POST /api/journal/ai-completion     general AI completion (deep insights)
 *   GET  /api/journal/status            connection status
 */

// ─── Model ───────────────────────────────────────────────────────────────────
// IMPORTANT: OpenRouter uses hyphens in Claude model IDs, NOT dots.
// "anthropic/claude-3.7-sonnet" is INVALID and will fail silently.
// "anthropic/claude-3-7-sonnet" is the correct identifier.
const MODEL = "anthropic/claude-3-7-sonnet";

// ─── CORS headers ─────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}

// ─── System prompts ───────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are the core AI engine for Vocolens, an expert emotional intelligence analyst specialising in Plutchik's Wheel of Emotions.
Analyse the journal transcript text and return ONLY a valid JSON object — no markdown, no explanation.

<rules>
1. TITLE: Create a 3 to 6 word evocative title.
   - It MUST be a complete, self-contained phrase.
   - ABSOLUTELY NO dangling prepositions, conjunctions, or unfinished thoughts at the end (e.g., never end on words like 'To', 'And', 'With', 'For', 'Because').
   - Example Good: "Excitement for European Travels"
   - Example Bad: "Excited To Travel To"

2. RECOMMENDATION: Write a deeply supportive paragraph tailored specifically for users with ADHD, ADD, OCD, and Tourette's syndrome.
   - LENGTH: Strictly between 75 and 100 words.
   - CONTENT BAN: DO NOT quote the user's text back to them.
   - TONE: Predictable, zero-stress, grounding, and non-judgmental.
   - STRUCTURE: Acknowledge their state, validate with self-compassion, and then you MUST dictate exactly ONE highly specific, low-effort "tiny task" they can do right now to ground themselves.
   - CRITICAL BAN: DO NOT ask open-ended questions (e.g., never say "Ask yourself what to do"). You must invent and dictate the exact task to eliminate decision fatigue and cognitive load.

3. EMOTION ANALYSIS:
   - Base emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation.
   - emotionScores: all 8 emotions scored 0-100
   - emotions: only emotions with score >= 30, max 4
   - blendedEmotions: valid dyads when BOTH component emotions >= 40
   - ambivalenceFlags: opposite pairs both >= 35
   - topThreeEmotions: exactly 3 ranked objects { emotion, score, intensityLabel }
     intensityLabel uses Plutchik 3-tier scale:
       happiness: Serenity / Joy / Ecstasy
       trust: Acceptance / Trust / Admiration
       fear: Apprehension / Fear / Terror
       surprise: Distraction / Surprise / Amazement
       sadness: Pensiveness / Sadness / Grief
       disgust: Boredom / Disgust / Loathing
       anger: Annoyance / Anger / Rage
       anticipation: Interest / Anticipation / Vigilance
   - valence: -100 (very unpleasant) to +100 (very pleasant)
   - arousal: 0 (very calm) to 100 (very activated)
   - distressLevel: "low" | "moderate" | "high"
</rules>

<output_format>
{
  "title": "String (3-6 words, self-contained, no dangling prepositions)",
  "recommendation": "String (75-100 words, one dictated tiny task, no questions)",
  "emotions": ["happiness", "trust"],
  "primaryEmotion": "happiness",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2,
    "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45
  },
  "topThreeEmotions": [
    { "emotion": "happiness", "score": 80, "intensityLabel": "Ecstasy" },
    { "emotion": "trust",     "score": 60, "intensityLabel": "Admiration" },
    { "emotion": "anticipation", "score": 45, "intensityLabel": "Anticipation" }
  ],
  "blendedEmotions": ["Love"],
  "ambivalenceFlags": [],
  "topics": ["work"],
  "analysis": "Brief analysis string.",
  "reflection": "Warm second-person reflection for TTS playback.",
  "insights": ["Insight 1", "Insight 2"],
  "confidence": 0.85,
  "valence": 45,
  "arousal": 62,
  "suggestedBodySensations": ["chest", "shoulders"],
  "distressLevel": "low"
}
</output_format>`;

const RECOMMENDATION_SYSTEM_PROMPT = `You are the core AI engine for Vocolens, an empathetic voice journaling application.
Analyse the user's raw voice transcript and generate a hyper-personalised advocacy/recommendation block.

### CONSTANT RULE: NO REPETITION & NO PLACEHOLDERS
The recommendation must be completely bespoke to the specific milestone, conflict, or thought expressed.
If you catch yourself using standard journaling templates or safe AI filler phrases, discard them and rewrite using raw, concrete details from the text.

### THE PERSONALIZED ADVOCACY CARD
Generate a beautifully written, highly relevant paragraph of supportive, motivational, personalised advice.

RULES:
- LENGTH: Strictly between 75 and 100 words. Count words before responding.
- TONE: Grounded, warm, peer-like, and deeply encouraging — not clinical, not preachy.
- VOCABULARY: Strong verbs and domain-specific nouns matching the user's context.
- BANNED WORDS: Never use "Delve", "Testament", "Beacon", "Masterclass", "Landscape", "Tapestry", "Journey".
- STRUCTURE: Vary sentence lengths. Mix short punchy sentences with longer analytical ones.
- FORMAT: A single cohesive paragraph. No bullet points. No introductory filler. Dive straight into the insight.
- ADDRESS: Always speak in second person ("you", "your"). Never start with "I".
- CONTENT: Acknowledge their exact state, validate with specificity, dictate one actionable tiny task.
- CRITICAL BAN: DO NOT ask open-ended questions. Invent and dictate the exact task.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "advice": "75-100 word personalised advocacy paragraph.",
  "audioAdvice": "50-70 words. Warmest distillation for TTS — natural rhythm, no special characters."
}`;

// ─── OpenRouter helpers ───────────────────────────────────────────────────────

function orHeaders(apiKey) {
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://vocolens-api.kasrammarvel.workers.dev",
    "X-Title": "Vocolens",
  };
}

function stripCodeFences(str) {
  return str
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleTranscribe(request, env) {
  const { audioBase64, language = "en", mimeType = "audio/mp4" } = await request.json();
  if (!audioBase64) return json({ error: "audioBase64 is required" }, 400);

  const apiKey = env.DEEPGRAM_API_KEY;
  if (!apiKey) return json({ error: "Deepgram API key not configured" }, 503);

  const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const resp = await fetch(
    `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&punctuate=true&smart_format=true`,
    {
      method: "POST",
      headers: { "Authorization": `Token ${apiKey}`, "Content-Type": mimeType },
      body: binary,
    }
  );

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `Deepgram error: ${err}` }, 502);
  }

  const data = await resp.json();
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0;
  const duration   = data.metadata?.duration ?? 0;
  return json({ success: true, transcript, confidence, duration });
}

async function handleAnalyze(request, env) {
  const { transcript, personalizationContext } = await request.json();
  if (!transcript || transcript.trim().length === 0)
    return json({ error: "transcript is required" }, 400);

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: "OpenRouter API key not configured" }, 503);

  const systemPrompt = personalizationContext
    ? `${ANALYSIS_SYSTEM_PROMPT}\n\n${personalizationContext}`
    : ANALYSIS_SYSTEM_PROMPT;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,    // ✅ "anthropic/claude-3-7-sonnet" — hyphens, not dots
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Analyse this journal entry:\n\n"${transcript}"` },
      ],
      temperature: 0.7,
      max_tokens: 1400,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `OpenRouter error: ${err}` }, 502);
  }

  const data    = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return json({ error: "Empty response from Claude" }, 502);

  const result = JSON.parse(stripCodeFences(content));
  return json({ success: true, data: result });
}

async function handleRecommend(request, env) {
  const { transcript, primaryEmotion = "happiness" } = await request.json();
  if (!transcript || transcript.trim().length === 0)
    return json({ error: "transcript is required" }, 400);

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: "OpenRouter API key not configured" }, 503);

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: RECOMMENDATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is my journal entry:\n\n"${transcript}"\n\nPrimary emotion detected: ${primaryEmotion}\n\nPlease provide a warm, personalised recommendation.`,
        },
      ],
      temperature: 0.85,
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `OpenRouter error: ${err}` }, 502);
  }

  const data    = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return json({ error: "Empty response from Claude" }, 502);

  const result     = JSON.parse(stripCodeFences(content));
  const advice     = typeof result.advice === "string" && result.advice.trim().length >= 60
    ? result.advice.trim()
    : "You've shown real courage by showing up today. Take a slow breath in through your nose for four counts, hold for four, and release for four — repeat that three times right now. That single act will lower your nervous system's alert level and give your mind a moment of genuine calm to work from.";
  const audioAdvice = typeof result.audioAdvice === "string" && result.audioAdvice.trim().length > 0
    ? result.audioAdvice.trim()
    : advice.split(".")[0] + ".";

  return json({ success: true, data: { advice, audioAdvice } });
}

async function handleWeeklyReflection(request, env) {
  const { entries, weekLabel } = await request.json();
  if (!Array.isArray(entries) || entries.length === 0)
    return json({ error: "entries array is required" }, 400);

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: "OpenRouter API key not configured" }, 503);

  const entryDigest = entries
    .map((e, i) => {
      const date = new Date(e.createdAt).toLocaleDateString("en-US", {
        weekday: "long", month: "short", day: "numeric",
      });
      const excerpt = (e.transcript ?? "").slice(0, 300);
      return `Entry ${i + 1} (${date}) — Emotion: ${e.primaryEmotion} (${e.emotionIntensity}% intensity)\nTopics: ${(e.topics ?? []).join(", ")}\nExcerpt: "${excerpt}${(e.transcript ?? "").length > 300 ? "..." : ""}"`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are a warm, insightful journaling companion creating a weekly reflection digest.
Tone: compassionate, personal, encouraging — like a wise friend who truly listened.
Write directly to the person.

Respond with ONLY a valid JSON object — no markdown fences, no commentary:
{
  "narrativeSummary": "2-3 sentence warm narrative overview of their week's emotional journey",
  "emotionalJourney": "1-2 sentences describing how their emotions evolved through the week",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "growthMoment": "1 sentence highlighting a meaningful moment or insight",
  "weekAhead": "1 encouraging sentence for the coming week",
  "dominantEmotion": "one of: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation",
  "emotionalRange": "brief phrase e.g. 'Mostly grounded with moments of joy'"
}`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: `Here are my journal entries from ${weekLabel}:\n\n${entryDigest}\n\nPlease create my weekly reflection digest.` },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `OpenRouter error: ${err}` }, 502);
  }

  const data    = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return json({ error: "Empty response from Claude" }, 502);

  const result = JSON.parse(stripCodeFences(content));
  const validEmotions = ["happiness","sadness","anger","disgust","fear","surprise","trust","anticipation"];

  return json({
    success: true,
    data: {
      narrativeSummary:  result.narrativeSummary  || "A week of meaningful reflection.",
      emotionalJourney:  result.emotionalJourney  || "Your emotions told a story this week.",
      keyThemes:         Array.isArray(result.keyThemes) ? result.keyThemes.slice(0, 4) : [],
      growthMoment:      result.growthMoment  || "You showed up for yourself this week.",
      weekAhead:         result.weekAhead     || "Carry this week's wisdom forward.",
      dominantEmotion:   validEmotions.includes(result.dominantEmotion) ? result.dominantEmotion : "trust",
      emotionalRange:    result.emotionalRange || "A balanced week",
      entryCount:        entries.length,
      weekLabel,
    },
  });
}

async function handleAICompletion(request, env) {
  const { systemPrompt, userPrompt, temperature = 0.7, maxTokens = 2000 } = await request.json();
  if (!systemPrompt || !userPrompt)
    return json({ error: "systemPrompt and userPrompt are required" }, 400);

  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return json({ error: "OpenRouter API key not configured" }, 503);

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    return json({ error: `OpenRouter error: ${err}` }, 502);
  }

  const data    = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return json({ error: "Empty response from Claude" }, 502);

  const result = JSON.parse(stripCodeFences(content));
  return json({ success: true, data: result });
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // Health / root
    if (path === "/" || path === "/health") {
      return json({ status: "ok", model: MODEL });
    }

    // Journal status
    if (path === "/api/journal/status" && request.method === "GET") {
      const configured = Boolean(env.OPENROUTER_API_KEY);
      return json({
        openrouter: configured ? "connected" : "not_configured",
        model: MODEL,
        status: configured ? "ok" : "missing_api_key",
      });
    }

    // All POST routes
    if (request.method !== "POST") {
      return json({ error: "Not found" }, 404);
    }

    try {
      // Transcription
      if (path === "/api/transcribe") return await handleTranscribe(request, env);

      // Analysis — canonical + alias
      if (path === "/api/analyze" || path === "/api/journal/analyze")
        return await handleAnalyze(request, env);

      // Recommendation — canonical + alias
      if (path === "/api/recommend" || path === "/api/journal/recommendation")
        return await handleRecommend(request, env);

      // Weekly reflection
      if (path === "/api/journal/weekly-reflection")
        return await handleWeeklyReflection(request, env);

      // General AI completion (deep insights)
      if (path === "/api/journal/ai-completion")
        return await handleAICompletion(request, env);

      return json({ error: "Not found" }, 404);

    } catch (err) {
      console.error("[Worker] Unhandled error:", err.message);
      return json({ error: err.message }, 500);
    }
  },
};
