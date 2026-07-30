/**
 * Vocolens Cloudflare Worker — single-file deployment
 *
 * Endpoints:
 *   GET  /                              health ping
 *   GET  /health                        health ping
 *   GET  /api/journal/status            connection status
 *   GET  /api/usage/status              server-authoritative monthly balance
 *   POST /api/transcribe                Deepgram STT (meters audio minutes)
 *   POST /api/analyze                   analyse transcript
 *   POST /api/journal/analyze           alias for /api/analyze
 *   POST /api/recommend                 recommendation card
 *   POST /api/journal/recommendation    alias for /api/recommend
 *   POST /api/journal/weekly-reflection weekly narrative digest
 *   POST /api/journal/ai-completion     deep insights / general AI
 */

// ─── Model ───────────────────────────────────────────────────────────────────
// PRIMARY & ONLY model for the entire app. Every AI feature (analysis,
// recommendation, weekly reflection, AI completion) routes exclusively to
// GPT 5.4 Mini via OpenRouter so all usage is attributable in the OpenRouter
// dashboard. Do NOT add fallbacks to other providers.
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

// ─── Usage metering (server-authoritative monthly cap) ───────────────────────
//
// The 300-minute cap is a cost-control mechanism: every audio second costs us
// money at Deepgram and OpenRouter. It therefore MUST be enforced here, not in
// the app. The client's local counter is display-only and is treated as
// untrusted.
//
// Design notes:
//   * The billed unit is `metadata.duration` from Deepgram's response — the
//     actual decoded audio length, measured server-side. We deliberately do NOT
//     accept a client-reported duration, because a modified client would simply
//     report zero.
//   * State lives in D1 (see backend/schema.sql for why D1 and not KV).
//   * The monthly reset is derived, not scheduled: each row stores the period
//     its counter belongs to, and a request in a new period resets it as part of
//     the same atomic UPDATE. No cron job to fail.
//   * If metering is unavailable we fail CLOSED (503). An outage must not
//     silently become unlimited free usage.

const USAGE_LIMIT_MINUTES = 300;
const USAGE_LIMIT_SECONDS = USAGE_LIMIT_MINUTES * 60;

/** Every endpoint that costs money, and is therefore subject to the cap. */
const PAID_PATHS = new Set([
  "/api/transcribe",
  "/api/analyze",
  "/api/journal/analyze",
  "/api/recommend",
  "/api/journal/recommendation",
  "/api/journal/weekly-reflection",
  "/api/journal/ai-completion",
]);

// Bounds the worst-case overshoot from a single request, since we only learn the
// true audio length after Deepgram has processed it.
const MAX_AUDIO_SECONDS = 1800; // 30 min
// Reject oversized uploads before we allocate/decode them.
const MAX_AUDIO_BASE64_CHARS = 32 * 1024 * 1024; // ~24 MB of audio

/** Current billing period as "YYYY-MM" in UTC. */
function currentPeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

/** First instant of the period after `period` ("YYYY-MM"), as an ISO string. */
function nextPeriodResetIso(period) {
  const [year, month] = period.split("-").map(Number);
  const rollsOver = month === 12;
  return new Date(
    Date.UTC(rollsOver ? year + 1 : year, rollsOver ? 0 : month, 1)
  ).toISOString();
}

/**
 * The identity we meter against.
 *
 * Prefers the client-supplied stable device id. Falls back to the connecting IP
 * so that a client which sends no (or a malformed) id still gets metered
 * against *something* narrower than a single global bucket — older app builds
 * sent the literal "unknown-device" for every iOS install, which would
 * otherwise pool all of them into one counter.
 */
function resolveSubject(request) {
  const raw = (request.headers.get("X-Device-Id") || "").trim();
  const looksUsable =
    raw.length >= 8 &&
    raw.length <= 200 &&
    /^[A-Za-z0-9._:-]+$/.test(raw) &&
    raw !== "unknown-device" &&
    raw !== "anonymous";
  if (looksUsable) return "device:" + raw;
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return "ip:" + ip;
}

/** SHA-256 hex, so D1 never stores a raw device identifier. */
async function hashSubject(subject) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(subject)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Reads the current balance. A row from a previous period counts as zero. */
async function readUsage(env, subjectHash, period) {
  const row = await env.DB.prepare(
    "SELECT period, period_seconds, lifetime_seconds FROM usage WHERE subject_hash = ?1"
  )
    .bind(subjectHash)
    .first();
  if (!row) return { periodSeconds: 0, lifetimeSeconds: 0 };
  return {
    periodSeconds: row.period === period ? Number(row.period_seconds) || 0 : 0,
    lifetimeSeconds: Number(row.lifetime_seconds) || 0,
  };
}

