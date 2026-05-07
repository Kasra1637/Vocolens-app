/**
 * OpenRouter Types & Constants
 * 
 * Plutchik's Wheel of Emotions — all 3 tiers + blended emotions + opposite ambivalence.
 */

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const AUDIO_MODEL = "openai/gpt-4o-audio-preview";
export const TEXT_FALLBACK_MODEL = "openai/gpt-4o";

export function getApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
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

/** Blended emotions formed by adjacent primary pairs on Plutchik's wheel */
export type BlendedEmotionType =
  | "love"
  | "submission"
  | "awe"
  | "disapproval"
  | "remorse"
  | "contempt"
  | "aggressiveness"
  | "optimism";

/** Opposite emotion pairs — when both appear, flag ambivalence and reduce intensity */
export const OPPOSITE_PAIRS: [EmotionType, EmotionType][] = [
  ["happiness", "sadness"],
  ["trust", "disgust"],
  ["fear", "anger"],
  ["surprise", "anticipation"],
];

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

/** A single ranked emotion in the top-3 list */
export interface RankedEmotion {
  rank: 1 | 2 | 3;
  emotion: EmotionType;
  score: number;
  intensityLabel: string;
  blendedEmotion?: BlendedEmotionType;
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

/** Adjacent pairs on Plutchik's wheel clockwise → blended emotion */
export const BLENDED_PAIRS: [EmotionType, EmotionType, BlendedEmotionType][] = [
  ["happiness", "trust", "love"],
  ["trust", "fear", "submission"],
  ["fear", "surprise", "awe"],
  ["surprise", "sadness", "disapproval"],
  ["sadness", "disgust", "remorse"],
  ["disgust", "anger", "contempt"],
  ["anger", "anticipation", "aggressiveness"],
  ["anticipation", "happiness", "optimism"],
];

export function computeBlendedEmotions(scores: EmotionScores): Partial<Record<BlendedEmotionType, number>> {
  const result: Partial<Record<BlendedEmotionType, number>> = {};
  for (const [a, b, blended] of BLENDED_PAIRS) {
    const minScore = Math.min(scores[a], scores[b]);
    if (minScore >= 20) {
      result[blended] = minScore;
    }
  }
  return result;
}

export function detectAmbivalence(scores: EmotionScores, threshold = 25): [EmotionType, EmotionType][] {
  const ambivalent: [EmotionType, EmotionType][] = [];
  for (const [a, b] of OPPOSITE_PAIRS) {
    if (scores[a] >= threshold && scores[b] >= threshold) {
      ambivalent.push([a, b]);
    }
  }
  return ambivalent;
}

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
  emotionIntensityLabels: EmotionIntensityLabels;
  topThreeEmotions: RankedEmotion[];
  blendedEmotions: Partial<Record<BlendedEmotionType, number>>;
  ambivalenceFlags: [EmotionType, EmotionType][];
  topics: string[];
  analysis: string;
  reflection: string;
  insights: string[];
  confidence: number;
  audioAnalyzed: boolean;
  modelUsed: string;
  valence: number;
  arousal: number;
  suggestedBodySensations: string[];
  distressLevel: "low" | "moderate" | "high";
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
    console.log(`[OpenRouter] Configured ✓ | Audio model: ${AUDIO_MODEL} | Text fallback: ${TEXT_FALLBACK_MODEL}`);
  } else {
    console.error("[OpenRouter] ERROR: OPENROUTER_API_KEY missing or invalid (must start with sk-or-)");
  }
  return configured;
}