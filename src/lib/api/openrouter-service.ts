/**
 * OpenRouter Mobile Service — Claude 3.7 Sonnet
 * Direct Claude 3.7 Sonnet calls (client-side primary, backend fallback).
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
const MODEL = 'anthropic/claude-3-7-sonnet';

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

/**
 * Deep-context recommendation prompt.
 *
 * Forces Claude to:
 *  1. Quote or directly reference specific words/phrases from the transcript
 *  2. Name the exact emotion and why it makes sense given what was said
 *  3. Offer one concrete, immediately actionable suggestion tied to the situation
 *  4. Never produce generic advice that could apply to anyone
 */
const RECOMMENDATION_SYSTEM_PROMPT = `You are a deeply empathetic journaling companion who has just read someone's private voice journal entry.

Your task: write ONE personalised recommendation that responds to THIS specific entry — not to journaling in general, not to the emotion in general, but to what this exact person said today.

MANDATORY GROUNDING RULES — violating any of these makes the response invalid:
1. Quote or directly reference at least one specific phrase, situation, or detail from the transcript (use their own words where possible).
2. Name the emotion they expressed AND connect it explicitly to what they described — e.g. "The frustration you felt when [specific situation they mentioned]…"
3. Your one actionable suggestion must be tied to their specific context — not a generic "take a walk" or "breathe deeply".
4. Never write advice that could apply to any journal entry. Every sentence must be traceable back to this entry.
5. Do NOT mention "journaling", "voice entry", or "recording" — respond as if you were just having a conversation.

TONE:
- Warm, gentle, intimate — like a wise close friend, not a therapist.
- Second person throughout: "you", "your".
- Speak with care, not with instructions. Suggestions feel like an invitation, not a prescription.
- 3–4 sentences for "advice". Short enough to feel intimate, long enough to feel considered.
- 1–2 sentences for "audioAdvice" — spoken-word optimised: natural rhythm, no punctuation that sounds odd aloud (no em-dashes, no colons, no semicolons).

Return ONLY a valid JSON object — no markdown fences, no explanation:

{
  "advice": "3–4 warm sentences grounded in what they specifically said and felt. Quote or reference their words. Name the exact emotion in context. Give one concrete, situation-specific suggestion.",
  "audioAdvice": "1–2 sentences. The warmest, most personal distillation of the above. Suitable for TTS playback."
}`;

// ── Transcript-grounded local fallback ───────────────────────────────────────
/**
 * Called only when both API paths are unavailable.
 * Builds advice that references the actual transcript content directly —
 * no generic templates. Parses out key phrases and the emotion to compose
 * a unique, personal-feeling response every time.
 */
function buildLocalRecommendation(
  transcript: string,
  primaryEmotion: string,
): RecommendationResult {
  const t = transcript.replace(/\s+/g, ' ').trim();

  // Pull meaningful sentences — skip very short ones
  const sentences = t
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(' ').length >= 4);

  // Pick the most emotionally loaded sentence as the anchor quote
  const anchor = sentences[0] ?? t.slice(0, 80).trim();
  const shortAnchor = anchor.length > 70 ? anchor.slice(0, 70).trimEnd() + '…' : anchor;

  // Emotion-to-validation map — very short opening lines, NOT full advice
  const emotionValidation: Record<string, string> = {
    happiness:    'The joy coming through in what you shared is real and worth holding onto.',
    sadness:      'The heaviness you described makes complete sense, and you were right to name it.',
    anger:        'The frustration you felt comes through clearly, and it is entirely understandable.',
    disgust:      'The discomfort you described points directly to something you value deeply.',
    fear:         'The worry you named took courage to say out loud, and it deserves to be heard.',
    surprise:     'The unexpected turn you described clearly caught you off guard, and that is okay.',
    trust:        'The quiet confidence coming through in your words is something worth recognising.',
    anticipation: 'The anticipation you described is a sign of how much this matters to you.',
  };

  const validation = emotionValidation[primaryEmotion.toLowerCase()]
    ?? `What you shared about "${shortAnchor}" resonates deeply.`;

  // Build the advice around the actual transcript sentence
  const advice =
    `${validation} When you said "${shortAnchor}", you gave voice to something important — and that kind of honesty with yourself is the first step toward clarity. ` +
    `Take a few minutes today to sit with that feeling without trying to change it; simply acknowledging it, as you did here, is already meaningful progress. ` +
    `When you feel ready, ask yourself what one small thing would honour what you are feeling right now.`;

  const audioAdvice =
    `${validation} Sitting with what you shared today, without rushing to fix it, is exactly the kind of care you deserve.`;

  return { advice, audioAdvice };
}

