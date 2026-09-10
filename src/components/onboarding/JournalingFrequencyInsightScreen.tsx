/**
 * Onboarding Screen 8: Journaling Frequency Insight Screen
 *
 * Confirms the user's selected journaling frequency and surfaces
 * a study-backed insight about optimal session cadence.
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
import {
  Smiley,
  SmileyWink,
  Fire,
  type Icon as PhosphorIcon,
} from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  JournalingFrequencyType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ConfirmationInsightCard } from "@/components/onboarding/ConfirmationInsightCard";
import { getOnboardingFirstName } from "@/lib/onboarding-personalization";

const FREQUENCY_LABELS: Record<JournalingFrequencyType, string> = {
  "once-twice": "1–2 times a week",
  "three-five": "3–5 times a week",
  daily: "Every day",
};

// Per-selection titles — matches the personalized-title pattern already used
// on Mood/Goal (4 title variants each). This screen previously showed one
// static "Great choice!" title regardless of the answer; every confirmation
// screen should react to the specific answer the same way.
const FREQUENCY_TITLES: Record<JournalingFrequencyType, string> = {
  "once-twice": "A steady start",
  "three-five": "Great choice!",
  daily: "That's real commitment",
};

// Icon per frequency — mirrors the icons on the frequency selection screen
// (ReflectionFeelingsScreen).
const FREQUENCY_ICONS: Record<JournalingFrequencyType, PhosphorIcon> = {
  "once-twice": Smiley,
  "three-five": SmileyWink,
  daily: Fire,
};

export function JournalingFrequencyInsightScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedJournalingFrequency = useOnboardingStore(
    (s) => s.selectedJournalingFrequency,
  );
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const ringScale = useSharedValue(0);

  useEffect(() => {
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

  const frequencyLabel = selectedJournalingFrequency
    ? FREQUENCY_LABELS[selectedJournalingFrequency]
    : "3–5 times a week";
  const frequencyTitle = selectedJournalingFrequency
    ? FREQUENCY_TITLES[selectedJournalingFrequency]
    : "Great choice!";
  const firstName = getOnboardingFirstName();

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
            {/* Character */}
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

            {/* Title */}
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
                {frequencyTitle}
              </Text>
            </Animated.View>

            {/* Insight Card */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <ConfirmationInsightCard
                icon={
                  selectedJournalingFrequency
                    ? FREQUENCY_ICONS[selectedJournalingFrequency]
                    : SmileyWink
                }
                eyebrow="You'll check in"
                value={frequencyLabel}
                insight={
                  <>
                    Studies suggest that{" "}
                    <Text
                      style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}
                    >
                      15–20 minute sessions, 3–4 times per week
                    </Text>
                    , provide optimal relief from stress and anxiety
                    {firstName ? `, ${firstName}` : ""}.
                  </>
                }
                ringAnimatedStyle={ringAnimatedStyle}
              />
            </Animated.View>

            {/* Continue */}
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
