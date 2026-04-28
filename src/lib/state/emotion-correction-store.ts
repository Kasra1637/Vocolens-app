/**
 * Emotion Correction Store — Personalization Layer
 *
 * Stores user corrections and aggregates patterns to build a personalized
 * emotional model. This lets the app learn each user's unique emotion vocabulary
 * and interpretation patterns over time.
 *
 * Safety: Corrections inform personalization — they are not diagnostic.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmotionType } from '../types';

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
}

export interface CorrectionPattern {
  /** The emotion the AI tends to mislabel */
  aiLabel: EmotionType;
  /** What the user consistently corrects it to */
  actualLabel: EmotionType;
  /** How often this correction has happened */
  occurrences: number;
  /** Confidence 0–1 that this is a real pattern */
  confidence: number;
  /** Most recent correction timestamp */
  lastSeen: string;
  /** Text excerpts from user corrections (for phrase patterns) */
  userPhrases: string[];
}

export interface UserEmotionBias {
  /** User-specific interpretations of emotions */
  emotionMappings: Partial<Record<EmotionType, {
    valenceBias: number;    // shift to apply to AI valence
    arousalBias: number;     // shift to apply to AI arousal
    labelBias: number;      // confidence shift for this label
  }>;
  /** Patterns detected from corrections */
  patterns: CorrectionPattern[];
  /** Total corrections given */
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

const MAX_STORED_CORRECTIONS = 200;
const PATTERN_MIN_OCCURRENCES = 3;
const HIGH_CONFIRMATION_THRESHOLD = 0.7; // 70%+ confirms a label as accurate

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function computePatterns(corrections: CorrectionRecord[]): CorrectionPattern[] {
  const map = new Map<string, CorrectionRecord[]>();

  corrections.forEach((c) => {
    const key = `${c.aiEmotion}→${c.userEmotion}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  });

  const patterns: CorrectionPattern[] = [];

  map.forEach((records, key) => {
    if (records.length < PATTERN_MIN_OCCURRENCES) return;
    const [aiLabel, actualLabel] = key.split('→') as [EmotionType, EmotionType];

    const avgValenceShift = records.reduce((s, r) => s + (r.userValence - r.aiValence), 0) / records.length;
    const avgArousalShift = records.reduce((s, r) => s + (r.userArousal - r.aiArousal), 0) / records.length;

    const phrases = records
      .filter((r) => r.reason && r.reason.trim().length > 0)
      .map((r) => r.reason!)
      .slice(0, 5);

    patterns.push({
      aiLabel,
      actualLabel,
      occurrences: records.length,
      confidence: Math.min(1, records.length / 10),
      lastSeen: records[records.length - 1].timestamp,
      userPhrases: phrases,
    });

    // Apply shift bias
    if (patterns.length > 0) {
      const p = patterns[patterns.length - 1];
      const bias = {
        valenceBias: avgValenceShift,
        arousalBias: avgArousalShift,
        labelBias: p.confidence,
      };
      // (stored in userBias.emotionMappings[aiLabel] by caller)
    }
  });

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

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

          // Rebuild patterns
          const patterns = computePatterns(corrections);
          const aiLabel = record.aiEmotion;
          const actualLabel = record.userEmotion;
          const pattern = patterns.find((p) => p.aiLabel === aiLabel && p.actualLabel === actualLabel);

          const avgValenceShift = pattern
            ? corrections
                .filter((c) => c.aiEmotion === aiLabel && c.userEmotion === actualLabel)
                .reduce((s, r) => s + (r.userValence - r.aiValence), 0) /
              corrections.filter((c) => c.aiEmotion === aiLabel && c.userEmotion === actualLabel).length
            : 0;

          const avgArousalShift = pattern
            ? corrections
                .filter((c) => c.aiEmotion === aiLabel && c.userEmotion === actualLabel)
                .reduce((s, r) => s + (r.userArousal - r.aiArousal), 0) /
              corrections.filter((c) => c.aiEmotion === aiLabel && c.userEmotion === actualLabel).length
            : 0;

          const newMappings = { ...state.userBias.emotionMappings };
          if (pattern) {
            newMappings[aiLabel] = {
              valenceBias: avgValenceShift,
              arousalBias: avgArousalShift,
              labelBias: pattern.confidence,
            };
          }

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
        const { totalCorrections } = get().userBias;
        // Sigmoid-ish curve: 1 correction = weak signal, 20+ = strong signal
        return Math.min(1, totalCorrections / 20);
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
    }
  )
);
