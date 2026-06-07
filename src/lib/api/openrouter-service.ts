/**
 * OpenRouter Mobile Service
 * All AI analysis routed through Cloudflare Worker — key never in app bundle.
 */

import {
  EmotionType,
  EmotionScores,
  EmotionIntensityLabels,
  RankedEmotion,
  BlendedEmotionType,
  BLENDED_EMOTION_LABELS,
  OPPOSITE_EMOTION_PAIRS,
  buildIntensityLabels,
  getIntensityLabel,
} from '../types';

// Always read lazily via process.env — never at module load time
function getBackendUrl(): string {
  return (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vocolens-api.kasrammarvel.workers.dev').trim();
}

export function resolveBackendUrl(): string {
  return getBackendUrl();
}

// ── Client-side Plutchik compute ──────────────────────────────────────────────

export function computeTopThreeEmotions(scores: EmotionScores): RankedEmotion[] {
  return (Object.entries(scores) as [EmotionType, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emotion, score], i) => ({
      emotion,
      score,
      rank: (i + 1) as 1 | 2 | 3,
      intensityLabel: getIntensityLabel(emotion, score),
    }));
}

export function computeBlendedEmotions(scores: EmotionScores): BlendedEmotionType[] {
  const THRESHOLD = 40;
  const result: BlendedEmotionType[] = [];
  for (const [blend, [e1, e2]] of Object.entries(BLENDED_EMOTION_LABELS) as [BlendedEmotionType, [EmotionType, EmotionType]][]) {
    if (scores[e1] >= THRESHOLD && scores[e2] >= THRESHOLD) {
      result.push(blend);
    }
  }
  return result;
}

export function detectAmbivalence(scores: EmotionScores): string[] {
  const THRESHOLD = 35;
  return OPPOSITE_EMOTION_PAIRS
    .filter(([e1, e2]) => scores[e1] >= THRESHOLD && scores[e2] >= THRESHOLD)
    .map(([e1, e2]) => `${e1}↔${e2}`);
}

// ── Result types ──────────────────────────────────────────────────────────────

export interface OpenRouterAnalysisResult {
  title: string;
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
  valence: number;
  arousal: number;
  suggestedBodySensations: string[];
  distressLevel: 'low' | 'moderate' | 'high';
  aiTopThreeEmotions: RankedEmotion[];
  aiBlendedEmotions: BlendedEmotionType[];