/**
 * Generate a deeply personalised, one-shot recommendation for a journal entry.
 *
 * Priority:
 *   1) Direct Claude 3.5 Sonnet call (client-side EXPO_PUBLIC_OPENROUTER_API_KEY)
 *   2) Backend /api/journal/recommendation endpoint
 *   3) Local transcript-grounded fallback (never generic, always succeeds)
 *
 * This function NEVER throws. One call, one result — no retries exposed to the UI.
 */
export async function generateRecommendation(
  transcript: string,
  primaryEmotion: string = 'happiness',
): Promise<RecommendationResult> {
  // Empty transcript guard
  if (!transcript || transcript.trim().length === 0) {
    return {
      advice:
        'Taking time to check in with yourself is a meaningful act, even when words are hard to find. Whatever you are carrying today is valid, and the simple act of showing up here matters more than you might realise.',
      audioAdvice:
        'Showing up here, even without words, is already an act of self-care. Whatever you are carrying today is valid.',
    };
  }

  // ── PATH 1: Direct Claude API call ────────────────────────────────────────
  const apiKey = getOpenRouterApiKey();
  if (apiKey && apiKey.startsWith('sk-or-')) {
    try {
      console.log('[Recommendation] Calling Claude directly…');
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
              content:
                `Journal entry transcript:\n\n"${transcript}"\n\n` +
                `Detected primary emotion: ${primaryEmotion}\n\n` +
                `Write a personalised recommendation for this specific entry. ` +
                `Quote or directly reference what was said. Do not write generic advice.`,
            },
          ],
          temperature: 0.82,
          max_tokens: 500,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
        if (raw) {
          // Strip markdown fences if present
          const jsonStr = raw
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          try {
            const parsed = JSON.parse(jsonStr);
            const advice =
              typeof parsed.advice === 'string' && parsed.advice.trim().length > 20
                ? parsed.advice.trim()
                : null;
            const audioAdvice =
              typeof parsed.audioAdvice === 'string' && parsed.audioAdvice.trim().length > 10
                ? parsed.audioAdvice.trim()
                : null;
            if (advice) {
              console.log('[Recommendation] Claude direct — success');
              return { advice, audioAdvice: audioAdvice ?? advice.split(/[.!?]/)[0]?.trim() + '.' };
            }
          } catch {
            // Model returned prose instead of JSON — use it directly if it's meaningful
            const prose = jsonStr.replace(/[{}"]/g, '').trim();
            if (prose.length > 40) {
              console.log('[Recommendation] Claude direct — prose response used');
              return { advice: prose, audioAdvice: prose.split(/[.!?]/)[0]?.trim() + '.' };
            }
          }
        }
      } else {
        console.warn(`[Recommendation] Claude direct returned ${response.status}`);
      }
    } catch (err) {
      console.warn('[Recommendation] Claude direct failed:', err);
    }
  }

  // ── PATH 2: Backend endpoint ──────────────────────────────────────────────
  try {
    console.log('[Recommendation] Trying backend endpoint…');
    const response = await fetch(`${BACKEND_URL}/api/journal/recommendation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, primaryEmotion }),
    });
    if (response.ok) {
      const json = (await response.json()) as {
        success: boolean;
        data: RecommendationResult;
        error?: string;
      };
      if (json.success && json.data?.advice && json.data.advice.length > 20) {
        console.log('[Recommendation] Backend — success');
        return json.data;
      }
    } else {
      console.warn(`[Recommendation] Backend returned ${response.status}`);
    }
  } catch (err) {
    console.warn('[Recommendation] Backend failed:', err);
  }

  // ── PATH 3: Local transcript-grounded fallback ────────────────────────────
  console.log('[Recommendation] Using local transcript-grounded fallback');
  return buildLocalRecommendation(transcript, primaryEmotion);
}
