// Core Data Types for Voice Journal App
// Emotion types - 8 core emotions based on Plutchik's wheel of emotions

export type EmotionType =
  | "joy"
  | "trust"
  | "fear"
  | "surprise"
  | "sadness"
  | "disgust"
  | "anger"
  | "anticipation";

export type DistressLevel = "low" | "medium" | "high";

export type BodyRegionSensation =
  | "head"
  | "chest"
  | "stomach"
  | "arms"
  | "legs"
  | "hands"
  | "feet"
  | "neck"
  | "back"
  | "jaw"
  | "shoulders";

export type TimeFormat = "12h" | "24h";
export type ThemeColorType =
  | "hotPink"
  | "softPink"
  | "lavenderBliss"
  | "violetWhisper"
  | "darkMode";
export type TopicCategory =
  | "work"
  | "health"
  | "relationships"
  | "personal"
  | "goals"
  | "other"
  | "manifestation";

// ─── Plutchik Blended Emotions ─────────────────────────────────────────────
export type BlendedEmotionType =
  | "love"
  | "submission"
  | "awe"
  | "disapproval"
  | "remorse"
  | "contempt"
  | "aggressiveness"
  | "optimism";

export const BLENDED_EMOTION_LABELS: Record<BlendedEmotionType, string> = {
  love: "Love (Joy + Trust)",
  submission: "Submission (Trust + Fear)",
  awe: "Awe (Fear + Surprise)",
  disapproval: "Disapproval (Surprise + Sadness)",
  remorse: "Remorse (Sadness + Disgust)",
  contempt: "Contempt (Disgust + Anger)",
  aggressiveness: "Aggressiveness (Anger + Anticipation)",
  optimism: "Optimism (Anticipation + Joy)",
};

export const OPPOSITE_EMOTION_PAIRS: [EmotionType, EmotionType][] = [
  ["joy", "sadness"],
  ["trust", "disgust"],
  ["fear", "anger"],
  ["surprise", "anticipation"],
];

// ─── Ranked Emotion (Top-3 display) ────────────────────────────────────────
export interface RankedEmotion {
  emotion: EmotionType;
  score: number;
  rank: number;
  intensityLabel: string;
}

export type BadgeCategory = "streak" | "entries" | "reflection" | "exploration";
export type BadgeRarity = "bronze" | "silver" | "gold" | "platinum";

// ─── Emotion Scores ────────────────────────────────────────────────────────
export interface EmotionScores {
  joy: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
  [key: string]: number;
}

// ─── Journal Entry ─────────────────────────────────────────────────────────
export interface JournalEntry {
  id: string;
  transcript: string;
  summary: string;
  emotions: EmotionType[];
  valence: number;
  arousal: number;
  createdAt: string;
  duration: number;
  topics?: TopicCategory[];
  userValence?: number;
  userArousal?: number;
  voiceReason?: string;
  status: "voice" | "text" | "slider";
  userAccepted?: boolean;

  // Core display fields
  primaryEmotion: EmotionType;
  emotionIntensity: number;
  emotionScores: EmotionScores;
  title: string;
  audioUri?: string;
  conversationTopic?: TopicCategory;
  conversationPrompt?: string;
  aiAnalysis?: string;
  emotionIntensityLabels?: Record<string, string>;

  // User reflection / hybrid model fields
  userOverrideLabels?: string[];
  userValidated?: boolean;
  aiCorrected?: boolean;

  // Body sensation & grounding
  bodyRegions?: Record<string, number>;
  bodySensationMap?: Record<string, { sensation: number; emotion: string }[]>;
  groundingApplied?: boolean;

  // AI baseline fields (never overwritten by user corrections)
  aiPrimaryEmotion?: EmotionType;
  aiValence?: number;
  aiArousal?: number;
  aiIntensity?: number;
  aiTopThreeEmotions?: RankedEmotion[];
  aiBlendedEmotions?: BlendedEmotionType[];
  aiAmbivalenceFlags?: string[];
}

