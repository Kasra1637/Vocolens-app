/**
 * Onboarding Screen 0: Welcome Screen
 *
 * Layout:
 *  1. First headline "Welcome to Vocolens"
 *  2. Second headline "Turn your thoughts into clear insights" directly below
 *  3. CTA button "Start Journaling Free" below the second headline
 *
 * Uses same background gradient, CTA button, and design patterns
 * as all other onboarding screens.
 */

import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp, Easing } from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { GlassCard } from "@/lib/glass";

const EASE_IN_OUT = Easing.inOut(Easing.quad);
const HEADLINE_ENTER = FadeInUp.duration(700).easing(EASE_IN_OUT);
const HEADLINE2_ENTER = FadeInUp.duration(700).delay(200).easing(EASE_IN_OUT);
const CTA_ENTER = FadeInUp.duration(500).delay(400).easing(EASE_IN_OUT);

export function WelcomeScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

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

  // Glassmorphic inactive state colors matching LanguageSelectionScreen
  const isDark = selectedTheme === "darkMode";
  const surfaceBg = isDark
    ? "rgba(255,255,255,0.07)"
    : "rgba(255,255,255,0.18)";
  const borderColor = isDark
    ? "rgba(255,255,255,0.15)"
    : "rgba(255,255,255,0.15)";

  return (
    <View className="flex-1">
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={13} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={false} />

          {/* Glassmorphic card container matching LanguageSelectionScreen inactive state */}
          <View
            style={{
              flex: 1,
            }}
          >
            <GlassCard
              primaryColor={themeColors.primary}
              borderRadius={20}
              style={{
                backgroundColor: surfaceBg,
                borderWidth: 1,
                borderColor: borderColor,
                padding: 24,
                flex: 1,
              }}
            >
              {/* All content centered vertically - headlines and button together */}
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {/* First headline */}
                <Animated.View
                  entering={HEADLINE_ENTER}
                  style={{ alignItems: "center" }}
                >
                  <Text
                    style={{
                      fontFamily: "Fraunces_700Bold",
                      color: "#FFFFFF",
                      fontSize: 30,
                      textAlign: "center",
                      opacity: 0.97,
                      letterSpacing: 0.2,
                      lineHeight: 38,
                    }}
                  >
                    Welcome to Vocolens
                  </Text>
                </Animated.View>

                {/* Subheadline - directly below */}
                <Animated.View
                  entering={HEADLINE2_ENTER}
                  style={{ alignItems: "center", marginTop: 8 }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: "rgba(255,255,255,0.75)",
                      fontSize: 16,
                      textAlign: "center",
                      letterSpacing: 0.3,
                      lineHeight: 22,
                    }}
                  >
                    Turn your thoughts into clear insights
                  </Text>
                </Animated.View>

                {/* CTA button - immediately below subheadline */}
                <Animated.View entering={CTA_ENTER} style={{ marginTop: 24 }}>
                  <OnboardingCTAButton
                    label="Start Journaling Free"
                    onPress={handleGetStarted}
                    paddingVertical={18}
                    fontSize={18}
                  />
                </Animated.View>
              </View>
            </GlassCard>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
