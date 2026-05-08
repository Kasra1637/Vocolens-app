// Core emotion types
export type EmotionType =
  | "happiness"
  | "sadness"
  | "anger"
  | "disgust"
  | "fear"
  | "surprise"
  | "trust"
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
export type ThemeColorType = "hotPink" | "softPink" | "lavenderBliss" | "violetWhisper" | "darkMode";
export type TopicCategory = "work" | "health" | "relationships" | "personal" | "goals" | "other";
export type BadgeCategory = "streak" | "entries" | "reflection" | "exploration";
export type BadgeRarity = "bronze" | "silver" | "gold" | "platinum";

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
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  unlockedAt?: string;
  icon: string;
}

export interface RankedEmotion {
  emotion: EmotionType;
  score: number;
}

export interface BlendedEmotionType {
  primary: EmotionType;
  secondary?: EmotionType;
  intensity: number;
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

// Re-exports for convenience
export const EMOTION_COLORS: Record<EmotionType, string> = {
  happiness: "#FFD93D",
  sadness: "#6C9BCF",
  anger: "#FF6B6B",
  disgust: "#9B59B6",
  fear: "#A29BFE",
  surprise: "#FDCB6E",
  trust: "#74B9FF",
  anticipation: "#00B894",
};

export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happiness: "😊",
  sadness: "😢",
  anger: "😠",
  disgust: "🤢",
  fear: "😨",
  surprise: "😲",
  trust: "🤝",
  anticipation: "🤔",
};

export function formatShortDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function getEmotionSubLabel(emotion: EmotionType): string {
  const subLabels: Record<EmotionType, string> = {
    happiness: "joy",
    sadness: "down",
    anger: "mad",
    disgust: "gross",
    fear: "scared",
    surprise: "wow",
    trust: "safe",
    anticipation: "eager",
  };
  return subLabels[emotion] || emotion;
}