// ─── Badge ─────────────────────────────────────────────────────────────────
export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  unlockedAt?: string;
  icon: string;
}

export interface EmotionCorrection {
  id: string;
  entryId: string;
  originalEmotion: EmotionType;
  correctedEmotion: EmotionType;
  userValence?: number;
  userArousal?: number;
  correctedAt: string;
  source: "voice" | "text" | "slider";
}

// ─── Color & Emoji Maps ────────────────────────────────────────────────────
export const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: "#FFD93D",
  trust: "#74B9FF",
  fear: "#A29BFE",
  surprise: "#FDCB6E",
  sadness: "#6C9BCF",
  disgust: "#9B59B6",
  anger: "#FF6B6B",
  anticipation: "#00B894",
};

export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  joy: "😊",
  trust: "🤝",
  fear: "😨",
  surprise: "😲",
  sadness: "😢",
  disgust: "🤢",
  anger: "😠",
  anticipation: "🤔",
};

// ─── ALL_EMOTIONS helper ───────────────────────────────────────────────────
export const ALL_EMOTIONS: EmotionType[] = [
  "joy",
  "trust",
  "fear",
  "surprise",
  "sadness",
  "disgust",
  "anger",
  "anticipation",
];

// ─── Body Region Maps ──────────────────────────────────────────────────────
export const ALL_BODY_REGIONS = [
  "head",
  "chest",
  "stomach",
  "arms",
  "legs",
  "hands",
  "feet",
  "neck",
  "back",
  "jaw",
  "shoulders",
] as const;

export const BODY_REGION_LABELS: Record<string, string> = {
  head: "Head",
  chest: "Chest",
  stomach: "Stomach",
  arms: "Arms",
  legs: "Legs",
  hands: "Hands",
  feet: "Feet",
  neck: "Neck",
  back: "Back",
  jaw: "Jaw",
  shoulders: "Shoulders",
};

export const BODY_REGION_EMOJIS: Record<string, string> = {
  head: "🧠",
  chest: "❤️",
  stomach: "🦋",
  arms: "💪",
  legs: "🦵",
  hands: "🤲",
  feet: "🦶",
  neck: "🦒",
  back: "🔙",
  jaw: "😬",
  shoulders: "🤷",
};

export type BodySensation = {
  region: string;
  intensity: number;
  emotion: string;
};

// ─── Utility Functions ─────────────────────────────────────────────────────
export function formatShortDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function getEmotionSubLabel(
  emotion: EmotionType,
  intensity?: number
): string {
  const highLabels: Record<EmotionType, string> = {
    joy: "Ecstasy",
    trust: "Admiration",
    fear: "Terror",
    surprise: "Amazement",
    sadness: "Grief",
    disgust: "Loathing",
    anger: "Rage",
    anticipation: "Vigilance",
  };
  const midLabels: Record<EmotionType, string> = {
    joy: "Joy",
    trust: "Trust",
    fear: "Fear",
    surprise: "Surprise",
    sadness: "Sadness",
    disgust: "Disgust",
    anger: "Anger",
    anticipation: "Anticipation",
  };
  const lowLabels: Record<EmotionType, string> = {
    joy: "Serenity",
    trust: "Acceptance",
    fear: "Apprehension",
    surprise: "Distraction",
    sadness: "Pensiveness",
    disgust: "Boredom",
    anger: "Annoyance",
    anticipation: "Interest",
  };

  if (intensity === undefined) return midLabels[emotion] || emotion;
  if (intensity >= 75) return highLabels[emotion] || midLabels[emotion];
  if (intensity >= 40) return midLabels[emotion] || emotion;
  return lowLabels[emotion] || midLabels[emotion];
}

export function getIntensityLabel(
  emotion: EmotionType,
  intensity: number
): string {
  return getEmotionSubLabel(emotion, intensity);
}
