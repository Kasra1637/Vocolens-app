/**
 * OpenRouter Mobile Service
 * Calls OpenRouter API directly from the client (primary) or via backend (fallback)
 * for deep emotional analysis using GPT-4o models.
 */

import Constants from 'expo-constants';
import { EmotionType, EmotionScores, EmotionIntensityLabels, buildIntensityLabels } from '../types';

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

function buildSystemPrompt(personalizationContext?: string): string {
  const personalization = personalizationContext
    ? `\n\n${personalizationContext}`
    : '';
  return `You are an expert emotional intelligence analyst specializing in Plutchik's wheel of emotions.
Analyse the journal transcript text for emotional content.${personalization}

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "emotions": ["emotion1", "emotion2"],
  "primaryEmotion": "emotion",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2,
    "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45
  },
  "topics": ["topic1", "topic2"],
  "analysis": "compassionate analysis paragraph (1-2 sentences)",
  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",
  "insights": ["insight1", "insight2"],
  "confidence": 0.85,
  "valence": 30,
  "arousal": 60,
  "suggestedBodySensations": ["chest tightness", "warmth"],
  "distressLevel": "low"
}

Rules:
- emotionScores: all 8 emotions scored 0-100
- emotions array: only emotions with score >= 30, max 4
- primaryEmotion: highest scoring emotion
- emotionIntensity: 0-100 overall intensity
- valence: -100 (unpleasant) to +100 (pleasant)
- arousal: 0 (calm) to 100 (activated)
- distressLevel: "low", "moderate", or "high"
- reflection: warm, second-person ("you"), suitable for TTS
- suggestedBodySensations: 0-3 body sensation strings
- Only valid emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation`;
}

function parseDirectResponse(content: string): OpenRouterAnalysisResult {
  const jsonStr = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const result = JSON.parse(jsonStr);

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
      emotionScores[emotion] = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
    }
  }

  const emotions = ((result.emotions ?? []) as string[])
    .filter((e) => validEmotions.includes(e as EmotionType))
    .slice(0, 4) as EmotionType[];
  if (emotions.length === 0) emotions.push('happiness');

  const primaryEmotion: EmotionType = validEmotions.includes(result.primaryEmotion)
    ? (result.primaryEmotion as EmotionType)
    : (emotions[0] ?? 'happiness');

  return {
    emotions,
    primaryEmotion,
    emotionIntensity: Math.max(0, Math.min(100, Number(result.emotionIntensity) || 50)),
    emotionScores,
    emotionIntensityLabels: buildIntensityLabels(emotionScores),
    topics: ((result.topics ?? ['reflection']) as string[]).slice(0, 5),
    analysis: result.analysis || 'Your journal entry has been recorded.',
    reflection: result.reflection || 'Thank you for sharing. Your feelings are valid.',
    insights: ((result.insights ?? []) as string[]).slice(0, 3),
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.8)),
    audioAnalyzed: false,
    valence: Math.max(-100, Math.min(100, Number(result.valence) ?? 0)),
    arousal: Math.max(0, Math.min(100, Number(result.arousal) ?? 50)),
    suggestedBodySensations: (result.suggestedBodySensations ?? []).slice(0, 3),
    distressLevel: ['low', 'moderate', 'high'].includes(result.distressLevel)
      ? result.distressLevel
      : 'low',
  };
}

/**
 * Call OpenRouter API directly from the client.
 * Uses EXPO_PUBLIC_OPENROUTER_API_KEY env var.
 */
async function callOpenRouterDirectly(
  transcript: string,
  personalizationContext?: string,
  modelId = 'openai/gpt-4o'
): Promise<OpenRouterAnalysisResult> {
  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.startsWith('sk-or-')) {
    throw new Error('OpenRouter API key not configured client-side');
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://blink.new',
      'X-Title': 'Vocolens',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: buildSystemPrompt(personalizationContext) },
        { role: 'user', content: `Analyse this journal entry:\n\n"${transcript}"` },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter direct error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned empty content');
  }

  const resolvedModel = data.model ?? modelId;
  console.log(`[OpenRouter] Direct call succeeded | model=${resolvedModel}`);
  return parseDirectResponse(content);
}

/**
 * Analyze a journal entry.
 * Priority: 1) Direct OpenRouter API call (client-side), 2) Backend endpoint (fallback)
 */
export async function analyzeWithOpenRouter(
  transcript: string,
  audioBase64?: string,
  personalizationContext?: string
): Promise<OpenRouterAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  // PATH 1: Direct OpenRouter API call (client-side)
  try {
    console.log('[OpenRouter] Trying direct API call...');
    return await callOpenRouterDirectly(transcript, personalizationContext);
  } catch (error) {
    console.warn('[OpenRouter] Direct call failed, trying backend:', error);
  }

  // PATH 2: Backend endpoint (for audio + text prosody analysis)
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
 * Check if OpenRouter analysis is available
 */
export async function checkOpenRouterStatus(): Promise<boolean> {
  // Quick check: do we have a client-side key?
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-')) {
    return true;
  }

  // Fallback: check backend
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
