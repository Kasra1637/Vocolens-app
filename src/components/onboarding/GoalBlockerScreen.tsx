/**
 * Onboarding Screen: Goal Blocker Screen
 *
 * Dynamically adjusts the question based on the user's selected goal.
 * Trigger-style icons matching InsightsTriggerCard design.
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Clock, Frown, RefreshCw } from "lucide-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  GoalBlockerType,
  GoalType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface BlockerOption {
  id: GoalBlockerType;
  label: string;
  description: string;
  icon: IconComponent;
}

const BLOCKER_OPTIONS: BlockerOption[] = [
  {
    id: "lack-of-time",
    label: "Lack of Time",
    description: "Too busy to dedicate the space",
    icon: Clock,
  },
  {
    id: "self-doubt",
    label: "Self-Doubt",
    description: "Questioning if it will really help",
    icon: Frown,
  },
  {
    id: "lack-of-consistency",
    label: "Lack of Consistency",
    description: "Difficulty sticking with a routine",
    icon: RefreshCw,
  },
];

const GOAL_QUESTION_MAP: Record<GoalType, string> = {
  "emotional-processing":
    "What's keeping you from achieving clarity in your emotional processing?",
  "goal-setting":
    "What's keeping you from achieving clarity in your goal setting?",
  "self-reflection":
    "What's keeping you from achieving clarity in your self-reflection?",
  "decision-making":
    "What's keeping you from achieving clarity in your decision making?",
};

const DEFAULT_QUESTION = "What's been the biggest challenge on your journey?";

export function GoalBlockerScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedGoalBlocker = useOnboardingStore(
    (s) => s.setSelectedGoalBlocker,
  );
  const selectedGoal = useOnboardingStore((s) => s.selectedGoal);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedBlocker, setLocalBlocker] = useState<GoalBlockerType | null>(
    null,
  );

  const question = selectedGoal
    ? GOAL_QUESTION_MAP[selectedGoal]
    : DEFAULT_QUESTION;

  const handleBlockerSelect = (blocker: GoalBlockerType) => {
    playClickSound();
    selectHaptic();
    setLocalBlocker(blocker);
  };

  const handleContinue = () => {
    if (!selectedBlocker) return;
    playClickSound();
    tapHaptic();
    setSelectedGoalBlocker(selectedBlocker);
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character at Top */}
            <View
              className="items-center justify-center"
              style={{ height: 80 }}
            >
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Dynamic Title */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              className="items-center mb-4"
            >
              <Text
                className="text-center mb-1"
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 38,
                }}
              >
                {question}
              </Text>
            </Animated.View>

            {/* Blocker Options */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginTop: 4, marginBottom: 16 }}
            >
              <View className="gap-2">
                {BLOCKER_OPTIONS.map((option, index) => {
                  const isSelected = selectedBlocker === option.id;
                  const Icon = option.icon;
                  return (
                    <Animated.View
                      key={option.id}
                      entering={FadeIn.delay(320 + index * 80).duration(800).easing(SOFT)}
                    >
                      <Pressable
                        onPress={() => handleBlockerSelect(option.id)}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(255,255,255,0.12)",
                          borderWidth: 2,
                          borderColor: isSelected
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.2)",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.15 : 0.08,
                          shadowRadius: 8,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 }}>
                          <View
                            style={{
                              width: 40, height: 40, borderRadius: 12,
                              backgroundColor: "rgba(255,255,255,0.15)",
                              alignItems: "center", justifyContent: "center",
                              marginRight: 14,
                            }}
                          >
                            <Icon size={22} color="#FFFFFF" strokeWidth={2} />
                          </View>
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "#FFFFFF",
                              fontSize: 15,
                            }}
                          >
                            {option.label}
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Continue */}
            <Animated.View
              entering={FadeIn.delay(550).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selectedBlocker}
              />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
