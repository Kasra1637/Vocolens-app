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

const validEmotions: EmotionType[] = [
  'happiness', 'sadness', 'anger', 'disgust',
  'fear', 'surprise', 'trust', 'anticipation',
];

const validBlended: BlendedEmotionType[] = [
  'love', 'submission', 'awe', 'disapproval',
  'remorse', 'contempt', 'aggressiveness', 'optimism',
];

const BLENDED_PAIRS: [EmotionType, EmotionType, BlendedEmotionType][] = [
  ['happiness', 'trust', 'love'],
  ['trust', 'fear', 'submission'],
  ['fear', 'surprise', 'awe'],
  ['surprise', 'sadness', 'disapproval'],
  ['sadness', 'disgust', 'remorse'],
  ['disgust', 'anger', 'contempt'],
  ['anger', 'anticipation', 'aggressiveness'],
  ['anticipation', 'happiness', 'optimism'],
];

const OPPOSITE_PAIRS: [EmotionType, EmotionType][] = [
  ['happiness', 'sadness'],
  ['trust', 'disgust'],
  ['fear', 'anger'],
  ['surprise', 'anticipation'],
];

function computeBlendedEmotions(scores: EmotionScores): Partial<Record<BlendedEmotionType, number>> {
  const result: Partial<Record<BlendedEmotionType, number>> = {};
  for (const [a, b, key] of BLENDED_PAIRS) {
    if (scores[a] >= 20 && scores[b] >= 20) {
      result[key] = Math.min(scores[a], scores[b]);
    }
  }
  return result;
}

function detectAmbivalence(scores: EmotionScores): [EmotionType, EmotionType][] {
  const flags: [EmotionType, EmotionType][] = [];
  for (const [a, b] of OPPOSITE_PAIRS) {
    if (scores[a] >= 25 && scores[b] >= 25) {
      flags.push([a, b]);
    }
  }
  return flags;
}

