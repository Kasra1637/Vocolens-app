/**
 * Onboarding: Self Awareness Insight Screen
 *
 * Confirmation screen shown immediately after "I feel most like myself when..."
 * Echoes the user's selection back to them with a study-backed insight.
 * Modelled after JournalingFrequencyInsightScreen.
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
  Headphones,
  Leaf,
  ChatCircle,
  Lightbulb,
  type Icon as PhosphorIcon,
} from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  SelfAwarenessType,
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

// Icon per selection — mirrors the icons on SelfAwarenessScreen.
const SELF_AWARENESS_ICONS: Record<SelfAwarenessType, PhosphorIcon> = {
  "deep-focus": Headphones,
  "no-demands": Leaf,
  "talking-aloud": ChatCircle,
  "after-movement": Lightbulb,
};

// Per-selection titles — this screen previously showed one static "That
// makes total sense" title regardless of the answer; every confirmation
// screen should react to the specific answer the same way (matches the
// Mood/Goal pattern of 4 title variants each).
const SELF_AWARENESS_TITLES: Record<SelfAwarenessType, string> = {
  "deep-focus": "That tracks",
  "no-demands": "That makes total sense",
  "talking-aloud": "We hear that",
  "after-movement": "That's real insight",
};

// Labels mirroring the option labels from SelfAwarenessScreen
const SELF_AWARENESS_LABELS: Record<SelfAwarenessType, string> = {
  "deep-focus":     "Lost in what I love",
  "no-demands":     "No one needs me",
  "talking-aloud":  "Thinking out loud",
  "after-movement": "I understand why",
};

// Personalised insight copy per selection
const SELF_AWARENESS_INSIGHTS: Record<SelfAwarenessType, string> = {
  "deep-focus":
    "Emotions surface most clearly after deep focus. We'll prompt you there",
  "no-demands":
    "Journaling in low-demand moments leads to your most honest entries",
  "talking-aloud":
    "Voice journaling is built for you — just speak and let clarity find you",
  "after-movement":
    "Understanding the 'why' behind your feelings is where real growth starts — we'll help you get there",
};

export function SelfAwarenessInsightScreen() {
  const nextStep      = useOnboardingStore((s) => s.nextStep);
  const prevStep      = useOnboardingStore((s) => s.prevStep);
  const selectedSelfAwareness = useOnboardingStore((s) => s.selectedSelfAwareness);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep   = useOnboardingStore((s) => s.currentStep);
  const themeColors   = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

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

  const selectionLabel = selectedSelfAwareness
    ? SELF_AWARENESS_LABELS[selectedSelfAwareness]
    : "Lost in what I love";

  const title = selectedSelfAwareness
    ? SELF_AWARENESS_TITLES[selectedSelfAwareness]
    : SELF_AWARENESS_TITLES["deep-focus"];

  const insightText = personalizeInsightText(
    selectedSelfAwareness
      ? SELF_AWARENESS_INSIGHTS[selectedSelfAwareness]
      : SELF_AWARENESS_INSIGHTS["deep-focus"],
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
                icon={
                  selectedSelfAwareness
                    ? SELF_AWARENESS_ICONS[selectedSelfAwareness]
                    : Headphones
                }
                eyebrow="You said"
                value={selectionLabel}
                insight={insightText}
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
