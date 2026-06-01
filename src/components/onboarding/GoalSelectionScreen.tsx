/**
 * Onboarding Screen: Goal Selection Screen
 *
 * Goal selection with trigger-style icons matching InsightsTriggerCard design.
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Smile, Target, Eye, GitBranch } from "lucide-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  GoalType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface GoalOption {
  id: GoalType;
  label: string;
  description: string;
  icon: IconComponent;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "emotional-processing",
    label: "Emotional Processing",
    description: "Process and understand emotions",
    icon: Smile,
  },
  {
    id: "goal-setting",
    label: "Goal Setting",
    description: "Track and achieve your goals",
    icon: Target,
  },
  {
    id: "self-reflection",
    label: "Self-Reflection",
    description: "Gain deeper self-awareness",
    icon: Eye,
  },
  {
    id: "decision-making",
    label: "Decision Making",
    description: "Make clearer decisions",
    icon: GitBranch,
  },
];

export function GoalSelectionScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedGoal = useOnboardingStore((s) => s.setSelectedGoal);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedGoal, setLocalGoal] = useState<GoalType | null>(null);

  const handleGoalSelect = (goal: GoalType) => {
    playClickSound();
    selectHaptic();
    setLocalGoal(goal);
  };

  const handleContinue = () => {
    if (!selectedGoal) return;
    playClickSound();
    tapHaptic();
    setSelectedGoal(selectedGoal);
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
              style={{ height: 120 }}
            >
              <EmotionalCompanion
                state="idle"
                size={120}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Title */}
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
                What's your main goal for using Vocolens?
              </Text>
            </Animated.View>

            {/* Goal Options */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginTop: 4, marginBottom: 16 }}
            >
              <View className="gap-2">
                {GOAL_OPTIONS.map((goal, index) => {
                  const isSelected = selectedGoal === goal.id;
                  const Icon = goal.icon;
                  return (
                    <Animated.View
                      key={goal.id}
                      entering={FadeIn.delay(320 + index * 80).duration(800).easing(SOFT)}
                    >
                      <Pressable
                        onPress={() => handleGoalSelect(goal.id)}
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
                            {goal.label}
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
              entering={FadeIn.delay(620).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selectedGoal}
              />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
