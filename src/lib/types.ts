// Core Data Types for Voice Journal App

// Emotion types - 8 core emotions based on Plutchik's wheel of emotions
export type EmotionType =
  | 'happiness'
  | 'sadness'
  | 'anger'
  | 'disgust'
  | 'fear'
  | 'surprise'
  | 'trust'
  | 'anticipation';

export type TopicCategory = 'emotional' | 'goals' | 'reflection' | 'decision' | 'manifestation';

// Emotion scores - individual 0-100 scores for all 8 core emotions
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

// Plutchik intensity labels — mapped from 0-100 score to Low/Mid/High label
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

// Distress level based on valence-arousal composite
export type DistressLevel = 'low' | 'moderate' | 'high';

// Body sensations users can report when they struggle to name emotions
export type BodySensation =
  | 'chest tightness'
  | 'knot in stomach'
  | 'racing heart'
  | 'heavy limbs'
  | 'tension in shoulders'
  | 'lightness'
  | 'warmth'
  | 'coldness'
  | 'tingling'
  | 'numbness'
  | 'restlessness'
  | 'fatigue'
  | 'head pressure'
  | 'throat constriction'
  | 'breathlessness'
  | 'none';

// Journal Entry
export interface JournalEntry {
  id: string;
  title: string;
  transcript: string;
  audioUri?: string;
  duration: number; // in seconds
  createdAt: string; // ISO date string
  updatedAt: string;
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  emotionIntensity: number; // 0-100
  emotionScores?: EmotionScores; // individual scores for all 8 emotions
  emotionIntensityLabels?: EmotionIntensityLabels; // Plutchik intensity labels per emotion
  // Valence-Arousal (Circumplex Model) — 2D emotional space
  valence: number; // -100 (unpleasant) to +100 (pleasant)
  arousal: number; // 0 (calm) to 100 (activated)
  // Alexithymia support
  bodySensation?: BodySensation; // where the user feels this in their body
  alexithymiaFlag?: boolean; // user chose "I don't know" for emotions
  // Grounding support
  distressLevel: DistressLevel;
  groundingUsed?: boolean; // user engaged a grounding exercise
  // AI-generated
  topics: string[];
  aiAnalysis?: string;
  aiReflection?: string; // TTS-ready empathetic reflection
  conversationTopic?: TopicCategory;
  conversationPrompt?: string;
}

// Daily Mood Summary
export interface DailyMoodSummary {
  date: string; // YYYY-MM-DD format
  averageMood: number; // 0-100
  dominantEmotion: EmotionType;
  entryCount: number;
  totalDuration: number;
  emotions: {
    emotion: EmotionType;
    intensity: number;
    count: number;
  }[];
}

// User Stats
export interface UserStats {
  totalEntries: number;
  totalDuration: number; // in seconds
  currentStreak: number;
  longestStreak: number;
  lastEntryDate: string | null;
  weeklyEntries: number;
  monthlyEntries: number;
  averageMood: number;
  topEmotions: EmotionType[];
}

// Achievement/Badge Types
export type BadgeCategory = 'streak' | 'entries' | 'consistency' | 'mood' | 'time' | 'special';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Badge {
  id: string;
  title: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  icon: string;
  requirement: string;
  tip: string;
  progress: number; // 0-100
  unlocked: boolean;
  unlockDate?: string;
}

// Insights Data
export interface InsightData {
  weeklyMoodTrend: DailyMoodSummary[];
  emotionDistribution: Record<EmotionType, number>;
  topTopics: string[];
  averageSessionLength: number;
  bestTimeOfDay: string;
  moodPatterns: {
    weekday: string;
    averageMood: number;
  }[];
}

// Recording State
export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  uri?: string;
}

// App Settings
export interface AppSettings {
  notifications: boolean;
  reminderTime: string; // HH:mm format
  theme: 'light' | 'dark' | 'system';
  haptics: boolean;
  autoSave: boolean;
  privacyMode: boolean;
}

// Emotion mapping utilities
export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  happiness: '😊',
  sadness: '😢',
  anger: '😤',
  disgust: '🤢',
  fear: '😰',
  surprise: '😮',
  trust: '🤝',
  anticipation: '🤩',
};

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happiness: '#FFD93D',
  sadness: '#6B8DD6',
  anger: '#FF6B6B',
  disgust: '#7CB342',
  fear: '#9575CD',
  surprise: '#FF8A65',
  trust: '#4DB6AC',
  anticipation: '#FFB74D',
};

// ─── Plutchik Wheel Intensity Labels ─────────────────────────────────────────
// Each emotion has three intensity tiers: [low, mid, high]
// Thresholds: low = 0–33, mid = 34–66, high = 67–100

export const PLUTCHIK_LABELS: Record<EmotionType, [string, string, string]> = {
  happiness:    ['Serenity',     'Joy',          'Ecstasy'],
  trust:        ['Acceptance',   'Trust',        'Admiration'],
  fear:         ['Apprehension', 'Fear',         'Terror'],
  surprise:     ['Distraction',  'Surprise',     'Amazement'],
  sadness:      ['Pensiveness',  'Sadness',      'Grief'],
  disgust:      ['Boredom',      'Disgust',      'Loathing'],
  anger:        ['Annoyance',    'Anger',        'Rage'],
  anticipation: ['Interest',     'Anticipation', 'Vigilance'],
};

/**
 * Returns the Plutchik sub-label for an emotion given an intensity score 0-100.
 *   Low  (0–33)  : mild form  (e.g. Serenity, Annoyance, Apprehension)
 *   Mid  (34–66) : core form  (e.g. Joy, Anger, Fear)
 *   High (67–100): intense form (e.g. Ecstasy, Rage, Terror)
 */
export function getEmotionSubLabel(emotion: EmotionType, intensity: number): string {
  const labels = PLUTCHIK_LABELS[emotion];
  if (!labels) return emotion.charAt(0).toUpperCase() + emotion.slice(1);
  if (intensity <= 33) return labels[0];
  if (intensity <= 66) return labels[1];
  return labels[2];
}

/**
 * Builds a full EmotionIntensityLabels map from an EmotionScores map.
 * Uses each emotion's own score as its intensity.
 */
export function buildIntensityLabels(scores: EmotionScores): EmotionIntensityLabels {
  return {
    happiness:    getEmotionSubLabel('happiness',    scores.happiness),
    trust:        getEmotionSubLabel('trust',        scores.trust),
    fear:         getEmotionSubLabel('fear',         scores.fear),
    surprise:     getEmotionSubLabel('surprise',     scores.surprise),
    sadness:      getEmotionSubLabel('sadness',      scores.sadness),
    disgust:      getEmotionSubLabel('disgust',      scores.disgust),
    anger:        getEmotionSubLabel('anger',        scores.anger),
    anticipation: getEmotionSubLabel('anticipation', scores.anticipation),
  };
}

// Helper to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to format duration
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

// Helper to format short duration (for cards)
export const formatShortDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};
