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

function getBackendUrl(): string {
  return (process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vocolens-api.kasrammarvel.workers.dev').trim();
}

export function resolveBackendUrl(): string {
  return getBackendUrl();
}

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
    .map(([e1, e2]) => e1 + String.fromCharCode(8596) + e2);
}

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
  aiAmbivalenceFlags: string[];
}

function parseResponse(result: any): OpenRouterAnalysisResult {
  const validEmotions: EmotionType[] = [
    'happiness', 'sadness', 'anger', 'disgust',
    'fear', 'surprise', 'trust', 'anticipation',
  ];
  const emotionScores: EmotionScores = {
    happiness: 0, sadness: 0, anger: 0, disgust: 0,
    fear: 0, surprise: 0, trust: 0, anticipation: 0,
  };
  if (result.emotionScores && typeof result.emotionScores === 'object') {
    for (const emotion of validEmotions) {
      const score = Number(result.emotionScores[emotion]);
      emotionScores[emotion as EmotionType] = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
    }
  }
  const emotions = ((result.emotions ?? []) as string[])
    .filter((e) => validEmotions.includes(e as EmotionType))
    .slice(0, 4) as EmotionType[];
  if (emotions.length === 0) emotions.push('happiness');
  const primaryEmotion: EmotionType = validEmotions.includes(result.primaryEmotion)
    ? (result.primaryEmotion as EmotionType)
    : (emotions[0] ?? 'happiness');
  const validBlends = Object.keys(BLENDED_EMOTION_LABELS) as BlendedEmotionType[];
  const aiTopThreeEmotions: RankedEmotion[] =
    Array.isArray(result.topThreeEmotions) && result.topThreeEmotions.length > 0
      ? (result.topThreeEmotions as { emotion: string; score: number; intensityLabel: string }[])
          .filter((r) => validEmotions.includes(r.emotion as EmotionType))
          .slice(0, 3)
          .map((r, i) => ({
            emotion: r.emotion as EmotionType,
            score: Math.max(0, Math.min(100, Number(r.score) || 0)),
            rank: (i + 1) as 1 | 2 | 3,
            intensityLabel: r.intensityLabel || getIntensityLabel(r.emotion as EmotionType, Number(r.score) || 0),
          }))
      : computeTopThreeEmotions(emotionScores);
  const aiBlendedEmotions: BlendedEmotionType[] =
    Array.isArray(result.blendedEmotions) && result.blendedEmotions.length > 0
      ? (result.blendedEmotions as string[]).filter((b) => validBlends.includes(b as BlendedEmotionType)) as BlendedEmotionType[]
      : computeBlendedEmotions(emotionScores);
  const aiAmbivalenceFlags: string[] =
    Array.isArray(result.ambivalenceFlags) && result.ambivalenceFlags.length > 0
      ? (result.ambivalenceFlags as string[])
      : detectAmbivalence(emotionScores);
  const rawTitle = typeof result.title === 'string' ? result.title.trim() : '';
  const titleWords = rawTitle.split(/\s+/).filter(Boolean);
  const title = titleWords.length >= 5 && titleWords.length


