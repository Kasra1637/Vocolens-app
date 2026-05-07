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