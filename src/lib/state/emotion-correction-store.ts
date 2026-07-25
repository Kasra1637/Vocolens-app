/**
 * Emotion Correction Store — Personalization Layer (v2)
 *
 * Stores user corrections and aggregates patterns to build a personalized
 * emotional model. Uses weighted feedback mechanics:
 *
 * 1. RECENCY DECAY — corrections from last 14 days weight 3×, decays with 45-day half-life
 * 2. CONSISTENCY — same correction across different moods/contexts matters more than
 *    repeated corrections in a single bad week
 * 3. MAGNITUDE THRESHOLD — valence/arousal shifts ≤5 are noise, ignored for learning
 * 4. CORRECTION TYPE — label corrections, intensity corrections, and context corrections
 *    are tracked separately. Context corrections (sarcasm, quoting) are excluded from learning.
 *
 * Philosophy:
 * - AI output = expressed emotion (what the text conveys)
 * - User correction = experienced emotion (what the person actually felt)
 * - The system learns from stable divergence patterns, not one-off disagreements
 * - Personalization caps at ~80% agreement to preserve external perspective value
 *
 * Safety: Corrections inform personalization — they are not diagnostic.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmotionType } from '../types';

// ── Correction Types ──────────────────────────────────────────────────────────

/** What kind of correction the user made */
export type CorrectionType = 'label' | 'intensity' | 'context';

export interface CorrectionRecord {
  id: string;
  entryId: string;
  timestamp: string; // ISO
  aiEmotion: EmotionType;
  userEmotion: EmotionType;
  aiValence: number;
  userValence: number;
  aiArousal: number;
  userArousal: number;
  reason?: string;
  correctionMode: 'voice' | 'text' | 'slider';
  /** v2: type of correction — determines how it feeds into learning */
  correctionType?: CorrectionType;
}

export interface CorrectionPattern {
  /** The emotion the AI tends to mislabel */
  aiLabel: EmotionType;
  /** What the user consistently corrects it to */
  actualLabel: EmotionType;
  /** Weighted occurrence count (recency-adjusted) */
  occurrences: number;
  /** Raw (unweighted) occurrence count */
  rawOccurrences: number;
  /** Confidence 0–1 that this is a real pattern */
  confidence: number;
  /** Most recent correction timestamp */
  lastSeen: string;
  /** Text excerpts from user corrections (for phrase patterns) */
  userPhrases: string[];
  /** Number of distinct weeks this pattern appeared in */
  distinctWeeks: number;
}

export interface UserEmotionBias {
  /** User-specific interpretations of emotions */
  emotionMappings: Partial<Record<EmotionType, {
    valenceBias: number;    // weighted shift to apply to AI valence
    arousalBias: number;    // weighted shift to apply to AI arousal
    labelBias: number;      // confidence shift for this label (0–1)
  }>>;
  /** Patterns detected from corrections */
  patterns: CorrectionPattern[];
  /** Total corrections given (all types) */
  totalCorrections: number;
  /** Total confirmations (AI was right) */
  totalConfirmations: number;
  /** Most recent activity */
  lastUpdated: string;
}

interface EmotionCorrectionState {
  // All individual corrections (append-only log)
  corrections: CorrectionRecord[];

  // Aggregated user model
  userBias: UserEmotionBias;

  // Actions
  recordCorrection: (record: Omit<CorrectionRecord, 'id'>) => void;
  recordConfirmation: (entryId: string, aiEmotion: EmotionType, aiValence: number, aiArousal: number) => void;
  getUserBias: () => UserEmotionBias;
  getCorrectionPatterns: () => CorrectionPattern[];
  getConfirmationRate: () => number;
  getPersonalizationStrength: () => number; // 0–1
  clearCorrections: () => void;
}

// ── Configuration Constants ───────────────────────────────────────────────────

const MAX_STORED_CORRECTIONS = 200;

/** Minimum weighted occurrences to register as a pattern */
const PATTERN_MIN_WEIGHTED = 2.5;

/** Minimum raw occurrences before considering as pattern */
const PATTERN_MIN_RAW = 3;

/** Half-life for recency decay in days */
const RECENCY_HALF_LIFE_DAYS = 45;

/** Recent corrections (within this many days) get a boost multiplier */
const RECENCY_BOOST_WINDOW_DAYS = 14;
const RECENCY_BOOST_MULTIPLIER = 3;

/** Valence/arousal shifts below this threshold are treated as noise */
const MAGNITUDE_NOISE_THRESHOLD = 5;

/** Minimum distinct weeks to consider a pattern stable (vs. a bad-week cluster) */
const MIN_DISTINCT_WEEKS = 2;

/** Personalization ceiling — prevents AI from fully converging to user */
const PERSONALIZATION_CEILING = 0.80;

// ── Helper Functions ──────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate recency weight for a correction.
 * Recent corrections (≤14 days) get 3× weight.
 * Older corrections decay with a 45-day half-life.
 */
