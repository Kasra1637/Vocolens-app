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
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { Mic, FileText, GitBranch, HelpCircle } from "lucide-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  ProcessingStyleType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

// Mirror labels from ProcessingStyleScreen
const PROCESSING_LABELS: Record<ProcessingStyleType, string> = {
  "talking-out":        "Saying it out loud",
  "seeing-written":     "Seeing it written",
  "noticing-patterns":  "Spotting the pattern",
  "right-question":     "The right question",
};

// Personalised insight per selection
const PROCESSING_INSIGHTS: Record<ProcessingStyleType, string> = {
  "talking-out":
    "Hearing your own words creates connections silent thinking never could.",
  "seeing-written":
    "Vocolens transcribes everything — your words in writing, waiting for you.",
  "noticing-patterns":
    "Vocolens tracks emotions and triggers over time so patterns start to appear.",
  "right-question":
    "Vocolens surfaces the question beneath your words and reflects it back.",
};

// Icon per selection — mirrors ProcessingStyleScreen
const PROCESSING_ICONS: Record<
  ProcessingStyleType,
  React.ComponentType<{ size: number; color: string; strokeWidth: number }>
> = {
  "talking-out":        Mic,
  "seeing-written":     FileText,
  "noticing-patterns":  GitBranch,
  "right-question":     HelpCircle,
};

export function ProcessingStyleInsightScreen() {
  const nextStep                = useOnboardingStore((s) => s.nextStep);
  const prevStep                = useOnboardingStore((s) => s.prevStep);
  const selectedProcessingStyle = useOnboardingStore((s) => s.selectedProcessingStyle);
  const selectedTheme           = useOnboardingStore((s) => s.selectedTheme);
  const currentStep             = useOnboardingStore((s) => s.currentStep);
  const themeColors             = THEME_COLORS[selectedTheme];
  const playClickSound          = useClickSound();

  const progressWidth = useSharedValue(0);
  const ringScale     = useSharedValue(0);

  useEffect(() => {
    successHaptic();
    progressWidth.value = withDelay(
      500,
      withTiming(100, { duration: 1800, easing: Easing.out(Easing.cubic) }),
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
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const style   = selectedProcessingStyle ?? "talking-out";
  const label   = PROCESSING_LABELS[style];
  const insight = PROCESSING_INSIGHTS[style];
  const Icon    = PROCESSING_ICONS[style];

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={26} />

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
                We're built for that.
              </Text>
            </Animated.View>

            {/* Insight Card */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  borderRadius: 24,
                  padding: 24,
                  marginHorizontal: 4,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.18)",
                }}
              >
                {/* Icon ring */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
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
                    <Icon size={38} color="#FFFFFF" strokeWidth={2} />
                  </Animated.View>
                </View>

                {/* Selection badge */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: "rgba(255, 255, 255, 0.18)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 16,
                      }}
                    >
                      {label}
                    </Text>
                  </View>
                </View>

                {/* Insight text */}
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign: "center",
                  }}
                >
                  {insight}
                </Text>

                {/* Animated progress bar */}
                <View style={{ marginTop: 24 }}>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      overflow: "hidden",
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                    }}
                  >
                    <Animated.View
                      style={[
                        {
                          height: "100%",
                          borderRadius: 3,
                          backgroundColor: "rgba(255, 255, 255, 0.75)",
                        },
                        progressAnimatedStyle,
                      ]}
                    />
                  </View>
                </View>
              </View>
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
