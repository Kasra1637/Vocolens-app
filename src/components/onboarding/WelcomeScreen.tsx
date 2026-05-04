/**
 * Onboarding Screen 0: Welcome Screen
 *
 * Two-phase animated sequence:
 *  Phase 1: "Welcome to Vocolens" fades in and slides up
 *  Phase 2: After 1.2s, "Turn your thoughts into clear insights" fades in below it
 *  Phase 3: After 0.8s, "Start Journaling Free" button fades in below
 *
 * All elements remain visible after appearing.
 * Optimized for Nordar-style AI voice journaling app.
 */

import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn, Easing } from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

const EASE_OUT_QUAD = Easing.bezier(0.25, 0.46, 0.45, 0.94);

const HEADLINE_ANIM = FadeInDown.duration(800).easing(EASE_OUT_QUAD);
const SUBHEAD_ANIM = FadeInDown.duration(700).delay(200).easing(EASE_OUT_QUAD);
const BUTTON_ANIM = FadeIn.duration(600).delay(100).easing(EASE_OUT_QUAD);

export function WelcomeScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();
  const [currentPhase, setCurrentPhase] = useState<
    "welcome" | "insights" | "ready"
  >("welcome");

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const handleGetStarted = () => {
    playClickSound();
    tapHaptic();
    nextStep();
  };

  // Staggered reveal sequence for Nordar-style polish
  useEffect(() => {
    if (currentPhase === "welcome") {
      const t1 = setTimeout(() => setCurrentPhase("insights"), 1000);
      return () => clearTimeout(t1);
    }
    if (currentPhase === "insights") {
      const t2 = setTimeout(() => setCurrentPhase("ready"), 600);
      return () => clearTimeout(t2);
    }
  }, [currentPhase]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={13} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={false} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Welcome headline */}
            <Animated.View
              entering={HEADLINE_ANIM}
              style={{ alignItems: "center" }}
            >
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 32,
                  fontWeight: "700",
                  textAlign: "center",
                  opacity: 0.98,
                  letterSpacing: 0.3,
                  lineHeight: 42,
                }}
              >
                Welcome to Vocolens
              </Text>
            </Animated.View>

            {/* Insights subtitle */}
            <Animated.View
              entering={SUBHEAD_ANIM}
              style={{ alignItems: "center", marginTop: 12 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 17,
                  fontWeight: "600",
                  textAlign: "center",
                  letterSpacing: 0.2,
                  lineHeight: 26,
                }}
              >
                Turn your thoughts into clear insights
              </Text>
            </Animated.View>

            {/* CTA button */}
            {currentPhase === "ready" && (
              <Animated.View
                entering={BUTTON_ANIM}
                style={{ marginTop: 40, width: "100%" }}
              >
                <OnboardingCTAButton
                  label="Start Journaling Free"
                  onPress={handleGetStarted}
                  paddingVertical={18}
                  fontSize={18}
                />
              </Animated.View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
