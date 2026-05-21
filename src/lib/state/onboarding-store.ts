/**
 * Onboarding Store
 *
 * Manages onboarding state and user preferences for themes.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeColorType =
  | "lavenderBliss"
  | "softPink"
  | "violetWhisper"
  | "hotPink"
  | "oceanCalm"
  | "darkMode";

export type MoodType = "happy" | "stressed" | "anxious" | "calm";

export type GoalType =
  | "emotional-processing"
  | "goal-setting"
  | "self-reflection"
  | "decision-making";

export type GoalBlockerType =
  | "lack-of-time"
  | "self-doubt"
  | "lack-of-consistency"
  | "not-sure-how";

export type MoodFollowUpType =
  | "small-win"
  | "supportive-friend"
  | "clear-goal"
  | "too-many-tasks"
  | "tight-deadline"
  | "high-expectations"
  | "get-distracted"
  | "feel-overwhelmed"
  | "dont-start"
  | "quiet-moment"
  | "fresh-air"
  | "positive-thought";

export type JournalingGainType =
  | "self-awareness"
  | "clarity"
  | "creative-inspiration";

export type ReflectionFeelingType =
  | "calm-centered"
  | "energized-motivated"
  | "optimistic";

export type JournalingFrequencyType = "once-twice" | "three-five" | "daily";

export type JournalingTopicType =
  | "challenges-growth"
  | "dreams-aspirations"
  | "daily-moments";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface NotificationPreferences {
  days: DayOfWeek[];
  time: string | null;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  gradientStart: string;
  gradientEnd: string;
  accent: string;
  /** 3-stop screen background gradient, safe for all themes including dark mode */
  backgroundGradient: [string, string, string];
  /** 2-stop button gradient */
  buttonGradient: [string, string];
  /** 3-stop mic button gradient for idle state (outer, middle, inner) */
  micButtonGradient: [string, string, string];
  /** Glow/halo color for the button */
  buttonGlowColor: string;
}

export const THEME_COLORS: Record<
  ThemeColorType,
  ThemeColors & { name: string; description: string }
> = {
  lavenderBliss: {
    name: "Lavender Dreams",
    description: "Cheerful lavender vibes",
    primary: "#9370DB",
    secondary: "#9E84EF",
    gradientStart: "#9370DB",
    gradientEnd: "#A79BD8",
    accent: "#9E84EF",
    backgroundGradient: ["#9B7AE0", "#7B52C8", "#4A2A8F"],
    buttonGradient: ["#9370DB", "#7A50C0"],
    micButtonGradient: ["#A79BD8", "#9370DB", "#7A50C0"],
    buttonGlowColor: "rgba(167, 155, 216, 0.5)",
  },
  softPink: {
    name: "Sage & Still",
    description: "Grounded and natural",
    primary: "#6D9B6A",
    secondary: "#9AAC99",
    gradientStart: "#8BA888",
    gradientEnd: "#9AAC99",
    accent: "#9AAC99",
    backgroundGradient: ["#8AB890", "#527A55", "#243A26"],
    buttonGradient: ["#6D9B6A", "#4A6E47"],
    micButtonGradient: ["#9AAC99", "#6D9B6A", "#4A6E47"],
    buttonGlowColor: "rgba(154, 172, 153, 0.5)",
  },
  violetWhisper: {
    name: "Mystic Dreams",
    description: "Deep and mysterious",
    primary: "#7A48B0",
    secondary: "#B784D9",
    gradientStart: "#8B5BBF",
    gradientEnd: "#B784D9",
    accent: "#9370DB",
    backgroundGradient: ["#A670CC", "#7A40B0", "#461878"],
    buttonGradient: ["#7A48B0", "#572E90"],
    micButtonGradient: ["#B784D9", "#7A48B0", "#572E90"],
    buttonGlowColor: "rgba(183, 132, 217, 0.5)",
  },
  hotPink: {
    name: "Bold Heart",
    description: "Confident and expressive",
    primary: "#D44E92",
    secondary: "#DC5792",
    gradientStart: "#CC4882",
    gradientEnd: "#DA5A9A",
    accent: "#9370DB",
    backgroundGradient: ["#D4689A", "#A83870", "#6A1040"],
    buttonGradient: ["#D44E92", "#A32E6A"],
    micButtonGradient: ["#E87AB4", "#D44E92", "#A32E6A"],
    buttonGlowColor: "rgba(218, 90, 154, 0.5)",
  },
  oceanCalm: {
    name: "Ocean Calm",
    description: "Deep and tranquil",
    primary: "#3A75B5",
    secondary: "#5A8FCC",
    gradientStart: "#4A85C2",
    gradientEnd: "#A8C8E8",
    accent: "#9370DB",
    backgroundGradient: ["#6A9FCC", "#3A68A8", "#152848"],
    buttonGradient: ["#3A75B5", "#1A5090"],
    micButtonGradient: ["#5A8FCC", "#3A75B5", "#1A5090"],
    buttonGlowColor: "rgba(90, 143, 204, 0.5)",
  },
  darkMode: {
    name: "Midnight Glow",
    description: "Sleek dark with lavender",
    primary: "#9370DB",
    secondary: "#A78BFA",
    gradientStart: "#252333",
    gradientEnd: "#0F0E1A",
    accent: "#A78BFA",
    backgroundGradient: ["#252333", "#181624", "#0F0E1A"],
    buttonGradient: ["#9370DB", "#6A3FC0"],
    micButtonGradient: ["#A78BFA", "#9370DB", "#6A3FC0"],
    buttonGlowColor: "rgba(167, 139, 250, 0.5)",
  },
};

interface OnboardingState {
  // Onboarding completion
  hasCompletedOnboarding: boolean;
  hasExistingAccount: boolean;

