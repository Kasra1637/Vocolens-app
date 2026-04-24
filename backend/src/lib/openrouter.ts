/**
 * OpenRouter Service — Vocolens Emotion Analysis
 *
 * PRIMARY:  openai/gpt-4o-audio-preview  (audio + transcript → prosody + content analysis)
 * FALLBACK: openai/gpt-4o               (transcript only → text analysis)
 *
 * NOTE: openai/gpt-4o-audio-preview REQUIRES audio input — it cannot be used for
 * text-only requests (OpenAI enforces this at the API level). The fallback therefore
 * uses standard gpt-4o which accepts text only.
 *
 * API key: OPENROUTER_API_KEY env var (must start with "sk-or-")
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
 */

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ── Model IDs — explicit strings, never inferred ─────────────────────────────
// Primary: full audio+text multimodal model. Requires audio input in the request.
const AUDIO_MODEL = "openai/gpt-4o-audio-preview";
// Fallback: latest stable GPT-4o text model. Used only when no audio is provided.
const TEXT_FALLBACK_MODEL = "openai/gpt-4o";

// ── API key loader ───────────────────────────────────────────
function getApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type EmotionType =
  | "happiness"
  | "sadness"
  | "anger"
  | "disgust"
  | "fear"
  | "surprise"
  | "trust"
  | "anticipation";

export interface EmotionScores {
  happiness: number;
  sadness: number;
  anger: number;
  disgust: number;
  fear: number;
  surprise: number;
  trust: number;
  anticipation: number;
}

// ── Plutchik Intensity Labels ─────────────────────────────────────────────────
// Maps each of the 8 primary Plutchik emotions to 3 intensity tiers:
//   Low  (1–35):  subdued form
//   Mid  (36–69): primary label
//   High (70–100): amplified form
export interface EmotionIntensityLabels {
  happiness: string;
  sadness: string;
  anger: string;
  disgust: string;
  fear: string;
  surprise: string;
  trust: string;
  anticipation: string;
}

const PLUTCHIK_LABELS: Record<EmotionType, { low: string; mid: string; high: string }> = {
  happiness:    { low: "Serenity",     mid: "Joy",          high: "Ecstasy"    },
  trust:        { low: "Acceptance",   mid: "Trust",        high: "Admiration" },
  fear:         { low: "Apprehension", mid: "Fear",         high: "Terror"     },
  surprise:     { low: "Distraction",  mid: "Surprise",     high: "Amazement"  },
  sadness:      { low: "Pensiveness",  mid: "Sadness",      high: "Grief"      },
  disgust:      { low: "Boredom",      mid: "Disgust",      high: "Loathing"   },
  anger:        { low: "Annoyance",    mid: "Anger",        high: "Rage"       },
  anticipation: { low: "Interest",     mid: "Anticipation", high: "Vigilance"  },
};

export function getIntensityLabel(emotion: EmotionType, score: number): string {
  const labels = PLUTCHIK_LABELS[emotion];
  if (score <= 35) return labels.low;
  if (score <= 69) return labels.mid;
  return labels.high;
}

export function buildIntensityLabels(scores: EmotionScores): EmotionIntensityLabels {
  const validEmotions: EmotionType[] = [
    "happiness", "sadness", "anger", "disgust",
    "fear", "surprise", "trust", "anticipation",
  ];
  const labels = {} as EmotionIntensityLabels;
  for (const emotion of validEmotions) {
    labels[emotion] = getIntensityLabel(emotion, scores[emotion]);
  }
  return labels;
}

export interface AnalysisResult {
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  emotionScores: EmotionScores;
  /** Plutchik intensity labels for each of the 8 emotions based on their score */
  emotionIntensityLabels: EmotionIntensityLabels;
  topics: string[];
  analysis: string;
  reflection: string;
  insights: string[];
  confidence: number;
  /** true when GPT-4o audio-preview processed actual audio (prosody analysis) */
  audioAnalyzed: boolean;
  /** exact model ID used for this analysis — for verification */
  modelUsed: string;
}

export function isOpenRouterConfigured(): boolean {
  const key = getApiKey();
  const configured = Boolean(key && key.startsWith("sk-or-"));
  if (configured) {
    console.log(`[OpenRouter] Configured ✓ | Audio model: ${AUDIO_MODEL} | Text fallback: ${TEXT_FALLBACK_MODEL}`);
  } else {
    console.error("[OpenRouter] ERROR: OPENROUTER_API_KEY missing or invalid (must start with sk-or-)");
  }
  return configured;
}

