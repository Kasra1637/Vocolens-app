/**
 * OpenRouter Mobile Service
 * Calls OpenRouter API directly from the client (primary) or via backend (fallback)
 * for deep emotional analysis using GPT-4o models.
 * 
 * Plutchik's Wheel of Emotions — all 3 tiers, blended emotions, opposite ambivalence, top-3 ranking.
 */

import Constants from 'expo-constants';
import {
  EmotionType,
  EmotionScores,
  EmotionIntensityLabels,
  BlendedEmotionType,
  RankedEmotion,
  buildIntensityLabels,
  getEmotionSubLabel,
} from '../types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

const OPENROUTER_API_KEY =
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';

export function resolveBackendUrl(): string {
  return BACKEND_URL;
}

export interface OpenRouterAnalysisResult {
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
  valence: number;
  arousal: number;
  suggestedBodySensations: string[];
  distressLevel: 'low' | 'moderate' | 'high';
}