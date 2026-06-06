/**
 * OpenRouter Service — Barrel Export
 *
 * PRIMARY:  openai/gpt-4o-audio-preview  (audio + transcript → prosody + content analysis)
 * FALLBACK: openai/gpt-4o               (transcript only → text analysis)
 */

export {
  OPENROUTER_BASE_URL,
  AUDIO_MODEL,
  TEXT_FALLBACK_MODEL,
  getApiKey,
  isOpenRouterConfigured,
} from "./types.ts";

export type {
  EmotionType,
  EmotionScores,
  EmotionIntensityLabels,
  AnalysisResult,
  WeeklyReflectionEntry,
  WeeklyReflectionResult,
  AICompletionRequest,
} from "./types.ts";

export { getIntensityLabel, buildIntensityLabels } from "./types.ts";

export { AUDIO_SYSTEM_PROMPT, TEXT_SYSTEM_PROMPT } from "./prompts.ts";

export { parseAnalysisJson } from "./parser.ts";

export {
  analyzeTranscript,
  analyzeTranscriptWithRetry,
  generateWeeklyReflection,
  generateAIEmotionalAnalysis,
  generateRecommendation,
} from "./client.ts";

export type { RecommendationResult } from "./client.ts";