/**
 * Atomically adds `seconds` to the caller's balance, resetting the monthly
 * counter first if the stored row belongs to an earlier period.
 *
 * The increment and the rollover are a single statement so concurrent requests
 * cannot lose each other's writes (the read-modify-write race that makes KV
 * unsuitable here).
 */
async function addUsage(env, subjectHash, period, seconds, nowIso) {
  const row = await env.DB.prepare(
    `INSERT INTO usage (subject_hash, period, period_seconds, lifetime_seconds, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?3, ?4, ?4)
     ON CONFLICT(subject_hash) DO UPDATE SET
       period_seconds = CASE
         WHEN usage.period = excluded.period
           THEN usage.period_seconds + excluded.period_seconds
           ELSE excluded.period_seconds
       END,
       lifetime_seconds = usage.lifetime_seconds + excluded.period_seconds,
       period = excluded.period,
       updated_at = excluded.updated_at
     RETURNING period_seconds, lifetime_seconds`
  )
    .bind(subjectHash, period, seconds, nowIso)
    .first();
  return {
    periodSeconds: Number(row?.period_seconds) || 0,
    lifetimeSeconds: Number(row?.lifetime_seconds) || 0,
  };
}

/** The usage shape returned to the app. Minutes, rounded to 2dp. */
function usagePayload(periodSeconds, lifetimeSeconds, period) {
  const round = (n) => Math.round(n * 100) / 100;
  const usedMinutes = periodSeconds / 60;
  return {
    monthlyMinutesUsed: round(usedMinutes),
    totalMinutesUsed: round(lifetimeSeconds / 60),
    limitMinutes: USAGE_LIMIT_MINUTES,
    remainingMinutes: Math.max(0, round(USAGE_LIMIT_MINUTES - usedMinutes)),
    isAtLimit: periodSeconds >= USAGE_LIMIT_SECONDS,
    period,
    resetsAt: nextPeriodResetIso(period),
  };
}

/**
 * Gate for every endpoint that spends money.
 *
 * Returns `{ response }` to short-circuit (limit reached / metering down), or
 * `{ subjectHash, period }` for the caller to meter against on success.
 */
async function checkUsageAllowed(request, env) {
  if (!env.DB) {
    console.error("[usage] D1 binding 'DB' is missing — failing closed");
    return {
      response: json(
        {
          error: "usage_metering_unavailable",
          message:
            "Usage metering is temporarily unavailable. Please try again shortly.",
        },
        503,
        request
      ),
    };
  }

  const subjectHash = await hashSubject(resolveSubject(request));
  const period = currentPeriod();

  let usage;
  try {
    usage = await readUsage(env, subjectHash, period);
  } catch (err) {
    // Fail closed: we cannot prove the caller is under their cap.
    console.error("[usage] lookup failed:", err && err.message);
    return {
      response: json(
        {
          error: "usage_metering_unavailable",
          message:
            "Usage metering is temporarily unavailable. Please try again shortly.",
        },
        503,
        request
      ),
    };
  }

  if (usage.periodSeconds >= USAGE_LIMIT_SECONDS) {
    return {
      response: json(
        {
          error: "monthly_limit_reached",
          message:
            "You've used all " +
            USAGE_LIMIT_MINUTES +
            " minutes included this month. Your allowance resets on the 1st.",
          usage: usagePayload(
            usage.periodSeconds,
            usage.lifetimeSeconds,
            period
          ),
        },
        402,
        request
      ),
    };
  }

  return { subjectHash, period, usage };
}

