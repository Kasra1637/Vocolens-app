/**
 * OpenRouter Response Parser
 */

import { buildIntensityLabels } from "./types.ts";
import type {
  EmotionType,
  EmotionScores,
  AnalysisResult,
} from "./types.ts";

export function parseAnalysisJson(
  content: string,
  audioAnalyzed: boolean,
  modelUsed: string
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

  // Compute valence-arousal from emotion scores if not provided by AI
  const computedValence = computeValence(emotionScores);
  const computedArousal = computeArousal(emotionScores);
  const valence = typeof result.valence === "number" ? result.valence : computedValence;
  const arousal = typeof result.arousal === "number" ? result.arousal : computedArousal;
  const distressLevel = validateDistressLevel(result.distressLevel) || computeDistressLevel(valence, arousal);

  console.log(
    `[OpenRouter] Analysis complete | model=${modelUsed} | audioAnalyzed=${audioAnalyzed} | primary=${primaryEmotion} | valence=${valence} | arousal=${arousal} | distress=${distressLevel}`
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
  };
}

// Valence: weighted average of pleasant vs unpleasant emotions
function computeValence(scores: EmotionScores): number {
  const positive = scores.happiness + scores.trust + scores.anticipation + scores.surprise;
  const negative = scores.sadness + scores.fear + scores.anger + scores.disgust;
  const total = positive + negative;
  if (total === 0) return 0;
  return Math.round(((positive - negative) / total) * 100);
}

// Arousal: weighted average of high-arousal vs low-arousal emotions
function computeArousal(scores: EmotionScores): number {
  // High arousal: anger, fear, surprise, anticipation
  // Low arousal: sadness, trust, disgust, happiness (moderate)
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