  // User profile
  userName: string | null;

  // User preferences
  selectedTheme: ThemeColorType;
  selectedMood: MoodType | null;
  selectedMoodFollowUp: MoodFollowUpType | null;
  selectedGoal: GoalType | null;
  selectedGoalBlocker: GoalBlockerType | null;
  selectedJournalingGain: JournalingGainType | null;
  selectedReflectionFeeling: ReflectionFeelingType | null;
  selectedJournalingFrequency: JournalingFrequencyType | null;
  selectedJournalingTopic: JournalingTopicType | null;
  notificationPreferences: NotificationPreferences | null;
  selectedTranscriptionLanguage: string;

  // Current onboarding step
  currentStep: number;

  // Actions
  setHasCompletedOnboarding: (completed: boolean) => void;
  setHasExistingAccount: (existing: boolean) => void;
  setUserName: (name: string) => void;
  setSelectedTheme: (theme: ThemeColorType) => void;
  setSelectedMood: (mood: MoodType) => void;
  setSelectedMoodFollowUp: (followUp: MoodFollowUpType) => void;
  setSelectedGoal: (goal: GoalType) => void;
  setSelectedGoalBlocker: (blocker: GoalBlockerType) => void;
  setSelectedJournalingGain: (gain: JournalingGainType) => void;
  setSelectedReflectionFeeling: (feeling: ReflectionFeelingType) => void;
  setJournalingFrequency: (frequency: JournalingFrequencyType) => void;
  setSelectedJournalingTopic: (topic: JournalingTopicType) => void;
  setNotificationPreferences: (preferences: NotificationPreferences) => void;
  setSelectedTranscriptionLanguage: (language: string) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetOnboarding: () => void;
  getThemeColors: () => ThemeColors;
}

const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      hasExistingAccount: false,
      userName: null,
      selectedTheme: "darkMode",
      selectedMood: null,
      selectedMoodFollowUp: null,
      selectedGoal: null,
      selectedGoalBlocker: null,
      selectedJournalingGain: null,
      selectedReflectionFeeling: null,
      selectedJournalingFrequency: null,
      selectedJournalingTopic: null,
      notificationPreferences: null,
      selectedTranscriptionLanguage: "en",
      currentStep: 0,

      setHasCompletedOnboarding: (completed) =>
        set({ hasCompletedOnboarding: completed }),
      setHasExistingAccount: (existing) =>
        set({ hasExistingAccount: existing }),
      setUserName: (name) => set({ userName: name }),
      setSelectedTheme: (theme) => set({ selectedTheme: theme }),
      setSelectedMood: (mood) => set({ selectedMood: mood }),
      setSelectedMoodFollowUp: (followUp) =>
        set({ selectedMoodFollowUp: followUp }),
      setSelectedGoal: (goal) => set({ selectedGoal: goal }),
      setSelectedGoalBlocker: (blocker) =>
        set({ selectedGoalBlocker: blocker }),
      setSelectedJournalingGain: (gain) =>
        set({ selectedJournalingGain: gain }),
      setSelectedReflectionFeeling: (feeling) =>
        set({ selectedReflectionFeeling: feeling }),
      setJournalingFrequency: (frequency) =>
        set({ selectedJournalingFrequency: frequency }),
      setSelectedJournalingTopic: (topic) =>
        set({ selectedJournalingTopic: topic }),
      setNotificationPreferences: (preferences) =>
        set({ notificationPreferences: preferences }),
      setSelectedTranscriptionLanguage: (language) =>
        set({ selectedTranscriptionLanguage: language }),
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () =>
        set((state) => ({ currentStep: Math.min(state.currentStep + 1, 19) })),
      prevStep: () =>
        set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          hasExistingAccount: false,
          userName: null,
          selectedTheme: "darkMode",
          selectedMood: null,
          selectedMoodFollowUp: null,
          selectedGoal: null,
          selectedGoalBlocker: null,
          selectedJournalingGain: null,
          selectedReflectionFeeling: null,
          selectedJournalingFrequency: null,
          selectedJournalingTopic: null,
          notificationPreferences: null,
          selectedTranscriptionLanguage: "en",
          currentStep: 0,
        }),
      getThemeColors: () => {
        const theme = get().selectedTheme;
        return THEME_COLORS[theme];
      },
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 0,
      migrate: (persisted) => persisted as any,
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasExistingAccount: state.hasExistingAccount,
        userName: state.userName,
        selectedTheme: state.selectedTheme,
        selectedMood: state.selectedMood,
        selectedMoodFollowUp: state.selectedMoodFollowUp,
        selectedGoal: state.selectedGoal,
        selectedGoalBlocker: state.selectedGoalBlocker,
        selectedJournalingGain: state.selectedJournalingGain,
        selectedReflectionFeeling: state.selectedReflectionFeeling,
        selectedJournalingFrequency: state.selectedJournalingFrequency,
        selectedJournalingTopic: state.selectedJournalingTopic,
        notificationPreferences: state.notificationPreferences,
        selectedTranscriptionLanguage: state.selectedTranscriptionLanguage,
      }),
    },
  ),
);

export default useOnboardingStore;

// Selector hooks
export const useHasCompletedOnboarding = () =>
  useOnboardingStore((s) => s.hasCompletedOnboarding);
export const useSelectedTheme = () =>
  useOnboardingStore((s) => s.selectedTheme);
export const useSelectedMood = () => useOnboardingStore((s) => s.selectedMood);
export const useSelectedGoal = () => useOnboardingStore((s) => s.selectedGoal);
export const useNotificationPreferences = () =>
  useOnboardingStore((s) => s.notificationPreferences);
export const useCurrentStep = () => useOnboardingStore((s) => s.currentStep);