function getRecencyWeight(timestamp: string): number {
  const now = Date.now();
  const correctionTime = new Date(timestamp).getTime();
  const daysSince = (now - correctionTime) / (1000 * 60 * 60 * 24);

  if (daysSince <= RECENCY_BOOST_WINDOW_DAYS) {
    return RECENCY_BOOST_MULTIPLIER;
  }

  // Exponential decay: weight = 2^(-daysSince / halfLife)
  return Math.pow(2, -daysSince / RECENCY_HALF_LIFE_DAYS);
}

/**
 * Get the ISO week string for grouping (YYYY-Www)
 */
function getWeekKey(timestamp: string): string {
  const d = new Date(timestamp);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24) + yearStart.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Determine if a correction represents a meaningful difference (not noise).
 * Returns false for context corrections (excluded from learning).
 */
function isMeaningfulForLearning(c: CorrectionRecord): boolean {
  // Context corrections (sarcasm, quoting someone) never feed learning
  if (c.correctionType === 'context') return false;

  // Label corrections are always meaningful
  if (c.aiEmotion !== c.userEmotion) return true;

  // Intensity corrections: only meaningful if shift exceeds noise threshold
  const valenceShift = Math.abs(c.userValence - c.aiValence);
  const arousalShift = Math.abs(c.userArousal - c.aiArousal);
  return valenceShift > MAGNITUDE_NOISE_THRESHOLD || arousalShift > MAGNITUDE_NOISE_THRESHOLD;
}

/**
 * Compute patterns with weighted feedback mechanics.
 * Only considers corrections that are meaningful for learning.
 */
