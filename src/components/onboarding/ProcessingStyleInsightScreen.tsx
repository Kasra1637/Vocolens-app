/**
 * Onboarding: Processing Style Insight Screen
 *
 * Confirmation screen shown immediately after "How do you process things best?"
 * Echoes the user's selection back with a personalised insight.
 * Modelled after SelfAwarenessInsightScreen / JournalingFrequencyInsightScreen.
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
import { Microphone, FileText, GitBranch, Question, type Icon as PhosphorIcon } from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  ProcessingStyleType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ConfirmationInsightCard } from "@/components/onboarding/ConfirmationInsightCard";
import {
  getOnboardingFirstName,
  personalizeInsightText,
} from "@/lib/onboarding-personalization";

// Mirror labels from ProcessingStyleScreen
const PROCESSING_LABELS: Record<ProcessingStyleType, string> = {
  "talking-out":        "Saying it out loud",
  "seeing-written":     "Seeing it written",
  "noticing-patterns":  "Spotting the pattern",
  "right-question":     "Asking the right question",
};

// Personalised insight per selection
const PROCESSING_INSIGHTS: Record<ProcessingStyleType, string> = {
  "talking-out":
    "Hearing your own words creates connections silent thinking never could",
  "seeing-written":
    "Vocolens transcribes everything — your words in writing, waiting for you",
  "noticing-patterns":
    "Vocolens tracks emotions and triggers over time so patterns start to appear",
  "right-question":
    "Vocolens surfaces the question beneath your words and reflects it back",
};

// Icon per selection — mirrors ProcessingStyleScreen
const PROCESSING_ICONS: Record<ProcessingStyleType, PhosphorIcon> = {
  "talking-out":        Microphone,
  "seeing-written":     FileText,
  "noticing-patterns":  GitBranch,
  "right-question":     Question,
};

// Per-selection titles — this screen previously showed one static "We're
// built for that" title regardless of the answer; every confirmation screen
// should react to the specific answer the same way (matches the Mood/Goal
// pattern of 4 title variants each).
const PROCESSING_TITLES: Record<ProcessingStyleType, string> = {
  "talking-out":        "We're built for that",
  "seeing-written":     "Your words, written down",
  "noticing-patterns":  "We'll help you see it",
  "right-question":     "We'll ask, so you don't have to",
};

export function ProcessingStyleInsightScreen() {
  const nextStep                = useOnboardingStore((s) => s.nextStep);
  const prevStep                = useOnboardingStore((s) => s.prevStep);
  const selectedProcessingStyle = useOnboardingStore((s) => s.selectedProcessingStyle);
  const selectedTheme           = useOnboardingStore((s) => s.selectedTheme);
  const currentStep             = useOnboardingStore((s) => s.currentStep);
  const themeColors             = THEME_COLORS[selectedTheme];
  const playClickSound          = useClickSound();

  const ringScale     = useSharedValue(0);

  useEffect(() => {
    successHaptic();
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

  const style   = selectedProcessingStyle ?? "talking-out";
  const label   = PROCESSING_LABELS[style];
  const title   = PROCESSING_TITLES[style];
  const Icon    = PROCESSING_ICONS[style];
  const insight = personalizeInsightText(
    PROCESSING_INSIGHTS[style],
    getOnboardingFirstName(),
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={25} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 12 }}>
            {/* Character */}
            <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}>
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Title */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 12 }}
            >
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  textAlign: "center",
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 38,
                }}
              >
                {title}
              </Text>
            </Animated.View>

            {/* Insight Card */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <ConfirmationInsightCard
                icon={Icon}
                eyebrow="You process best by"
                value={label}
                insight={insight}
                ringAnimatedStyle={ringAnimatedStyle}
              />
            </Animated.View>

            {/* Continue */}
            <Animated.View
              entering={FadeIn.delay(400).duration(800).easing(SOFT)}
              style={{ paddingBottom: 24 }}
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
