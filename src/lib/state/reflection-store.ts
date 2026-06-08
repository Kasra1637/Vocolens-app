import { create } from "zustand";
import { EmotionType, DistressLevel, TopicCategory } from "@/lib/types";

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
  /** AI-generated title from /api/analyze — passed through so the entry gets the Worker title */
  aiTitle?: string;
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
