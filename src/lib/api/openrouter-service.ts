/**
 * OpenRouter Mobile Service — Claude 3.5 Sonnet via OpenRouter
 *
 * Calls OpenRouter API directly from the client (primary) or via backend (fallback)
 * for deep emotional analysis using Claude 3.5 Sonnet.
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
  getIntensityLabel,
} from '../types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';

// Claude 3.5 Sonnet via OpenRouter — text only
const CLAUDE_MODEL = 'anthropic/claude-3.5-sonnet-20241022';

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

const OPPOSITE_PAIRS: [EmotionType, EmotionType][] = [
  ['happiness', 'sadness'],
  ['trust', 'disgust'],
  ['fear', 'anger'],
  ['surprise', 'anticipation'],
];

function computeBlendedEmotions(
  scores: EmotionScores,
): Partial<Record<BlendedEmotionType, number>> {
  const blended: [EmotionType, EmotionType, BlendedEmotionType][] = [
    ['happiness', 'trust', 'love'],
    ['trust', 'fear', 'submission'],
    ['fear', 'surprise', 'awe'],
    ['surprise', 'sadness', 'disapproval'],
    ['sadness', 'disgust', 'remorse'],
    ['disgust', 'anger', 'contempt'],
    ['anger', 'anticipation', 'aggressiveness'],
    ['anticipation', 'happiness', 'optimism'],
  ];
  const result: Partial<Record<BlendedEmotionType, number>> = {};
  for (const [a, b, key] of blended) {
    if (scores[a] >= 20 && scores[b] >= 20) {
      result[key] = Math.min(scores[a], scores[b]);
    }
  }
  return result;
}

function detectAmbivalence(
  scores: EmotionScores,
): [EmotionType, EmotionType][] {
  const flags: [EmotionType, EmotionType][] = [];
  for (const [a, b] of OPPOSITE_PAIRS) {
    if (scores[a] >= 25 && scores[b] >= 25) flags.push([a, b]);
  }
  return flags;
}

function computeTopThree(scores: EmotionScores): RankedEmotion[] {
  return (Object.keys(scores) as EmotionType[])
    .map((emotion) => ({
      emotion,
      score: scores[emotion],
      intensityLabel: getIntensityLabel(emotion, scores[emotion]),
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

// System prompt mirrors backend exactly
function buildSystemPrompt(personalizationContext?: string): string {
  const personalization = personalizationContext ? `\n\n${personalizationContext}` : '';
  return `You are an expert emotional intelligence analyst specializing in Plutchik's wheel of emotions.
Analyse the journal transcript for emotional content.${personalization}

PLUTCHIK'S FULL SPECTRUM (use exact labels):
Primary emotions with 3-tier intensity labels (score drives tier):
- Joy: Serenity (0-35) → Joy (36-69) → Ecstasy (70-100)
- Trust: Acceptance (0-35) → Trust (36-69) → Admiration (70-100)
- Fear: Apprehension (0-35) → Fear (36-69) → Terror (70-100)
- Surprise: Distraction (0-35) → Surprise (36-69) → Amazement (70-100)
- Sadness: Pensiveness (0-35) → Sadness (36-69) → Grief (70-100)
- Disgust: Boredom (0-35) → Disgust (36-69) → Loathing (70-100)
- Anger: Annoyance (0-35) → Anger (36-69) → Rage (70-100)
- Anticipation: Interest (0-35) → Anticipation (36-69) → Vigilance (70-100)

Secondary blended emotions (adjacent pairs on the wheel):
- Love = Joy + Trust
- Submission = Trust + Fear
- Awe = Fear + Surprise
- Disapproval = Surprise + Sadness
- Remorse = Sadness + Disgust
- Contempt = Disgust + Anger
- Aggressiveness = Anger + Anticipation
- Optimism = Anticipation + Joy

OPPOSITE EMOTIONS: If BOTH appear above threshold, flag as ambivalent:
- Joy ↔ Sadness
- Trust ↔ Disgust
- Fear ↔ Anger
- Surprise ↔ Anticipation

Return ONLY a valid JSON object — no markdown, no explanation:
{
  "emotions": ["happiness", "trust"],
  "primaryEmotion": "happiness",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2,
    "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45
  },
  "topThreeEmotions": [
    {"rank": 1, "emotion": "happiness", "score": 80, "intensityLabel": "Ecstasy"},
    {"rank": 2, "emotion": "trust", "score": 60, "intensityLabel": "Trust"},
    {"rank": 3, "emotion": "anticipation", "score": 45, "intensityLabel": "Anticipation"}
  ],
  "blendedEmotions": {"love": 60, "optimism": 45},
  "ambivalenceFlags": [],
  "topics": ["topic1", "topic2"],
  "analysis": "compassionate analysis paragraph",
  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",
  "insights": ["insight1", "insight2"],
  "confidence": 0.85,
  "valence": 45,
  "arousal": 62,
  "suggestedBodySensations": ["chest tightness", "warmth"],
  "distressLevel": "low"
}

Rules:
- emotionScores: all 8 emotions scored 0-100
- emotions array: only emotions with score >= 30, max 4
- primaryEmotion: highest scoring emotion from: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation
- topThreeEmotions: the top-3 ranked emotions, each with rank (1/2/3), emotion name, score (0-100), and intensityLabel (exact Plutchik tier label)
- blendedEmotions: compute from adjacent pairs where both score >= 20 — use minimum of the two scores. Valid keys: love, submission, awe, disapproval, remorse, contempt, aggressiveness, optimism
- ambivalenceFlags: array of string arrays ["emotionA", "emotionB"] where both opposite emotions score >= 25
- emotionIntensity: 0-100 overall intensity
- valence: -100 (very unpleasant) to +100 (very pleasant)
- arousal: 0 (very calm) to 100 (very activated)
- distressLevel: "low" | "moderate" | "high"
- reflection: warm, second-person ("you"), suitable for TTS
- suggestedBodySensations: 0-3 body sensation strings
- Only valid emotion values: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation
- ALWAYS include topThreeEmotions, blendedEmotions, and ambivalenceFlags fields`;
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

  // Prefer AI-provided top-3, fall back to client compute
  let topThreeEmotions: RankedEmotion[];
  if (Array.isArray(result.topThreeEmotions) && result.topThreeEmotions.length > 0) {
    topThreeEmotions = result.topThreeEmotions
      .filter(
        (e: unknown) =>
          typeof e === 'object' && e !== null &&
          typeof (e as Record<string, unknown>).emotion === 'string' &&
          validEmotions.includes((e as Record<string, unknown>).emotion as EmotionType)
      )
      .slice(0, 3)
      .map((e: Record<string, unknown>, i: number) => ({
        rank: (i + 1) as 1 | 2 | 3,
        emotion: e.emotion as EmotionType,
        score: typeof e.score === 'number'
          ? Math.max(0, Math.min(100, e.score))
          : emotionScores[e.emotion as EmotionType],
        intensityLabel:
          typeof e.intensityLabel === 'string' && e.intensityLabel.trim().length > 0
            ? (e.intensityLabel as string)
            : getIntensityLabel(e.emotion as EmotionType, emotionScores[e.emotion as EmotionType]),
      }));
  } else {
    topThreeEmotions = computeTopThree(emotionScores);
  }

  // Prefer AI-provided blended, fall back to client compute
  let blendedEmotions: Partial<Record<BlendedEmotionType, number>>;
  if (
    result.blendedEmotions &&
    typeof result.blendedEmotions === 'object' &&
    Object.keys(result.blendedEmotions).length > 0
  ) {
    blendedEmotions = {};
    for (const key of validBlended) {
      const v = Number((result.blendedEmotions as Record<string, unknown>)[key]);
      if (!isNaN(v) && v >= 20) blendedEmotions[key] = Math.max(0, Math.min(100, v));
    }
  } else {
    blendedEmotions = computeBlendedEmotions(emotionScores);
  }

  // Prefer AI-provided ambivalence, fall back to client compute
  let ambivalenceFlags: [EmotionType, EmotionType][];
  if (Array.isArray(result.ambivalenceFlags) && result.ambivalenceFlags.length > 0) {
    ambivalenceFlags = result.ambivalenceFlags
      .filter(
        (pair: unknown) =>
          Array.isArray(pair) && pair.length === 2 &&
          validEmotions.includes(pair[0] as EmotionType) &&
          validEmotions.includes(pair[1] as EmotionType)
      )
      .slice(0, 4) as [EmotionType, EmotionType][];
  } else {
    ambivalenceFlags = detectAmbivalence(emotionScores);
  }

  console.log(
    `[OpenRouter] Claude parsed | primary=${primaryEmotion} | top3=${topThreeEmotions.map((e) => `${e.emotion}(${e.intensityLabel})`).join(',')} | blended=${Object.keys(blendedEmotions).join(',')} | ambivalent=${ambivalenceFlags.map((p) => `${p[0]}↔${p[1]}`).join(',')}`
  );

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
    distressLevel: ['low', 'moderate', 'high'].includes(result.distressLevel)
      ? result.distressLevel
      : 'low',
  };
}

/** Call OpenRouter API directly from the client using EXPO_PUBLIC_OPENROUTER_API_KEY */
async function callOpenRouterDirectly(
  transcript: string,
  personalizationContext?: string,
  modelId = CLAUDE_MODEL,
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
  if (!content) throw new Error('OpenRouter returned empty content');

  const resolvedModel = data.model ?? modelId;
  console.log(`[OpenRouter] Claude 3.5 direct call succeeded | model=${resolvedModel}`);
  return parseDirectResponse(content);
}

/**
 * Analyze a journal transcript.
 * Priority: 1) Direct OpenRouter call (client-side Claude 3.5) 2) Backend endpoint (fallback)
 */
export async function analyzeWithOpenRouter(
  transcript: string,
  _audioBase64?: string,
  personalizationContext?: string,
): Promise<OpenRouterAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  // PATH 1: Direct OpenRouter API call (client-side Claude 3.5 Sonnet)
  try {
    console.log('[OpenRouter] Trying direct Claude 3.5 API call...');
    return await callOpenRouterDirectly(transcript, personalizationContext);
  } catch (error) {
    console.warn('[OpenRouter] Direct Claude call failed, trying backend:', error);
  }

  // PATH 2: Backend endpoint (also Claude 3.5 now)
  const body: { transcript: string; personalizationContext?: string } = { transcript };
  if (personalizationContext?.trim()) body.personalizationContext = personalizationContext;

  const response = await fetch(`${BACKEND_URL}/api/journal/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Backend analysis error (${response.status}): ${errText}`);
  }

  const json = await response.json() as {
    success: boolean;
    data: OpenRouterAnalysisResult;
    error?: string;
  };

  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid response from analysis backend');
  }

  return json.data;
}

/** Check if OpenRouter analysis is available */
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