function computeTopThree(scores: EmotionScores): RankedEmotion[] {
  return (Object.keys(scores) as EmotionType[])
    .map((emotion) => ({
      emotion,
      score: scores[emotion],
      intensityLabel: getEmotionSubLabel(emotion, scores[emotion]),
    }))
    .filter((e) => e.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((e, i) => ({
      rank: (i + 1) as 1 | 2 | 3,
      emotion: e.emotion,
      score: e.score,
      intensityLabel: e.intensityLabel,
    }));
}

function buildSystemPrompt(personalizationContext?: string): string {
  const personalization = personalizationContext
    ? `\n\n${personalizationContext}`
    : '';
  return `You are an expert emotional intelligence analyst specializing in Plutchik's wheel of emotions.\nAnalyse the journal transcript for emotional content.${personalization}\n\nPLUTCHIK'S FULL SPECTRUM (use exact labels):\nPrimary emotions with 3-tier intensity labels (score drives tier):\n- Joy: Serenity (0-35) → Joy (36-69) → Ecstasy (70-100)\n- Trust: Acceptance (0-35) → Trust (36-69) → Admiration (70-100)\n- Fear: Apprehension (0-35) → Fear (36-69) → Terror (70-100)\n- Surprise: Distraction (0-35) → Surprise (36-69) → Amazement (70-100)\n- Sadness: Pensiveness (0-35) → Sadness (36-69) → Grief (70-100)\n- Disgust: Boredom (0-35) → Disgust (36-69) → Loathing (70-100)\n- Anger: Annoyance (0-35) → Anger (36-69) → Rage (70-100)\n- Anticipation: Interest (0-35) → Anticipation (36-69) → Vigilance (70-100)\n\nSecondary blended emotions (adjacent pairs):\nLove = Joy + Trust | Submission = Trust + Fear | Awe = Fear + Surprise\nDisapproval = Surprise + Sadness | Remorse = Sadness + Disgust | Contempt = Disgust + Anger\nAggressiveness = Anger + Anticipation | Optimism = Anticipation + Joy\n\nOPPOSITE PAIRS: Joy↔Sadness, Trust↔Disgust, Fear↔Anger, Surprise↔Anticipation\nIf both appear, flag as ambivalent and reduce each intensity.\n\nReturn ONLY a valid JSON object — no markdown, no explanation:\n{\n  "emotions": ["happiness", "trust"],\n  "primaryEmotion": "happiness",\n  "emotionIntensity": 75,\n  "emotionScores": {\n    "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2,\n    "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45\n  },\n  "topThreeEmotions": [\n    {"rank": 1, "emotion": "happiness", "score": 80, "intensityLabel": "Ecstasy"},\n    {"rank": 2, "emotion": "trust", "score": 60, "intensityLabel": "Trust"},\n    {"rank": 3, "emotion": "anticipation", "score": 45, "intensityLabel": "Anticipation"}\n  ],\n  "blendedEmotions": {"love": 60, "optimism": 45},\n  "ambivalenceFlags": [],\n  "topics": ["topic1", "topic2"],\n  "analysis": "compassionate analysis paragraph (1-2 sentences)",\n  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",\n  "insights": ["insight1", "insight2"],\n  "confidence": 0.85,\n  "valence": 30,\n  "arousal": 60,\n  "suggestedBodySensations": ["chest tightness", "warmth"],\n  "distressLevel": "low"\n}\n\nRules:\n- emotionScores: all 8 emotions scored 0-100\n- emotions array: only emotions with score >= 30, max 4\n- primaryEmotion: highest scoring emotion\n- topThreeEmotions: the top-3 ranked emotions — each with rank (1/2/3), emotion name, score, and intensityLabel (exact Plutchik tier label matching spectrum above)\n- blendedEmotions: compute from adjacent pairs where both score >= 20 — use minimum of the two scores\n- ambivalenceFlags: array of string arrays ["emotionA", "emotionB"] where both opposite emotions score >= 25\n- emotionIntensity: 0-100 overall intensity\n- valence: -100 (very unpleasant) to +100 (very pleasant)\n- arousal: 0 (very calm) to 100 (very activated)\n- distressLevel: "low", "moderate", or "high"\n- reflection: warm, second-person ("you"), suitable for TTS\n- suggestedBodySensations: 0-3 body sensation strings\n- Only valid emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation\n- Only valid blendedEmotion keys: love, submission, awe, disapproval, remorse, contempt, aggressiveness, optimism\n- ALWAYS include topThreeEmotions, blendedEmotions, and ambivalenceFlags fields`;
}

function parseDirectResponse(content: string): OpenRouterAnalysisResult {
  const jsonStr = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const result = JSON.parse(jsonStr);

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

  // Top-3: prefer AI-provided, fall back to client compute
  let topThreeEmotions: RankedEmotion[];
  if (Array.isArray(result.topThreeEmotions) && result.topThreeEmotions.length > 0) {
    topThreeEmotions = result.topThreeEmotions
      .filter((e: unknown) => typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).emotion === 'string' && validEmotions.includes((e as Record<string, unknown>).emotion as EmotionType))
      .slice(0, 3)
      .map((e: Record<string, unknown>, i: number) => ({
        rank: (i + 1) as 1 | 2 | 3,
        emotion: e.emotion as EmotionType,
        score: typeof e.score === 'number' ? Math.max(0, Math.min(100, e.score)) : emotionScores[e.emotion as EmotionType],
        intensityLabel: typeof e.intensityLabel === 'string' && e.intensityLabel.trim().length > 0 ? (e.intensityLabel as string) : getEmotionSubLabel(e.emotion as EmotionType, emotionScores[e.emotion as EmotionType]),
      }));
  } else {
    topThreeEmotions = computeTopThree(emotionScores);
  }

  // Blended: prefer AI-provided, fall back to client compute
  let blendedEmotions: Partial<Record<BlendedEmotionType, number>>;
  if (result.blendedEmotions && typeof result.blendedEmotions === 'object' && Object.keys(result.blendedEmotions).length > 0) {
    blendedEmotions = {};
    for (const key of validBlended) {
      const v = Number((result.blendedEmotions as Record<string, unknown>)[key]);
      if (!isNaN(v) && v >= 20) blendedEmotions[key] = Math.max(0, Math.min(100, v));
    }
  } else {
    blendedEmotions = computeBlendedEmotions(emotionScores);
  }

  // Ambivalence: prefer AI-provided, fall back to client compute
  let ambivalenceFlags: [EmotionType, EmotionType][];
  if (Array.isArray(result.ambivalenceFlags) && result.ambivalenceFlags.length > 0) {
    ambivalenceFlags = result.ambivalenceFlags
      .filter((pair: unknown) => Array.isArray(pair) && pair.length === 2 && validEmotions.includes(pair[0] as EmotionType) && validEmotions.includes(pair[1] as EmotionType))
      .slice(0, 4) as [EmotionType, EmotionType][];
  } else {
    ambivalenceFlags = detectAmbivalence(emotionScores);
  }

  console.log(`[OpenRouter] Direct parsed | primary=${primaryEmotion} | top3=${topThreeEmotions.map((e) => `${e.emotion}(${e.intensityLabel})`).join(',')} | blended=${Object.keys(blendedEmotions).join(',')} | ambivalent=${ambivalenceFlags.map((p) => `${p[0]}↔${p[1]}`).join(',')}`);

  return {
    emotions,
    primaryEmotion,
    emotionIntensity: Math.max(0, Math.min(100, Number(result.emotionIntensity) || 50)),
    emotionScores,
    emotionIntensityLabels: buildIntensityLabels(emotionScores),
    topThreeEmotions,
    blendedEmotions,
    ambivalenceFlags,
    topics: ((result.topics ?? ['reflection']) as string[]).slice(0, 5),
    analysis: result.analysis || 'Your journal entry has been recorded.',
    reflection: result.reflection || 'Thank you for sharing. Your feelings are valid.',
    insights: ((result.insights ?? []) as string[]).slice(0, 3),
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.8)),
    audioAnalyzed: false,
    valence: Math.max(-100, Math.min(100, Number(result.valence) ?? 0)),
    arousal: Math.max(0, Math.min(100, Number(result.arousal) ?? 50)),
    suggestedBodySensations: (result.suggestedBodySensations ?? []).slice(0, 3),
    distressLevel: ['low', 'moderate', 'high'].includes(result.distressLevel) ? result.distressLevel : 'low',
  };
}

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
      max_tokens: 2000,
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

export async function analyzeWithOpenRouter(
  transcript: string,
  audioBase64?: string,
  personalizationContext?: string
): Promise<OpenRouterAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  try {
    console.log('[OpenRouter] Trying direct API call...');
    return await callOpenRouterDirectly(transcript, personalizationContext);
  } catch (error) {
    console.warn('[OpenRouter] Direct call failed, trying backend:', error);
  }

  const body: { transcript: string; audioBase64?: string; personalizationContext?: string } = { transcript };
  if (audioBase64 && audioBase64.length > 0) body.audioBase64 = audioBase64;
  if (personalizationContext && personalizationContext.trim().length > 0) body.personalizationContext = personalizationContext;

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
  if (!json.success || !json.data) throw new Error(json.error || 'Invalid response from analysis backend');
  return json.data;
}

export async function checkOpenRouterStatus(): Promise<boolean> {
  if (OPENROUTER_API_KEY && OPENROUTER_API_KEY.startsWith('sk-or-')) return true;
  try {
    const response = await fetch(`${BACKEND_URL}/api/journal/status`, { method: 'GET' });
    if (!response.ok) return false;
    const json = await response.json() as { status: string };
    return json.status === 'ok';
  } catch {
    return false;
  }
}