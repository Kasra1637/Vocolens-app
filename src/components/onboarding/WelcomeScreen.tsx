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
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

// Gentle easing — content appears smoothly without jarring movement.
// Optimized for neurodivergent users: slower transitions, reduced visual overwhelm.
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

const HEADLINE_ANIM = FadeIn.duration(900).delay(100).easing(SOFT);
const SUBHEAD_ANIM  = FadeIn.duration(900).delay(250).easing(SOFT);
const BUTTON_ANIM   = FadeIn.duration(800).delay(150).easing(SOFT);

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

  // Staggered reveal sequence — gentler timing for neurodivergent users
  // Shorter waits reduce anticipatory anxiety while still providing visual flow
  useEffect(() => {
    if (currentPhase === "welcome") {
      const t1 = setTimeout(() => setCurrentPhase("insights"), 800);
      return () => clearTimeout(t1);
    }
    if (currentPhase === "insights") {
      const t2 = setTimeout(() => setCurrentPhase("ready"), 500);
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
        <ProgressBar currentStep={currentStep} totalSteps={23} />

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
                  textAlign: "center",
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 40,
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
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 15,
                  textAlign: "center",
                  lineHeight: 23,
                }}
              >
                Turn your thoughts into clear insights
              </Text>
            </Animated.View>

            {/* CTA button */}
            {currentPhase === "ready" && (
              <Animated.View
                entering={BUTTON_ANIM}
                style={{ marginTop: 16, width: "100%" }}
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
