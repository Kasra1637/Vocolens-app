/**
 * OpenRouter Mobile Service — Claude 3.5 Sonnet
 * Direct Claude 3.5 Sonnet calls (client-side primary, backend fallback).
 * Client-side compute for top-3, blended emotions, and ambivalence flags.
 */

import Constants from 'expo-constants';
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

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'anthropic/claude-3.5-sonnet-20241022';

const BACKEND_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

// Read lazily via a function so Constants.expoConfig is fully populated.
// Module-load-time reads can fire before the Expo config is hydrated in
// some OTA update contexts, returning undefined even when the key exists.
function getOpenRouterApiKey(): string {
  return (
    Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENROUTER_API_KEY ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
    ''
  );
}

export function resolveBackendUrl(): string {
  return BACKEND_URL;
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
  // Plutchik deep breakdown
  aiTopThreeEmotions: RankedEmotion[];
  aiBlendedEmotions: BlendedEmotionType[];
  aiAmbivalenceFlags: string[];
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(personalizationContext?: string): string {
  const personalization = personalizationContext ? `\n\n${personalizationContext}` : '';
  return `You are an expert emotional intelligence analyst specialising in Plutchik's wheel of emotions.
Analyse the journal transcript text and return ONLY a valid JSON object — no markdown, no explanation.${personalization}

{
  "title": "Quiet Morning Clarity",
  "emotions": ["emotion1", "emotion2"],
  "primaryEmotion": "emotion",
  "emotionIntensity": 75,
  "emotionScores": {
    "happiness": 80, "sadness": 10, "anger": 5, "disgust": 2,
    "fear": 15, "surprise": 20, "trust": 60, "anticipation": 45
  },
  "topThreeEmotions": [
    { "emotion": "happiness", "score": 80, "intensityLabel": "Ecstasy" },
    { "emotion": "trust",     "score": 60, "intensityLabel": "Admiration" },
    { "emotion": "surprise",  "score": 20, "intensityLabel": "Distraction" }
  ],
  "blendedEmotions": ["Love", "Optimism"],
  "ambivalenceFlags": ["happiness↔sadness"],
  "topics": ["topic1", "topic2"],
  "analysis": "compassionate analysis paragraph (2-3 sentences)",
  "reflection": "warm empathetic second-person reflection (2-3 sentences) for TTS playback",
  "insights": ["insight1", "insight2"],
  "confidence": 0.85,
  "valence": 45,
  "arousal": 62,
  "suggestedBodySensations": ["tight shoulders", "racing heart"],
  "distressLevel": "low"
}

Rules:
- emotionScores: all 8 emotions scored 0–100
- emotions: only emotions with score ≥ 30, max 4
- primaryEmotion: highest scoring emotion
- emotionIntensity: 0–100 overall intensity
- topThreeEmotions: top 3 by score with Plutchik intensity label
- blendedEmotions: valid dyads when BOTH component emotions ≥ 40
  Values: Love(happiness+trust), Optimism(anticipation+happiness), Submission(trust+fear),
  Awe(fear+surprise), Disapproval(surprise+sadness), Remorse(sadness+disgust),
  Contempt(disgust+anger), Aggressiveness(anger+anticipation)
- ambivalenceFlags: opposite pairs both ≥ 35 → "e1↔e2"
  Pairs: happiness↔sadness, anger↔fear, trust↔disgust, anticipation↔surprise
- valence: −100 to +100 | arousal: 0–100 | distressLevel: low|moderate|high
- title: 3–4 word evocative title in Title Case capturing the emotional core (e.g. "Tension at Work Eases", "Quiet Morning Clarity")
- reflection: warm, second-person ("you"), suitable for TTS
- Plutchik tiers: 0-35=low(Serenity/Acceptance/...), 36-69=mid, 70-100=high(Ecstasy/Admiration/...)
- Only valid base emotions: happiness, sadness, anger, disgust, fear, surprise, trust, anticipation`;
}

// ── Parser ────────────────────────────────────────────────────────────────────

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

  // top-3: prefer AI response, compute as fallback
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

  return {
    title: (typeof result.title === 'string' && result.title.trim().length > 0)
      ? result.title.trim().slice(0, 60)
      : 'Journal Entry',
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
    distressLevel: ['low', 'moderate', 'high'].includes(result.distressLevel) ? result.distressLevel : 'low',
    aiTopThreeEmotions,
    aiBlendedEmotions,
    aiAmbivalenceFlags,
  };
}

// ── API call ──────────────────────────────────────────────────────────────────

async function callClaudeDirect(
  transcript: string,
  personalizationContext?: string,
): Promise<OpenRouterAnalysisResult> {
  const apiKey = getOpenRouterApiKey();
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
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(personalizationContext) },
        { role: 'user', content: `Analyse this journal entry:\n\n"${transcript}"` },
      ],
      temperature: 0.7,
      max_tokens: 1400,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude direct error (${response.status}): ${errText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Claude returned empty content');

  console.log(`[OpenRouter] Direct call succeeded | model=${data.model ?? MODEL}`);
  return parseDirectResponse(content);
}

/**
 * Analyse a journal entry.
 * Priority: 1) Direct Claude 3.5 Sonnet (client-side key)  2) Backend endpoint
 */