const ANALYSIS_PROMPT = `You are the core AI engine for Vocolens, an expert emotional intelligence analyst specialising in Plutchik's Wheel of Emotions.
Analyse the journal transcript text and return ONLY a valid JSON object — no markdown, no explanation.

RULES:

1. TITLE: Create a 3 to 6 word evocative title.
   - Complete, self-contained phrase.
   - NO dangling prepositions or conjunctions at the end (never end on To, And, With, For, Because).
   - Good: Excitement for European Travels
   - Bad: Excited To Travel To

2. RECOMMENDATION: Write a deeply supportive paragraph for users with ADHD, ADD, OCD, and Tourette's syndrome.
   - LENGTH: Strictly 75 to 100 words.
   - DO NOT quote the user's text back to them.
   - TONE: Predictable, zero-stress, grounding, non-judgmental.
   - Acknowledge their state, validate with self-compassion, then dictate exactly ONE specific low-effort tiny task.
   - NEVER ask open-ended questions. Invent and dictate the exact task.

3. EMOTION ANALYSIS:
   - Base emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation.
   - emotionScores: all 8 emotions scored 0-100.
   - emotions: only emotions with score >= 30, max 4.
   - topThreeEmotions: exactly 3 ranked objects with emotion, score, intensityLabel.
   - intensityLabel Plutchik scale:
       happiness: Serenity / Joy / Ecstasy
       trust: Acceptance / Trust / Admiration
       fear: Apprehension / Fear / Terror
       surprise: Distraction / Surprise / Amazement
       sadness: Pensiveness / Sadness / Grief
       disgust: Boredom / Disgust / Loathing
       anger: Annoyance / Anger / Rage
       anticipation: Interest / Anticipation / Vigilance
   - blendedEmotions: valid dyads when BOTH component emotions >= 40.
   - ambivalenceFlags: opposite pairs both >= 35.
   - valence: -100 (very unpleasant) to +100 (very pleasant).
   - arousal: 0 (very calm) to 100 (very activated).
   - distressLevel: low | moderate | high.

Return this exact JSON shape:
{
  "title": "3-6 word self-contained phrase",
  "recommendation": "75-100 word paragraph with one dictated tiny task",
  "emotions": ["happiness", "trust"],
  "primaryEmotion": "happiness",
  "emotionIntensity": 75,
  "emotionScores": { "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2, "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45 },
  "topThreeEmotions": [
    { "emotion": "happiness", "score": 80, "intensityLabel": "Ecstasy" },
    { "emotion": "trust", "score": 60, "intensityLabel": "Admiration" },
    { "emotion": "anticipation", "score": 45, "intensityLabel": "Anticipation" }
  ],
  "blendedEmotions": ["Love"],
  "ambivalenceFlags": [],
  "topics": ["work"],
  "analysis": "Brief analysis string.",
  "reflection": "Warm second-person reflection for TTS.",
  "insights": ["Insight 1", "Insight 2"],
  "confidence": 0.85,
  "valence": 45,
  "arousal": 62,
  "suggestedBodySensations": ["chest", "shoulders"],
  "distressLevel": "low"
}`;

const RECOMMENDATION_PROMPT = `You are the core AI engine for Vocolens, an empathetic voice journaling application.
Generate a hyper-personalised advocacy paragraph based on the user's journal transcript.

RULES:
- LENGTH: Strictly 75 to 100 words. Count before responding.
- TONE: Grounded, warm, peer-like, deeply encouraging. Not clinical. Not preachy.
- VOCABULARY: Strong verbs, domain-specific nouns matching the user's context.
- BANNED WORDS: Delve, Testament, Beacon, Masterclass, Landscape, Tapestry, Journey.
- FORMAT: Single cohesive paragraph. No bullet points. No introductory filler.
- ADDRESS: Second person only. Never start with I.
- Acknowledge their exact state, validate with specificity, dictate one actionable tiny task.
- NEVER ask open-ended questions. Invent and dictate the exact task.

Return ONLY this JSON — no markdown, no explanation:
{
  "advice": "75-100 word personalised paragraph",
  "audioAdvice": "50-70 word TTS version, natural rhythm, no special characters"
}`;

const WEEKLY_PROMPT = `You are a warm, insightful journaling companion creating a weekly reflection digest.
Tone: compassionate, personal, encouraging. Write directly to the person.

Return ONLY this JSON — no markdown, no explanation:
{
  "narrativeSummary": "2-3 sentence warm narrative overview",
  "emotionalJourney": "1-2 sentences on how emotions evolved",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "growthMoment": "1 sentence on a meaningful moment",
  "weekAhead": "1 encouraging sentence for the coming week",
  "dominantEmotion": "one of: happiness sadness anger disgust fear surprise trust anticipation",
  "emotionalRange": "brief phrase e.g. Mostly grounded with moments of joy"
}`;

/** GET /api/usage/status — the app's single source of truth for the balance. */
async function handleUsageStatus(request, env) {
  if (!env.DB) {
    console.error("[usage] D1 binding 'DB' is missing — failing closed");
    return json(
      {
        error: "usage_metering_unavailable",
        message: "Usage metering is temporarily unavailable.",
      },
      503,
      request
    );
  }

  const subjectHash = await hashSubject(resolveSubject(request));
  const period = currentPeriod();

  try {
    const usage = await readUsage(env, subjectHash, period);
    return json(
      {
        success: true,
        ...usagePayload(usage.periodSeconds, usage.lifetimeSeconds, period),
      },
      200,
      request
    );
  } catch (err) {
    console.error("[usage] status lookup failed:", err && err.message);
    return json(
      {
        error: "usage_metering_unavailable",
        message: "Usage metering is temporarily unavailable.",
      },
      503,
      request
    );
  }
}