// ── Prompts ───────────────────────────────────────────────────────────────────
const AUDIO_SYSTEM_PROMPT = `You are an expert emotional intelligence analyst specializing in Plutchik's wheel of emotions.
You have been given a voice journal entry as raw audio. Analyse BOTH the audio speech characteristics (prosody, tone, pitch, pacing, vocal energy, pauses, tremor, rhythm) AND the transcript text content together to produce the most accurate emotional assessment possible.

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "emotions": ["emotion1", "emotion2"],
  "primaryEmotion": "emotion",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80,
    "sadness": 10,
    "anger": 5,
    "disgust": 2,
    "fear": 15,
    "surprise": 20,
    "trust": 60,
    "anticipation": 45
  },
  "topics": ["topic1", "topic2"],
  "analysis": "compassionate paragraph referencing both what was said and how it was said (vocal tone, pace, energy)",
  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",
  "insights": ["insight noting vocal cues", "content insight"],
  "confidence": 0.92
}

Rules:
- emotionScores: all 8 emotions scored 0-100; weight vocal prosody equally with text content
- emotions array: only emotions with score >= 30, max 4
- primaryEmotion: highest scoring emotion
- emotionIntensity: 0-100 overall intensity from both voice energy and content
- reflection: warm, second-person ("you"), suitable for TTS
- Only valid emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation`;

const TEXT_SYSTEM_PROMPT = `You are an expert emotional intelligence analyst specializing in Plutchik's wheel of emotions.
Analyse the journal transcript and return ONLY a valid JSON object — no markdown, no explanation:
{
  "emotions": ["emotion1", "emotion2"],
  "primaryEmotion": "emotion",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80,
    "sadness": 10,
    "anger": 5,
    "disgust": 2,
    "fear": 15,
    "surprise": 20,
    "trust": 60,
    "anticipation": 45
  },
  "topics": ["topic1", "topic2"],
  "analysis": "compassionate analysis paragraph",
  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",
  "insights": ["insight1", "insight2"],
  "confidence": 0.85
}

Rules:
- emotionScores: all 8 emotions scored 0-100
- emotions array: only emotions with score >= 30, max 4
- primaryEmotion: highest scoring emotion
- emotionIntensity: 0-100 overall intensity
- reflection: warm, second-person ("you"), suitable for TTS
- Only valid emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation`;

// ── JSON parser ───────────────────────────────────────────────────────────────
function parseAnalysisJson(content: string, audioAnalyzed: boolean, modelUsed: string): AnalysisResult {
  // Strip any accidental markdown fences
  const jsonStr = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const result = JSON.parse(jsonStr);

  const validEmotions: EmotionType[] = [
    "happiness", "sadness", "anger", "disgust",
    "fear", "surprise", "trust", "anticipation",
  ];

  const emotionScores: EmotionScores = {
    happiness: 0, sadness: 0, anger: 0, disgust: 0,
    fear: 0, surprise: 0, trust: 0, anticipation: 0,
  };

  if (result.emotionScores && typeof result.emotionScores === "object") {
    for (const emotion of validEmotions) {
      const score = Number(result.emotionScores[emotion]);
      emotionScores[emotion] = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
    }
  }

  const emotions = ((result.emotions ?? []) as string[])
    .filter((e) => validEmotions.includes(e as EmotionType))
    .slice(0, 4) as EmotionType[];
  if (emotions.length === 0) emotions.push("happiness");

  const primaryEmotion: EmotionType = validEmotions.includes(result.primaryEmotion)
    ? (result.primaryEmotion as EmotionType)
    : (emotions[0] ?? "happiness");

  console.log(
    `[OpenRouter] Analysis complete | model=${modelUsed} | audioAnalyzed=${audioAnalyzed} | primary=${primaryEmotion} | intensity=${result.emotionIntensity}`
  );

  return {
    emotions,
    primaryEmotion,
    emotionIntensity: Math.max(0, Math.min(100, Number(result.emotionIntensity) || 50)),
    emotionScores,
    emotionIntensityLabels: buildIntensityLabels(emotionScores),
    topics: ((result.topics ?? ["reflection"]) as string[]).slice(0, 5),
    analysis: result.analysis || "Your journal entry has been recorded.",
    reflection: result.reflection || "Thank you for sharing. Your feelings are valid.",
    insights: ((result.insights ?? []) as string[]).slice(0, 3),
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.8)),
    audioAnalyzed,
    modelUsed,
  };
}

// ── Common headers ─────────────────────────────────────────────────────────────
function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://blink.new",
    "X-Title": "Vocolens",
  };
}

