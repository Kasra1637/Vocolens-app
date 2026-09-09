/**
 * Onboarding Screen 6: Goal Insight Screen
 *
 * Visual reflection screen that shows the user's goal and blocker selection.
 * Card visual spec, haptics, and animation timing are shared with the other
 * confirmation/insight screens (Mood, JournalingFrequency, ProcessingStyle,
 * SelfAwareness).
 */

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { Target } from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  GoalType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

const GOAL_LABELS: Record<GoalType, string> = {
  "emotional-processing": "Emotional processing",
  "goal-setting": "Finding direction",
  "self-reflection": "Self-reflection",
  "decision-making": "Thinking clearly",
};

const GOAL_INSIGHT_MESSAGES: Record<GoalType, string> = {
  "emotional-processing":
    "In a few weeks, you'll name feelings that used to just feel like static",
  "goal-setting":
    "You'll see which days move you forward — and what quietly holds you back",
  "self-reflection":
    "Patterns you've never noticed will start to show up clearly",
  "decision-making":
    "Talking it out will surface the answer you already had inside",
};

export function GoalInsightScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedGoal = useOnboardingStore((s) => s.selectedGoal);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  // Animation values — matches the other confirmation/insight screens
  const ringScale = useSharedValue(0);

  useEffect(() => {
    // Confirming haptic on entry — matches the other confirmation screens
    // (JournalingFrequency/ProcessingStyle/SelfAwareness), which all fire
    // this on mount. Was previously missing here.
    successHaptic();
    // Gentler animation timing for neurodivergent users
    ringScale.value = withDelay(
      700,
      withSpring(1, { damping: 18, stiffness: 80 }),
    );
  }, []);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const handleContinue = () => {
    playClickSound();
    successHaptic();
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const goalLabel = selectedGoal ? GOAL_LABELS[selectedGoal] : "Your Goal";
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
        <ProgressBar currentStep={currentStep} totalSteps={25} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character with Success State */}
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
                {selectedGoal === "emotional-processing"
                  ? "We'll help you\nprocess this"
                  : selectedGoal === "goal-setting"
                    ? "Clarity is\ncoming"
                    : selectedGoal === "self-reflection"
                      ? "You're already\nbuilding awareness"
                      : "Let's bring\nsome focus"}
              </Text>
            </Animated.View>

            {/* Visual Reflection Card — same style as MoodInsightScreen */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <View
                className="p-6 mx-1"
                style={{
                  borderRadius: 24,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.18)",
                }}
              >
                {/* Icon */}
                <View className="items-center mb-6">
                  <Animated.View
                    style={[
                      {
                        width: 90,
                        height: 90,
                        borderRadius: 45,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                      },
                      ringAnimatedStyle,
                    ]}
                  >
                    <Target size={38} color="#FFFFFF" weight="regular" />
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
                </View>

                <View className="mt-6">
                  <Text
                    className="text-center mt-3"
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255, 255, 255, 0.65)",
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {insightMessage || "Your journey begins now"}
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
