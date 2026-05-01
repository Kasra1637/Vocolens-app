import { EmotionScores, DistressLevel } from "./types";

const VALENCE_MAP: Record<string, number> = {
  happiness: 0.9,
  trust: 0.6,
  anticipation: 0.4,
  surprise: 0.1,
  sadness: -0.7,
  anger: -0.6,
  disgust: -0.8,
  fear: -0.8,
};

const AROUSAL_MAP: Record<string, number> = {
  anger: 0.9,
  fear: 0.85,
  surprise: 0.8,
  anticipation: 0.7,
  happiness: 0.5,
  disgust: 0.4,
  sadness: 0.2,
  trust: 0.3,
};

export function valenceFromPlutchik(scores: EmotionScores): number {
  let wSum = 0,
    totalW = 0;
  for (const [e, s] of Object.entries(scores)) {
    const w = s;
    wSum += (VALENCE_MAP[e] ?? 0) * w;
    totalW += w;
  }
  if (totalW === 0) return 0;
  return Math.round((wSum / totalW) * 100);
}

export function arousalFromPlutchik(scores: EmotionScores): number {
  let wSum = 0,
    totalW = 0;
  for (const [e, s] of Object.entries(scores)) {
    const w = s;
    wSum += (AROUSAL_MAP[e] ?? 0.5) * w;
    totalW += w;
  }
  if (totalW === 0) return 50;
  return Math.round((wSum / totalW) * 100);
}

export function distressFromVA(
  valence: number,
  arousal: number,
): DistressLevel {
  const score = -valence * 0.5 + arousal * 0.5;
  if (score > 60) return "high";
  if (score > 30) return "moderate";
  return "low";
}

export function shouldTriggerGrounding(distressLevel: DistressLevel): boolean {
  return distressLevel === "high";
}

export function distressScore(valence: number, arousal: number): number {
  return Math.round(-valence * 0.5 + arousal * 0.5);
}
