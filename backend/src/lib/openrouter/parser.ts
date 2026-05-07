/**
 * OpenRouter Response Parser
 * 
 * Parses AI JSON, computes blended emotions, ambivalence, and top-3 ranking.
 */

import {
  buildIntensityLabels,
  getIntensityLabel,
  computeBlendedEmotions,
  detectAmbivalence,
} from "./types.ts";
import type {
  EmotionType,
  EmotionScores,
  BlendedEmotionType,
  RankedEmotion,
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

  const validBlended: BlendedEmotionType[] = [
    "love", "submission", "awe", "disapproval",
    "remorse", "contempt", "aggressiveness", "optimism",
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

  // Top-3 Ranked Emotions
  let topThreeEmotions: RankedEmotion[];

  if (
    Array.isArray(result.topThreeEmotions) &&
    result.topThreeEmotions.length > 0
  ) {
    topThreeEmotions = result.topThreeEmotions
      .filter(
        (e: unknown) =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as Record<string, unknown>).emotion === "string" &&
          validEmotions.includes((e as Record<string, unknown>).emotion as EmotionType)
      )
      .slice(0, 3)
      .map((e: Record<string, unknown>, i: number) => ({
        rank: (i + 1) as 1 | 2 | 3,
        emotion: e.emotion as EmotionType,
        score:
          typeof e.score === "number"
            ? Math.max(0, Math.min(100, e.score))
            : emotionScores[e.emotion as EmotionType],
        intensityLabel:
          typeof e.intensityLabel === "string" && e.intensityLabel.trim().length > 0
            ? (e.intensityLabel as string)
            : getIntensityLabel(
                e.emotion as EmotionType,
                emotionScores[e.emotion as EmotionType]
              ),
      }));
  } else {
    topThreeEmotions = (Object.keys(emotionScores) as EmotionType[])
      .map((emotion) => ({
        emotion,
        score: emotionScores[emotion],
        intensityLabel: getIntensityLabel(emotion, emotionScores[emotion]),
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

  // Blended Emotions
  let blendedEmotions: Partial<Record<BlendedEmotionType, number>>;

  if (
    result.blendedEmotions &&
    typeof result.blendedEmotions === "object" &&
    Object.keys(result.blendedEmotions).length > 0
  ) {
    blendedEmotions = {};
    for (const key of validBlended) {
      const v = Number((result.blendedEmotions as Record<string, unknown>)[key]);
      if (!isNaN(v) && v >= 20) {
        blendedEmotions[key] = Math.max(0, Math.min(100, v));
      }
    }
  } else {
    blendedEmotions = computeBlendedEmotions(emotionScores);
  }

  // Ambivalence Flags
  let ambivalenceFlags: [EmotionType, EmotionType][];

  if (
    Array.isArray(result.ambivalenceFlags) &&
    result.ambivalenceFlags.length > 0
  ) {
    ambivalenceFlags = result.ambivalenceFlags
      .filter(
        (pair: unknown) =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          validEmotions.includes(pair[0] as EmotionType) &&
          validEmotions.includes(pair[1] as EmotionType)
      )
      .slice(0, 4) as [EmotionType, EmotionType][];
  } else {
    ambivalenceFlags = detectAmbivalence(emotionScores);
  }

  // Valence / Arousal / Distress
  const computedValence = computeValence(emotionScores);
  const computedArousal = computeArousal(emotionScores);
  const valence = typeof result.valence === "number" ? result.valence : computedValence;
  const arousal = typeof result.arousal === "number" ? result.arousal : computedArousal;
  const distressLevel = validateDistressLevel(result.distressLevel) || computeDistressLevel(valence, arousal);

  console.log(
    `[OpenRouter] Analysis complete | model=${modelUsed} | audioAnalyzed=${audioAnalyzed} | primary=${primaryEmotion} | top3=${topThreeEmotions.map((e) => `${e.emotion}(${e.intensityLabel})`).join(",")} | blended=${Object.keys(blendedEmotions).join(",")} | ambivalent=${ambivalenceFlags.map((p) => `${p[0]}↔${p[1]}`).join(",")} | valence=${valence} | arousal=${arousal} | distress=${distressLevel}`
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
