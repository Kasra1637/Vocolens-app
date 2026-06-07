/**
 * OpenRouter Response Parser — Claude 3.7 Sonnet
 * Parses Claude's JSON, with server-side fallbacks for
 * topThreeEmotions, blendedEmotions, and ambivalenceFlags.
 */

import {
  buildIntensityLabels,
  getIntensityLabel,
  BLENDED_EMOTION_LABELS,
  OPPOSITE_EMOTION_PAIRS,
} from "./types.ts";
import type {
  EmotionType,
  EmotionScores,
  AnalysisResult,
  RankedEmotion,
  BlendedEmotionType,
} from "./types.ts";

// ── Server-side fallback compute ──────────────────────────────────────────────

export function computeTopThreeEmotions(scores: EmotionScores): RankedEmotion[] {
  const entries = (Object.entries(scores) as [EmotionType, number][])
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return entries.map(([emotion, score], i) => ({
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
  const flags: string[] = [];

  for (const [e1, e2] of OPPOSITE_EMOTION_PAIRS) {
    if (scores[e1] >= THRESHOLD && scores[e2] >= THRESHOLD) {
      flags.push(`${e1}↔${e2}`);
    }
  }

  return flags;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseAnalysisJson(
  content: string,
  audioAnalyzed: boolean,
  modelUsed: string,
): AnalysisResult {
  const jsonStr = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const result = JSON.parse(jsonStr);

  const validEmotions: EmotionType[] = [
    "happiness", "sadness", "anger", "disgust",
    "fear", "surprise", "trust", "anticipation",
  ];

  const emotionScores: EmotionScores = {
    happiness: 0, sadness: 0, anger: 0, disgust: 0,
    fear: 0, surprise: 0, trust: 0, anticipation: 0,
  };

  if (result.emotionScores && typeof result.emotionScores === "object") {
    for (const emotion of validEmotions) {
      const score = Number(result.emotionScores[emotion]);
      emotionScores[emotion] = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
    }
  }

  const emotions = ((result.emotions ?? []) as string[])
    .filter((e) => validEmotions.includes(e as EmotionType))
    .slice(0, 4) as EmotionType[];
  if (emotions.length === 0) emotions.push("happiness");

  const primaryEmotion: EmotionType = validEmotions.includes(result.primaryEmotion)
    ? (result.primaryEmotion as EmotionType)
    : (emotions[0] ?? "happiness");

  // ── top-3: prefer AI response, fall back to server-side compute ──
  let aiTopThreeEmotions: RankedEmotion[];
  if (Array.isArray(result.topThreeEmotions) && result.topThreeEmotions.length > 0) {
    aiTopThreeEmotions = (result.topThreeEmotions as { emotion: string; score: number; intensityLabel: string }[])
      .filter((r) => validEmotions.includes(r.emotion as EmotionType))
      .slice(0, 3)
      .map((r, i) => ({
        emotion: r.emotion as EmotionType,
        score: Math.max(0, Math.min(100, Number(r.score) || 0)),
        rank: (i + 1) as 1 | 2 | 3,
        intensityLabel: r.intensityLabel || getIntensityLabel(r.emotion as EmotionType, Number(r.score) || 0),
      }));
  } else {
    aiTopThreeEmotions = computeTopThreeEmotions(emotionScores);
  }

  // ── blended: prefer AI response, fall back to server-side compute ──
  const validBlends = Object.keys(BLENDED_EMOTION_LABELS) as BlendedEmotionType[];
  let aiBlendedEmotions: BlendedEmotionType[];
  if (Array.isArray(result.blendedEmotions) && result.blendedEmotions.length > 0) {
    aiBlendedEmotions = (result.blendedEmotions as string[])
      .filter((b) => validBlends.includes(b as BlendedEmotionType))
      .slice(0, 4) as BlendedEmotionType[];
  } else {
    aiBlendedEmotions = computeBlendedEmotions(emotionScores);
  }

  // ── ambivalence: prefer AI response, fall back to server-side compute ──
  let aiAmbivalenceFlags: string[];
  if (Array.isArray(result.ambivalenceFlags) && result.ambivalenceFlags.length > 0) {
    aiAmbivalenceFlags = (result.ambivalenceFlags as string[]).slice(0, 4);
  } else {
    aiAmbivalenceFlags = detectAmbivalence(emotionScores);
  }

  // Valence / arousal
  const computedValence = computeValence(emotionScores);
  const computedArousal = computeArousal(emotionScores);
  const valence = typeof result.valence === "number" ? result.valence : computedValence;
  const arousal = typeof result.arousal === "number" ? result.arousal : computedArousal;
  const distressLevel = validateDistressLevel(result.distressLevel) || computeDistressLevel(valence, arousal);

  console.log(
    `[OpenRouter] Analysis complete | model=${modelUsed} | primary=${primaryEmotion} | blended=${aiBlendedEmotions.join(",")||"none"} | ambivalence=${aiAmbivalenceFlags.join(",")||"none"}`,
  );

  return {
    emotions,
    primaryEmotion,
    emotionIntensity: Math.max(0, Math.min(100, Number(result.emotionIntensity) || 50)),
    emotionScores,
    emotionIntensityLabels: buildIntensityLabels(emotionScores),
    topics: ((result.topics ?? ["reflection"]) as string[]).slice(0, 5),
    analysis: result.analysis || "Your journal entry has been recorded.",
    reflection: result.reflection || "Thank you for sharing. Your feelings are valid.",
    insights: ((result.insights ?? []) as string[]).slice(0, 3),
    confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.8)),
    audioAnalyzed,
    modelUsed,
    valence,
    arousal,
    suggestedBodySensations: Array.isArray(result.suggestedBodySensations)
      ? (result.suggestedBodySensations as string[]).slice(0, 3)
      : [],
    distressLevel,
    aiTopThreeEmotions,
    aiBlendedEmotions,
    aiAmbivalenceFlags,
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function computeValence(scores: EmotionScores): number {
  const positive = scores.happiness + scores.trust + scores.anticipation + scores.surprise;
  const negative = scores.sadness + scores.fear + scores.anger + scores.disgust;
  const total = positive + negative;
  if (total === 0) return 0;
  return Math.round(((positive - negative) / total) * 100);
}

function computeArousal(scores: EmotionScores): number {
  const high = scores.anger + scores.fear + scores.surprise + scores.anticipation;
  const low = scores.sadness + scores.trust + scores.disgust + scores.happiness * 0.5;
  const total = high + low;
  if (total === 0) return 50;
  return Math.round((high / total) * 100);
}

function computeDistressLevel(valence: number, arousal: number): "low" | "moderate" | "high" {
  const distress = (-valence * 0.5) + (arousal * 0.5);
  if (distress > 60) return "high";
  if (distress > 30) return "moderate";
  return "low";
}

function validateDistressLevel(level: unknown): "low" | "moderate" | "high" | null {
  if (level === "low" || level === "moderate" || level === "high") return level;
  return null;
}