async function handleTranscribe(request, env, gate) {
  const body = await request.json();
  const audioBase64 = body.audioBase64;
  const language = body.language || "en";
  const mimeType = body.mimeType || "audio/mp4";

  if (!audioBase64) {
    return json({ error: "audioBase64 is required" }, 400, request);
  }

  if (audioBase64.length > MAX_AUDIO_BASE64_CHARS) {
    return json(
      {
        error: "audio_too_large",
        message: "That recording is too long to process. Please record a shorter entry.",
      },
      413,
      request
    );
  }

  const apiKey = env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return json({ error: "Deepgram API key not configured" }, 503, request);
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
    return json({ error: "Deepgram error: " + err }, 502, request);
  }

  const data = await resp.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const transcript = alt?.transcript || "";
  const confidence = alt?.confidence || 0;
  const duration = data?.metadata?.duration || 0;

  // ── Meter the audio we just paid for ──────────────────────────────────────
  // `duration` is Deepgram's own measurement of the decoded audio, so it cannot
  // be understated by a modified client. Clamped so one malformed response
  // can't corrupt the balance.
  const billableSeconds = Math.min(
    Math.max(Number(duration) || 0, 0),
    MAX_AUDIO_SECONDS
  );

  let usage = null;
  try {
    const updated = await addUsage(
      env,
      gate.subjectHash,
      gate.period,
      billableSeconds,
      new Date().toISOString()
    );
    usage = usagePayload(updated.periodSeconds, updated.lifetimeSeconds, gate.period);
  } catch (err) {
    // The spend already happened; don't fail the user's request over a write
    // blip. This under-counts, so it's logged loudly for reconciliation.
    console.error(
      "[usage] FAILED to record " + billableSeconds + "s:",
      err && err.message
    );
  }

  return json({ success: true, transcript, confidence, duration, usage }, 200, request);
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
        { role: "user", content: `Analyse this journal entry:\n\n"${transcript}"` },
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
          content: `Here is my journal entry:\n\n"${transcript}"\n\nPrimary emotion detected: ${primaryEmotion}\n\nPlease provide a warm, personalised recommendation.`,
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
    : "You showed up today and that already matters. Place both feet flat on the floor right now, feel the ground beneath you, and take three slow breaths — in for four counts, hold for two, out for six. Do that once. That single act tells your nervous system it is safe, and from that calmer place everything else becomes a little more manageable.";

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

  const entryDigest = entries.map((e, i) => {
    const date = new Date(e.createdAt).toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
    const transcript = e.transcript || "";
    const excerpt = transcript.slice(0, 300);
    const ellipsis = transcript.length > 300 ? "..." : "";
    const topics = Array.isArray(e.topics) ? e.topics.join(", ") : "";
    return `Entry ${i + 1} (${date}) — Emotion: ${e.primaryEmotion} (${e.emotionIntensity}% intensity)\nTopics: ${topics}\nExcerpt: "${excerpt}${ellipsis}"`;
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
          content: `Here are my journal entries from ${weekLabel}:\n\n${entryDigest}\n\nPlease create my weekly reflection digest.`,
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
      weekLabel,
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
      temperature,
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

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    // Health endpoints — no auth required
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

    // ── Usage status ────────────────────────────────────────────────────────
    // Authenticated GET, so it must be handled before the POST-only guard
    // below. This is what the app reads to learn its real balance; the local
    // counter is only a mirror of this.
    if (path === "/api/usage/status" && request.method === "GET") {
      const clientKey = request.headers.get("X-Api-Key") || "";
      const serverKey = env.VOCOLENS_API_KEY || "";
      if (!serverKey || clientKey !== serverKey) {
        return json({ error: "Unauthorized" }, 401, request);
      }
      return await handleUsageStatus(request, env);
    }

    // ── Authentication ──────────────────────────────────────────────────────
    // All POST endpoints require a valid API key in the X-Api-Key header.
    // The key is set as a Cloudflare Worker secret (VOCOLENS_API_KEY).
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

    // ── Monthly cap ─────────────────────────────────────────────────────────
    // Every endpoint below spends money (Deepgram audio or OpenRouter tokens),
    // so all of them are gated on the caller's remaining allowance. Only
    // /api/transcribe adds to the balance — the audio duration is the billed
    // unit — but once the cap is hit, nothing paid is served.
    if (PAID_PATHS.has(path)) {
      const gate = await checkUsageAllowed(request, env);
      if (gate.response) return gate.response;

      try {
        if (path === "/api/transcribe") {
          return await handleTranscribe(request, env, gate);
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
      } catch (err) {
        console.error("[Worker] Unhandled error:", err.message);
        return json({ error: err.message }, 500, request);
      }
    }

    return json({ error: "Not found" }, 404, request);
  },
};