function computeWeightedPatterns(corrections: CorrectionRecord[]): CorrectionPattern[] {
  // Filter to only learnable corrections
  const learnable = corrections.filter(isMeaningfulForLearning);

  const map = new Map<string, CorrectionRecord[]>();

  learnable.forEach((c) => {
    const key = `${c.aiEmotion}→${c.userEmotion}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  });

  const patterns: CorrectionPattern[] = [];

  map.forEach((records, key) => {
    // Raw occurrence check
    if (records.length < PATTERN_MIN_RAW) return;

    const [aiLabel, actualLabel] = key.split('→') as [EmotionType, EmotionType];

    // Calculate weighted occurrences (recency-adjusted)
    const weightedOccurrences = records.reduce(
      (sum, r) => sum + getRecencyWeight(r.timestamp),
      0
    );

    // Must exceed weighted minimum
    if (weightedOccurrences < PATTERN_MIN_WEIGHTED) return;

    // Consistency check: count distinct weeks
    const weekSet = new Set(records.map((r) => getWeekKey(r.timestamp)));
    const distinctWeeks = weekSet.size;

    // A pattern appearing only in 1 week could be a temporary mood — flag as lower confidence
    const consistencyMultiplier = distinctWeeks >= MIN_DISTINCT_WEEKS ? 1.0 : 0.5;

    // Confidence: combination of weighted volume and consistency
    // Caps at PERSONALIZATION_CEILING to preserve external perspective
    const rawConfidence = Math.min(1, weightedOccurrences / 8) * consistencyMultiplier;
    const confidence = Math.min(PERSONALIZATION_CEILING, rawConfidence);

    const phrases = records
      .filter((r) => r.reason && r.reason.trim().length > 0)
      .map((r) => r.reason!)
      .slice(0, 5);

    patterns.push({
      aiLabel,
      actualLabel,
      occurrences: Math.round(weightedOccurrences * 10) / 10,
      rawOccurrences: records.length,
      confidence,
      lastSeen: records[0].timestamp, // corrections are newest-first
      userPhrases: phrases,
      distinctWeeks,
    });
  });

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Compute weighted valence/arousal bias for a set of corrections.
 * Applies recency weighting and magnitude threshold.
 */
function computeWeightedBias(corrections: CorrectionRecord[]): {
  valenceBias: number;
  arousalBias: number;
} {
  const meaningful = corrections.filter((c) => {
    if (c.correctionType === 'context') return false;
    const valShift = Math.abs(c.userValence - c.aiValence);
    const aroShift = Math.abs(c.userArousal - c.aiArousal);
    return valShift > MAGNITUDE_NOISE_THRESHOLD || aroShift > MAGNITUDE_NOISE_THRESHOLD;
  });

  if (meaningful.length === 0) return { valenceBias: 0, arousalBias: 0 };

  let totalWeight = 0;
  let weightedValenceSum = 0;
  let weightedArousalSum = 0;

  meaningful.forEach((c) => {
    const w = getRecencyWeight(c.timestamp);
    totalWeight += w;
    weightedValenceSum += (c.userValence - c.aiValence) * w;
    weightedArousalSum += (c.userArousal - c.aiArousal) * w;
  });

  return {
    valenceBias: Math.round((weightedValenceSum / totalWeight) * 10) / 10,
    arousalBias: Math.round((weightedArousalSum / totalWeight) * 10) / 10,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useEmotionCorrectionStore = create<EmotionCorrectionState>()(
  persist(
    (set, get) => ({
      corrections: [],
      userBias: {
        emotionMappings: {} as UserEmotionBias['emotionMappings'],
        patterns: [],
        totalCorrections: 0,
        totalConfirmations: 0,
        lastUpdated: new Date().toISOString(),
      },

      recordCorrection: (record) => {
        const id = generateId();
        const correction: CorrectionRecord = { ...record, id };

        set((state) => {
          const corrections = [correction, ...state.corrections].slice(0, MAX_STORED_CORRECTIONS);

          // Rebuild patterns with weighted mechanics
          const patterns = computeWeightedPatterns(corrections);

          // Rebuild emotion mappings from patterns
          const newMappings: UserEmotionBias['emotionMappings'] = {};
          patterns.forEach((p) => {
            // Get all corrections for this pattern to compute weighted bias
            const patternCorrections = corrections.filter(
              (c) => c.aiEmotion === p.aiLabel && c.userEmotion === p.actualLabel
            );
            const bias = computeWeightedBias(patternCorrections);

            // Only apply mapping if pattern meets stability criteria
            if (p.distinctWeeks >= MIN_DISTINCT_WEEKS && p.confidence >= 0.3) {
              newMappings[p.aiLabel] = {
                valenceBias: bias.valenceBias,
                arousalBias: bias.arousalBias,
                labelBias: p.confidence,
              };
            }
          });

          return {
            corrections,
            userBias: {
              ...state.userBias,
              emotionMappings: newMappings,
              patterns,
              totalCorrections: state.userBias.totalCorrections + 1,
              lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      recordConfirmation: (entryId, aiEmotion, aiValence, aiArousal) => {
        const id = generateId();
        const confirmation: CorrectionRecord = {
          id,
          entryId,
          timestamp: new Date().toISOString(),
          aiEmotion,
          userEmotion: aiEmotion, // confirmed = user chose same label
          aiValence,
          userValence: aiValence,
          aiArousal,
          userArousal: aiArousal,
          correctionMode: 'slider',
          correctionType: 'intensity', // confirmations are treated as "no intensity change"
        };

        set((state) => {
          const corrections = [confirmation, ...state.corrections].slice(0, MAX_STORED_CORRECTIONS);

          return {
            corrections,
            userBias: {
              ...state.userBias,
              totalCorrections: state.userBias.totalCorrections + 1,
              totalConfirmations: state.userBias.totalConfirmations + 1,
              lastUpdated: new Date().toISOString(),
            },
          };
        });
      },

      getUserBias: () => get().userBias,

      getCorrectionPatterns: () => get().userBias.patterns,

      getConfirmationRate: () => {
        const { totalCorrections, totalConfirmations } = get().userBias;
        if (totalCorrections === 0) return 1.0; // Default: trust AI fully
        return totalConfirmations / totalCorrections;
      },

      getPersonalizationStrength: () => {
        const { patterns, totalCorrections } = get().userBias;
        if (totalCorrections === 0) return 0;

        // Personalization strength considers:
        // 1. Volume of corrections (more data = stronger signal)
        // 2. Pattern stability (patterns across multiple weeks = stronger)
        // 3. Capped at PERSONALIZATION_CEILING
        const volumeSignal = Math.min(1, totalCorrections / 20);
        const stablePatterns = patterns.filter((p) => p.distinctWeeks >= MIN_DISTINCT_WEEKS);
        const stabilitySignal = stablePatterns.length > 0
          ? Math.min(1, stablePatterns.reduce((sum, p) => sum + p.confidence, 0) / stablePatterns.length)
          : 0;

        const raw = (volumeSignal * 0.4) + (stabilitySignal * 0.6);
        return Math.min(PERSONALIZATION_CEILING, raw);
      },

      clearCorrections: () => {
        set({
          corrections: [],
          userBias: {
            emotionMappings: {} as UserEmotionBias['emotionMappings'],
            patterns: [],
            totalCorrections: 0,
            totalConfirmations: 0,
            lastUpdated: new Date().toISOString(),
          },
        });
      },
    }),
    {
      name: 'emotion-corrections',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: any, version: number) => {
        // v0 → v1: ensure corrections array and userBias object exist with
        // all required fields so OTA updates don't crash on stale data.
        if (version < 1) {
          const corrections = Array.isArray(persisted?.corrections) ? persisted.corrections : [];
          const userBias = {
            emotionMappings: persisted?.userBias?.emotionMappings ?? {},
            patterns: Array.isArray(persisted?.userBias?.patterns) ? persisted.userBias.patterns : [],
            totalCorrections: persisted?.userBias?.totalCorrections ?? 0,
            totalConfirmations: persisted?.userBias?.totalConfirmations ?? 0,
            lastUpdated: persisted?.userBias?.lastUpdated ?? new Date().toISOString(),
          };
          return { corrections, userBias };
        }
        return persisted;
      },
    }
  )
);