export async function analyzeWithOpenRouter(
  transcript: string,
  _audioBase64?: string, // audio no longer sent to model; Deepgram handles transcription
  personalizationContext?: string,
): Promise<OpenRouterAnalysisResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  // PATH 1: Direct Claude API call (client-side)
  try {
    console.log('[OpenRouter] Trying direct Claude 3.5 Sonnet call...');
    return await callClaudeDirect(transcript, personalizationContext);
  } catch (error) {
    console.warn('[OpenRouter] Direct call failed, trying backend:', error);
  }

  // PATH 2: Backend endpoint
  const response = await fetch(`${BACKEND_URL}/api/journal/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, personalizationContext }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Backend analysis error (${response.status}): ${errText}`);
  }

  const json = await response.json() as { success: boolean; data: OpenRouterAnalysisResult; error?: string };
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid response from analysis backend');
  }

  // Backend may return without ai* fields if it's an older deploy — compute client-side
  const d = json.data;
  if (!d.title) d.title = 'Journal Entry';
  if (!d.aiTopThreeEmotions) d.aiTopThreeEmotions = computeTopThreeEmotions(d.emotionScores);
  if (!d.aiBlendedEmotions)  d.aiBlendedEmotions  = computeBlendedEmotions(d.emotionScores);
  if (!d.aiAmbivalenceFlags) d.aiAmbivalenceFlags  = detectAmbivalence(d.emotionScores);

  return d;
}

export async function checkOpenRouterStatus(): Promise<boolean> {
  const apiKey = getOpenRouterApiKey();
  if (apiKey && apiKey.startsWith('sk-or-')) return true;
  try {
    const response = await fetch(`${BACKEND_URL}/api/journal/status`);
    if (!response.ok) return false;
    const json = await response.json() as { status: string };
    return json.status === 'ok';
  } catch {
    return false;
  }
}


// ── Warm Recommendation ───────────────────────────────────────────────────────

export interface RecommendationResult {
  /** Full warm advice text (3–4 sentences, for display) */
  advice: string;
  /** Shorter TTS-optimised spoken version (1–2 sentences) */
  audioAdvice: string;
}

const RECOMMENDATION_SYSTEM_PROMPT = `You are a warm, compassionate emotional wellness companion.
Your role is to provide a heartfelt, personalised recommendation based on a journal entry transcription.

TONE GUIDELINES:
- Speak directly to the person in the second person ("you", "your").
- Be warm, gentle, and encouraging — like a trusted friend who truly listened.
- Acknowledge what they are feeling before suggesting anything.
- Keep suggestions concrete, gentle, and immediately actionable.
- Never be clinical, preachy, or diagnostic.
- Do NOT repeat the same phrasing in "advice" and "audioAdvice".

Return ONLY a valid JSON object — no markdown, no explanation, no preamble:

{
  "advice": "3–4 sentence warm recommendation grounded in the specific emotional content of the entry. Acknowledge the emotion, validate the experience, then offer one or two gentle, specific actions tailored to what was shared.",
  "audioAdvice": "1–2 sentence spoken version. Warmer and more personal in tone. Suitable for TTS — use natural rhythm, no lists or bullet points."
}

RULES:
- "advice": 3–4 sentences. Specific to the entry content and primary emotion. Warm, not generic.
- "audioAdvice": 1–2 sentences max. More intimate and conversational. No em-dashes or special characters.
- Both fields must always be present and non-empty.
- Never start with "I" — always address the person directly.
- Ground the advice in at least one specific detail from the transcript.`;

/**
 * Generate a warm, personalised recommendation for a journal entry.
 * Priority: 1) Direct Claude call (client-side key)  2) Backend /api/journal/recommendation
 */
export async function generateRecommendation(
  transcript: string,
  primaryEmotion: string = 'happiness',
): Promise<RecommendationResult> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript is empty');
  }

  // PATH 1: Direct Claude API call (client-side key)
  const apiKey = getOpenRouterApiKey();
  if (apiKey && apiKey.startsWith('sk-or-')) {
    try {
      console.log('[OpenRouter] Generating recommendation (direct)…');
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://blink.new',
          'X-Title': 'Vocolens',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: RECOMMENDATION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Here is my journal entry:\n\n"${transcript}"\n\nPrimary emotion detected: ${primaryEmotion}\n\nPlease provide a warm, personalised recommendation.`,
            },
          ],
          temperature: 0.85,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const jsonStr = content
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          const result = JSON.parse(jsonStr);
          const advice =
            typeof result.advice === 'string' && result.advice.trim().length > 0
              ? result.advice.trim()
              : 'Take a moment to acknowledge what you\'re feeling. Your emotions are valid, and simply expressing them here is a meaningful act of self-care.';
          const audioAdvice =
            typeof result.audioAdvice === 'string' && result.audioAdvice.trim().length > 0
              ? result.audioAdvice.trim()
              : advice.split('.')[0] + '.';
          console.log('[OpenRouter] Recommendation generated (direct)');
          return { advice, audioAdvice };
        }
      }
    } catch (err) {
      console.warn('[OpenRouter] Direct recommendation failed, trying backend:', err);
    }
  }

  // PATH 2: Backend endpoint
  const response = await fetch(`${BACKEND_URL}/api/journal/recommendation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, primaryEmotion }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Backend recommendation error (${response.status}): ${errText}`);
  }

  const json = await response.json() as {
    success: boolean;
    data: RecommendationResult;
    error?: string;
  };

  if (!json.success || !json.data) {
    throw new Error(json.error || 'Invalid response from recommendation backend');
  }

  console.log('[OpenRouter] Recommendation generated (backend)');
  return json.data;
}