// ── Main analysis function ────────────────────────────────────────────────────
export async function analyzeTranscript(
  transcript: string,
  audioBase64?: string
): Promise<AnalysisResult> {
  const apiKey = getApiKey();

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    throw new Error(
      "[OpenRouter] OPENROUTER_API_KEY is missing or invalid. " +
      "Ensure it is set in /home/user/workspace/backend/.env and starts with sk-or-"
    );
  }

  // ── PATH 1: Audio provided → openai/gpt-4o-audio-preview ─────────────────
  if (audioBase64 && audioBase64.length > 100) {
    console.log(`[OpenRouter] Sending request → model=${AUDIO_MODEL} (audio+text multimodal)`);

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: buildHeaders(apiKey),
        body: JSON.stringify({
          model: AUDIO_MODEL,          // "openai/gpt-4o-audio-preview" — explicit, never inferred
          messages: [
            {
              role: "system",
              content: AUDIO_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "input_audio",
                  input_audio: {
                    data: audioBase64,  // raw WAV base64
                    format: "wav",
                  },
                },
                {
                  type: "text",
                  text: `Transcript of the audio above:\n\n"${transcript}"\n\nAnalyse both the vocal characteristics (prosody, tone, pitch, pace, energy) AND the text. Return JSON only.`,
                },
              ],
            },
          ],
          temperature: 0.6,
          max_tokens: 1400,
        }),
      });

      if (response.ok) {
        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
          model?: string;
          error?: { message: string };
        };

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const resolvedModel = data.model ?? AUDIO_MODEL;
          console.log(`[OpenRouter] ✓ GPT-4o Audio Preview response received | resolved_model=${resolvedModel}`);
          return parseAnalysisJson(content, true, resolvedModel);
        }

        console.warn(`[OpenRouter] Audio model returned empty content — falling back to text model`);
      } else {
        const errBody = await response.json().catch(() => ({ error: { message: response.statusText } })) as { error?: { message: string } };
        console.warn(
          `[OpenRouter] Audio model error ${response.status}: ${errBody?.error?.message} — falling back to text model`
        );
      }
    } catch (err) {
      console.warn(`[OpenRouter] Audio model request threw: ${err} — falling back to text model`);
    }
  } else {
    console.log(`[OpenRouter] No audio provided — using text-only path`);
  }

  // ── PATH 2: Text only → openai/gpt-4o ────────────────────────────────────
  // Note: openai/gpt-4o-audio-preview CANNOT be used here — OpenAI requires
  // audio input when this model is specified. Text-only requests must use gpt-4o.
  console.log(`[OpenRouter] Sending request → model=${TEXT_FALLBACK_MODEL} (text-only)`);

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: TEXT_FALLBACK_MODEL,    // "openai/gpt-4o" — explicit, never inferred
      messages: [
        { role: "system", content: TEXT_SYSTEM_PROMPT },
        { role: "user", content: `Analyse this journal entry:\n\n"${transcript}"` },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[OpenRouter] Text model error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("[OpenRouter] Text model returned empty content");
  }

  const resolvedModel = data.model ?? TEXT_FALLBACK_MODEL;
  console.log(`[OpenRouter] ✓ GPT-4o text response received | resolved_model=${resolvedModel}`);
  return parseAnalysisJson(content, false, resolvedModel);
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────
export async function analyzeTranscriptWithRetry(
  transcript: string,
  maxRetries = 3,
  audioBase64?: string
): Promise<AnalysisResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeTranscript(transcript, audioBase64);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OpenRouter] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
        console.log(`[OpenRouter] Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("[OpenRouter] All retry attempts exhausted");
}

// ── Weekly Reflection ─────────────────────────────────────────────────────────

export interface WeeklyReflectionEntry {
  transcript: string;
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  topics: string[];
  createdAt: string;
  title: string;
}

export interface WeeklyReflectionResult {
  narrativeSummary: string;
  emotionalJourney: string;
  keyThemes: string[];
  growthMoment: string;
  weekAhead: string;
  dominantEmotion: EmotionType;
  emotionalRange: string;
  entryCount: number;
  weekLabel: string;
}

export async function generateWeeklyReflection(
  entries: WeeklyReflectionEntry[],
  weekLabel: string
): Promise<WeeklyReflectionResult> {
  const apiKey = getApiKey();

  if (!apiKey || !apiKey.startsWith("sk-or-")) {
    throw new Error("[OpenRouter] OPENROUTER_API_KEY is missing or invalid.");
  }

  if (entries.length === 0) {
    throw new Error("No entries to reflect on");
  }

  const entryDigest = entries
    .map((e, i) => {
      const date = new Date(e.createdAt).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      return `Entry ${i + 1} (${date}) — Emotion: ${e.primaryEmotion} (${e.emotionIntensity}% intensity)\nTopics: ${e.topics.join(", ")}\nExcerpt: "${e.transcript.slice(0, 300)}${e.transcript.length > 300 ? "..." : ""}"`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are a warm, insightful journaling companion creating a weekly reflection digest.
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
}`;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: TEXT_FALLBACK_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here are my journal entries from ${weekLabel}:\n\n${entryDigest}\n\nPlease create my weekly reflection digest.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`[OpenRouter] Weekly reflection error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("[OpenRouter] Weekly reflection returned empty content");
  }

  const jsonStr = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const result = JSON.parse(jsonStr);

  const validEmotions: EmotionType[] = [
    "happiness", "sadness", "anger", "disgust", "fear", "surprise", "trust", "anticipation",
  ];

  console.log(`[OpenRouter] Weekly reflection generated | entries=${entries.length} | dominant=${result.dominantEmotion}`);

  return {
    narrativeSummary: result.narrativeSummary || "A week of meaningful reflection.",
    emotionalJourney: result.emotionalJourney || "Your emotions told a story this week.",
    keyThemes: (Array.isArray(result.keyThemes) ? result.keyThemes : []).slice(0, 4) as string[],
    growthMoment: result.growthMoment || "You showed up for yourself this week.",
    weekAhead: result.weekAhead || "Carry this week's wisdom forward.",
    dominantEmotion: validEmotions.includes(result.dominantEmotion) ? result.dominantEmotion as EmotionType : "trust",
    emotionalRange: result.emotionalRange || "A balanced week",
    entryCount: entries.length,
    weekLabel,
  };
}
