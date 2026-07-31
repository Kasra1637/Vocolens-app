import { create } from "zustand";
import {
  EmotionType,
  EmotionScores,
  EmotionIntensityLabels,
  DistressLevel,
  TopicCategory,
} from "@/lib/types";
import type { RankedEmotion, BlendedEmotionType } from "@/lib/types";

export interface PendingReflection {
  transcript: string;
  audioUri?: string;
  duration: number;
  suggestedEmotions: EmotionType[];
  suggestedBodySensations: string[];
  initialValence: number;
  initialArousal: number;
  initialDistress: DistressLevel;
  conversationTopic?: TopicCategory;
  conversationPrompt?: string;
  /** AI-generated title from /api/analyze */
  aiTitle?: string;

  // ── Full AI analysis fields (previously dropped between analyze and save) ──
  emotionScores?: EmotionScores;
  emotionIntensityLabels?: EmotionIntensityLabels;
  emotionIntensity?: number;
  topics?: string[];
  aiAnalysis?: string;
  aiReflection?: string;
  aiTopThreeEmotions?: RankedEmotion[];
  aiBlendedEmotions?: BlendedEmotionType[];
  aiAmbivalenceFlags?: string[];
}

interface ReflectionState {
  pending: PendingReflection | null;
  setPending: (data: PendingReflection) => void;
  clear: () => void;
}

const useReflectionStore = create<ReflectionState>()((set) => ({
  pending: null,
  setPending: (data) => set({ pending: data }),
  clear: () => set({ pending: null }),
}));

export default useReflectionStore;
