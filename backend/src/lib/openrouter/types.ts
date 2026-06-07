/**
 * OpenRouter Types & Constants — Claude Sonnet 4
 * Single model for all text analysis (Deepgram transcribes; Claude analyses text only).
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/** Claude Sonnet 4 — single model for all text analysis */
export const MODEL = "anthropic/claude-sonnet-4";
/** @deprecated kept for callers that reference old names */
export const AUDIO_MODEL = MODEL;
export const TEXT_FALLBACK_MODEL = MODEL;

/**
 * Retrieve the OpenRouter API key.
 *
 * Cloudflare Workers does NOT populate process.env — environment variable
 * bindings are only available on the `env` object passed to the Worker's
 * fetch handler.  Hono propagates that object to every handler as `c.env`.
 *
 * To make the key accessible from module-level helpers (getApiKey / 
 * isOpenRouterConfigured) that are called before a Hono context is available,
 * we store the key in globalThis the very first time a request is handled
 * (see backend/src/index.ts → initEnv middleware).
 *
 * Fallback chain:
 *   1. globalThis.__OPENROUTER_API_KEY  (set by initEnv on first request)
 *   2. process.env.OPENROUTER_API_KEY   (local dev / Node.js / Bun)
 */
export function getApiKey(): string | undefined {
  return (
    (globalThis as Record<string, unknown>).__OPENROUTER_API_KEY as string | undefined
  ) ?? process.env.OPENROUTER_API_KEY;
}

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

// ── Plutchik 3-tier intensity ─────────────────────────────────────────────────
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

// ── Ranked emotion (top-3) ─────────────────────────────────────────────────────
export interface RankedEmotion {
  emotion: EmotionType;
  score: number;
  rank: 1 | 2 | 3;
  intensityLabel: string; // e.g. "Ecstasy", "Joy", "Serenity"
}

// ── Blended emotions (Plutchik dyads) ────────────────────────────────────────
export type BlendedEmotionType =
  | "Love"           // happiness + trust
  | "Optimism"       // anticipation + happiness
  | "Submission"     // trust + fear
  | "Awe"            // fear + surprise
  | "Disapproval"    // surprise + sadness
  | "Remorse"        // sadness + disgust
  | "Contempt"       // disgust + anger
  | "Aggressiveness";// anger + anticipation

export const BLENDED_EMOTION_LABELS: Record<BlendedEmotionType, [EmotionType, EmotionType]> = {
  Love:            ["happiness", "trust"],
  Optimism:        ["anticipation", "happiness"],
  Submission:      ["trust", "fear"],
  Awe:             ["fear", "surprise"],
  Disapproval:     ["surprise", "sadness"],
  Remorse:         ["sadness", "disgust"],
  Contempt:        ["disgust", "anger"],
  Aggressiveness:  ["anger", "anticipation"],
};

// ── Opposite emotion pairs (ambivalence) ──────────────────────────────────────
export const OPPOSITE_EMOTION_PAIRS: [EmotionType, EmotionType][] = [
  ["happiness", "sadness"],
  ["anger",     "fear"],
  ["trust",     "disgust"],
  ["anticipation", "surprise"],
];

// ── Main analysis result ──────────────────────────────────────────────────────
export interface AnalysisResult {
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  emotionScores: EmotionScores;
  emotionIntensityLabels: EmotionIntensityLabels;
  topics: string[];
  analysis: string;
  reflection: string;
  insights: string[];
  confidence: number;
  audioAnalyzed: boolean;
  modelUsed: string;
  // Valence-Arousal (Circumplex Model)
  valence: number;
  arousal: number;
  suggestedBodySensations: string[];
  distressLevel: "low" | "moderate" | "high";
  // Plutchik deep breakdown
  aiTopThreeEmotions: RankedEmotion[];
  aiBlendedEmotions: BlendedEmotionType[];
  aiAmbivalenceFlags: string[];
}

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

export interface AICompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export function isOpenRouterConfigured(): boolean {
  const key = getApiKey();
  const configured = Boolean(key && key.startsWith("sk-or-"));
  if (configured) {
    console.log(`[OpenRouter] Configured | Model: ${MODEL}`);
  } else {
    console.error("[OpenRouter] ERROR: OPENROUTER_API_KEY missing or invalid (must start with sk-or-)");
  }
  return configured;
}
