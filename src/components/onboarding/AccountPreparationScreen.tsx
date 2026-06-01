/**
 * Onboarding Screen: Account Preparation
 *
 * Displays an animated progress bar going from 0% to 100% over 5 seconds.
 * Shows "We are now preparing your account and your entries."
 * Includes the Plutchik Model scientific note above the continue button.
 */

import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { FlaskConical } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

export function AccountPreparationScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [displayPercent, setDisplayPercent] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const progress = useSharedValue(0);

  const updateDisplay = (val: number) => {
    setDisplayPercent(Math.round(val * 100));
  };

  const markComplete = () => {
    setIsComplete(true);
    successHaptic();
  };

  useEffect(() => {
    // Small delay before starting so screen settles
    const timeout = setTimeout(() => {
      progress.value = withTiming(
        1,
        {
          duration: 5000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(markComplete)();
          }
        },
      );
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  // Poll progress value to update display label
  useEffect(() => {
    const interval = setInterval(() => {
      const current = progress.value;
      setDisplayPercent(Math.round(current * 100));
      if (current >= 1) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
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

  // Milestone labels that appear as progress passes them
  const milestones = [
    { label: "Analyzing preferences", threshold: 0.01 },
    { label: "Mapping emotions", threshold: 0.35 },
    { label: "Calibrating insights", threshold: 0.65 },
    { label: "Personalizing journal", threshold: 0.85 },
    { label: "Ready!", threshold: 1.0 },
  ];

  const currentMilestone = milestones.reduce((acc, m) => {
    return displayPercent / 100 >= m.threshold ? m : acc;
  }, milestones[0]);

  return (
    <View className="flex-1">
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        {/* Progress Bar at Top */}
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6">
            {/* Character */}
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

            {/* Header */}
            <Animated.View
              entering={FadeIn.delay(80).duration(700).easing(SOFT)}
              className="items-center mt-4 mb-8"
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: "Fraunces_700Bold",
                  fontSize: 30,
                  textAlign: "center",
                  marginBottom: 10,
                  lineHeight: 38,
                }}
              >
                Almost there
              </Text>
            </Animated.View>

            {/* Progress Card */}
            <Animated.View
              entering={FadeIn.delay(200).duration(700).easing(SOFT)}
              className="rounded-3xl px-5 py-4 mb-4"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
              }}
            >
              {/* Percentage Display */}
              <View className="items-center mb-3">
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Fraunces_700Bold",
                    fontSize: 36,
                    lineHeight: 42,
                    letterSpacing: -1,
                  }}
                >
                  {displayPercent}
                  <Text style={{ fontSize: 20, letterSpacing: 0 }}>%</Text>
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.75)",
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    marginTop: 2,
                    letterSpacing: 0.5,
                  }}
                >
                  {currentMilestone.label}
                </Text>
              </View>

              {/* Progress Bar Track */}
              <View
                style={{
                  height: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <Animated.View
                  style={[
                    {
                      height: "100%",
                      borderRadius: 99,
                      backgroundColor: "#FFFFFF",
                      shadowColor: "#FFFFFF",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                    },
                    barAnimatedStyle,
                  ]}
                />
              </View>

              {/* Milestone dots */}
              <View className="flex-row justify-between mt-2 px-1">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <Text
                    key={tick}
                    style={{
                      color:
                        displayPercent >= tick
                          ? "rgba(255, 255, 255, 0.9)"
                          : "rgba(255, 255, 255, 0.35)",
                      fontFamily: "Inter_400Regular",
                      fontSize: 10,
                    }}
                  >
                    {tick}%
                  </Text>
                ))}
              </View>
            </Animated.View>

            {/* Plutchik Model Note */}
            <Animated.View
              entering={FadeIn.delay(320).duration(700).easing(SOFT)}
              className="rounded-2xl px-5 py-4 mb-4"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              {/* Research Badge */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  alignSelf: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.22)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.4)",
                  borderRadius: 999,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  marginBottom: 14,
                  gap: 9,
                }}
              >
                <FlaskConical size={18} color="#FFFFFF" strokeWidth={2.5} />
                <Text
                  style={{
                    fontFamily: "Fraunces_700Bold",
                    fontSize: 13,
                    color: "#FFFFFF",
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Research Backed
                </Text>
              </View>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.85)",
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                We use the scientifically validated{" "}
                <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                  Plutchik Model
                </Text>
                , which includes eight core emotions and their intensities, to
                ensure a precise and research-based understanding of your
                feelings.
              </Text>
            </Animated.View>

            {/* Continue Button */}
            <Animated.View
              entering={FadeIn.delay(440).duration(600).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!isComplete}
              />
            </Animated.View>
            {/* Spacer */}
            <View className="flex-1" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
