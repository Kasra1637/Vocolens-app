/**
 * Onboarding Screen 6: Goal Insight Screen
 *
 * Visual reflection screen that shows the user's goal and blocker selection.
 * Matches the "We hear you" (MoodInsightScreen) design style.
 */

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { successHaptic } from "@/lib/haptics";
import { Target } from "lucide-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  GoalType,
  GoalBlockerType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

const GOAL_LABELS: Record<GoalType, string> = {
  "emotional-processing": "Emotional Processing",
  "goal-setting": "Goal Setting",
  "self-reflection": "Self-Reflection",
  "decision-making": "Decision Making",
};

const BLOCKER_LABELS: Record<GoalBlockerType, string> = {
  "lack-of-time": "Lack of Time",
  "self-doubt": "Self-Doubt",
  "lack-of-consistency": "Lack of Consistency",
  "not-sure-how": "Not Sure How",
};

const GOAL_INSIGHT_MESSAGES: Record<GoalType, string> = {
  "emotional-processing":
    "Voice journaling is perfect for processing emotions and finding clarity.",
  "goal-setting": "Daily reflection keeps your goals front and center.",
  "self-reflection":
    "Understanding yourself is the foundation of personal growth.",
  "decision-making":
    "Talking through decisions brings hidden insights to light.",
};

export function GoalInsightScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedGoal = useOnboardingStore((s) => s.selectedGoal);
  const selectedGoalBlocker = useOnboardingStore((s) => s.selectedGoalBlocker);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  // Animation values — matches MoodInsightScreen
  const progressWidth = useSharedValue(0);
  const ringScale = useSharedValue(0);

  useEffect(() => {
    // Gentler animation timing for neurodivergent users
    progressWidth.value = withDelay(
      500,
      withTiming(100, { duration: 1600, easing: Easing.out(Easing.cubic) }),
    );
    ringScale.value = withDelay(
      700,
      withSpring(1, { damping: 18, stiffness: 80 }),
    );
  }, []);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const handleContinue = () => {
    playClickSound();
    successHaptic();
    nextStep();
  };

  const handleBack = () => {
    prevStep();
  };

  const goalLabel = selectedGoal ? GOAL_LABELS[selectedGoal] : "Your Goal";
  const blockerLabel = selectedGoalBlocker
    ? BLOCKER_LABELS[selectedGoalBlocker]
    : "";
  const insightMessage = selectedGoal
    ? GOAL_INSIGHT_MESSAGES[selectedGoal]
    : "";

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
            {/* Character with Success State */}
            <View
              className="items-center justify-center"
              style={{ height: 110 }}
            >
              <EmotionalCompanion
                state="success"
                size={110}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Insight Title */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              className="items-center mb-3"
            >
              <Text
                className="text-center"
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 38,
                }}
              >
                You're on the right path
              </Text>
            </Animated.View>

            {/* Visual Reflection Card — same style as MoodInsightScreen */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <View
                className="rounded-2xl p-6 mx-2"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                }}
              >
                {/* Icon */}
                <View className="items-center mb-6">
                  <Animated.View
                    style={[
                      {
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                      },
                      ringAnimatedStyle,
                    ]}
                  >
                    <Target size={40} color="#FFFFFF" strokeWidth={2} />
                  </Animated.View>
                </View>

                {/* Goal & Blocker Labels */}
                <View className="items-center gap-3">
                  <View
                    className="px-5 py-2 rounded-full"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 18,
                      }}
                    >
                      {goalLabel}
                    </Text>
                  </View>

                  {blockerLabel && (
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: 14,
                      }}
                    >
                      Challenge: {blockerLabel}
                    </Text>
                  )}
                </View>

                {/* Progress Bar — matches MoodInsightScreen */}
                <View className="mt-6">
                  <View
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                  >
                    <Animated.View
                      className="h-full rounded-full"
                      style={[
                        { backgroundColor: "rgba(255, 255, 255, 0.75)" },
                        progressAnimatedStyle,
                      ]}
                    />
                  </View>
                  <Text
                    className="text-center mt-3"
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255, 255, 255, 0.65)",
                      fontSize: 12,
                    }}
                  >
                    Your journey begins now
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Continue Button */}
            <Animated.View
              entering={FadeIn.delay(400).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton label="Continue" onPress={handleContinue} />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
