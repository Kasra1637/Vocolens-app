/**
 * OpenRouter Mobile Service
 * Calls the backend /api/journal/analyze endpoint which uses GPT-4o audio model
 * for deep emotional analysis from both speech prosody and text content.
 */

import Constants from 'expo-constants';
import { EmotionType, EmotionScores, EmotionIntensityLabels } from '../types';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

export function resolveBackendUrl(): string {
  return BACKEND_URL;
}

export interface OpenRouterAnalysisResult {
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
  // Valence-Arousal (Circumplex Model)
  valence: number; // -100 (unpleasant) to +100 (pleasant)
  arousal: number; // 0 (calm) to 100 (activated)
  suggestedBodySensations: string[];
  distressLevel: 'low' | 'moderate' | 'high';
}

/**
 * Analyze a journal entry via the backend GPT-4o integration.
 * Pass audioBase64 (WAV) to enable prosody + content analysis.
 * Falls back to text-only analysis if audio is not provided or model unavailable.
 */
export async function analyzeWithOpenRouter(
  transcript: string,
  audioBase64?: string,
  personalizationContext?: string
): Promise<OpenRouterAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  const body: { transcript: string; audioBase64?: string; personalizationContext?: string } = { transcript };
  if (audioBase64 && audioBase64.length > 0) {
    body.audioBase64 = audioBase64;
  }
  if (personalizationContext && personalizationContext.trim().length > 0) {
    body.personalizationContext = personalizationContext;
  }

  const response = await fetch(`${BACKEND_URL}/api/journal/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Backend analysis error (${response.status}): ${errText}`);
  }

  const json = await response.json() as { success: boolean; data: OpenRouterAnalysisResult; error?: string };

  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid response from analysis backend');
  }

  return json.data;
}

/**
 * Check if the backend OpenRouter integration is available
 */
export async function checkOpenRouterStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/journal/status`, {
      method: 'GET',
    });
    if (!response.ok) return false;
    const json = await response.json() as { status: string };
    return json.status === 'ok';
  } catch {
    return false;
  }
}
