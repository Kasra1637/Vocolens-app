// Core Data Types for Voice Journal App

// Emotion types - 8 core emotions based on Plutchik's wheel of emotions
export type EmotionType =
  | "happiness"
  | "sadness"
  | "anger"
  | "disgust"
  | "fear"
  | "surprise"
  | "trust"
  | "anticipation";

export type TopicCategory =
  | "emotional"
  | "goals"
  | "reflection"
  | "decision"
  | "manifestation";

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

/** A single ranked emotion in the top-3 AI detection */
export interface RankedEmotion {
  rank: 1 | 2 | 3;
  emotion: EmotionType;
  score: number;
  intensityLabel: string;
  blendedEmotion?: BlendedEmotionType;
}

/** Blended emotion labels for display */
export const BLENDED_EMOTION_LABELS: Record<BlendedEmotionType, string> = {
  love: "Love",
  submission: "Submission",
  awe: "Awe",
  disapproval: "Disapproval",
  remorse: "Remorse",
  contempt: "Contempt",
  aggressiveness: "Aggressiveness",
  optimism: "Optimism",
};

/** Opposite emotion pairs on Plutchik's wheel */
export const OPPOSITE_EMOTION_PAIRS: [EmotionType, EmotionType][] = [
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

export function getEmotionSubLabel(emotion: EmotionType, score: number): string {
  if (emotion === "happiness") {
    if (score >= 70) return "High";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "sadness") {
    if (score >= 70) return "Deep";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "anger") {
    if (score >= 70) return "Intense";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "disgust") {
    if (score >= 70) return "Strong";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "fear") {
    if (score >= 70) return "Intense";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "surprise") {
    if (score >= 70) return "Startled";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "trust") {
    if (score >= 70) return "Deep";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  if (emotion === "anticipation") {
    if (score >= 70) return "Eager";
    if (score >= 40) return "Moderate";
    return "Mild";
  }
  return "Moderate";
}

export function getIntensityLabel(emotion: EmotionType, score: number): string {
  if (emotion === "happiness") {
    if (score <= 35) return "Serenity";
    if (score <= 69) return "Joy";
    return "Ecstasy";
  }
  if (emotion === "trust") {
    if (score <= 35) return "Acceptance";
    if (score <= 69) return "Trust";
    return "Admiration";
  }
  if (emotion === "fear") {
    if (score <= 35) return "Apprehension";
    if (score <= 69) return "Fear";
    return "Terror";
  }
  if (emotion === "surprise") {
    if (score <= 35) return "Distraction";
    if (score <= 69) return "Surprise";
    return "Amazement";
  }
  if (emotion === "sadness") {
    if (score <= 35) return "Pensiveness";
    if (score <= 69) return "Sadness";
    return "Grief";
  }
  if (emotion === "disgust") {
    if (score <= 35) return "Boredom";
    if (score <= 69) return "Disgust";
    return "Loathing";
  }
  if (emotion === "anger") {
    if (score <= 35) return "Annoyance";
    if (score <= 69) return "Anger";
    return "Rage";
  }
  if (emotion === "anticipation") {
    if (score <= 35) return "Interest";
    if (score <= 69) return "Anticipation";
    return "Vigilance";
  }
  return "Joy";
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

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happiness: "#FFD700",
  sadness: "#4A90D9",
  anger: "#FF4500",
  disgust: "#32CD32",
  fear: "#8B008B",
  surprise: "#FF69B4",
  trust: "#20B2AA",
  anticipation: "#FFA500",
};

export type BodyRegion =
  | "Head"
  | "Chest"
  | "Stomach"
  | "Arms"
  | "Hands"
  | "Legs"
  | "Feet"
  | "Throat"
  | "Jaw/Neck";

export const ALL_BODY_REGIONS: BodyRegion[] = [
  "Head", "Throat", "Jaw/Neck", "Chest", "Stomach", "Arms", "Hands", "Legs", "Feet",
];

export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  Head: "Head", Chest: "Chest", Stomach: "Stomach", Arms: "Arms",
  Hands: "Hands", Legs: "Legs", Feet: "Feet", Throat: "Throat", "Jaw/Neck": "Jaw & Neck",
};

export const BODY_REGION_EMOJIS: Record<BodyRegion, string> = {
  Head: "\uD83E\uDDE0", Chest: "\u2764\uFE0F", Stomach: "\uD83C\uDF31",
  Arms: "\uD83D\uDCAA", Hands: "\u270B", Legs: "\uD83E\uDDB5", Feet: "\uD83E\uDDB6",
  Throat: "\uD83C\uDFA4", "Jaw/Neck": "\uD83D\uDE0C",
};

export type BodySensation =
  | "tightness" | "heaviness" | "emptiness" | "warmth" | "numbness"
  | "restlessness" | "energy" | "trembling" | "hollow feeling" | "openness" | "unknown";

export interface BodyRegionSensation {
  region: BodyRegion;
  intensity: number;
}

export type DistressLevel = "low" | "moderate" | "high";

export interface JournalEntry {
  id: string;
  title: string;
  transcript: string;
  audioUri?: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  emotionScores?: EmotionScores;
  emotionIntensityLabels?: EmotionIntensityLabels;
  valence: number;
  arousal: number;
  bodySensation?: BodySensation;
  bodyRegions?: BodyRegionSensation[];
  alexithymiaFlag?: boolean;
  distressLevel: DistressLevel;
  groundingUsed?: boolean;
  topics: string[];
  aiAnalysis?: string;
  aiReflection?: string;
  conversationTopic?: TopicCategory;
  conversationPrompt?: string;
  userOverrideLabels?: Partial<Record<EmotionType, string>>;
  userValidated?: boolean;
  aiCorrected?: boolean;
  // AI baseline fields — never overwritten by user* overrides
  aiTopThreeEmotions: RankedEmotion[];
  aiBlendedEmotions: Partial<Record<BlendedEmotionType, number>>;
  aiAmbivalenceFlags: [EmotionType, EmotionType][];
  insights?: string[];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatShortDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export const ALL_EMOTIONS: EmotionType[] = [
  "happiness", "trust", "anticipation", "surprise",
  "fear", "sadness", "disgust", "anger",
];
