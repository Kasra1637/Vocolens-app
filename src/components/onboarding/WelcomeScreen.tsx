/**
 * Onboarding Screen 0: Welcome Screen
 *
 * Two-phase animated headline:
 *  Phase 1: "Welcome to Vocolens" fades + slides up (~700ms)
 *  Phase 2: After ~1.2s delay, first headline fades out and
 *           "Turn your thoughts into clear insights" fades in (~700ms)
 *  Phase 3: CTA button fades in only after second headline is fully visible
 *
 * Uses same background gradient, CTA button, and design patterns
 * as all other onboarding screens.
 */

import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInUp,
  FadeOutUp,
  FadeIn,
  Easing,
} from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { ScreenWrapper } from "@/components/ScreenWrapper";

const EASE_IN_OUT = Easing.inOut(Easing.quad);

const HEADLINE_ENTER = FadeInUp.duration(700).easing(EASE_IN_OUT);
const HEADLINE_EXIT = FadeOutUp.duration(500).easing(EASE_IN_OUT);
const HEADLINE2_ENTER = FadeInUp.duration(700).easing(EASE_IN_OUT);
const CTA_ENTER = FadeIn.duration(500).easing(EASE_IN_OUT);

export function WelcomeScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [phase, setPhase] = useState<1 | 2 | 3>(1);

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

  useEffect(() => {
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 2) {
      const t = setTimeout(() => setPhase(3), 700);
      return () => clearTimeout(t);
    }
  }, [phase]);

  return (
    <ScreenWrapper>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={13} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={false} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 8,
              justifyContent: "center",
            }}
          >
            {/* Headline area — swap between phase 1 and 2 */}
            <View
              style={{
                alignItems: "center",
                minHeight: 120,
                justifyContent: "center",
                marginBottom: 40,
              }}
            >
              {phase === 1 && (
                <Animated.View
                  entering={HEADLINE_ENTER}
                  exiting={HEADLINE_EXIT}
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
              )}

              {phase === 2 && (
                <Animated.View
                  entering={HEADLINE2_ENTER}
                  style={{ alignItems: "center" }}
                >
                  <Text
                    style={{
                      fontFamily: "Fraunces_700Bold",
                      color: "#FFFFFF",
                      fontSize: 28,
                      textAlign: "center",
                      opacity: 0.97,
                      letterSpacing: 0.2,
                      lineHeight: 36,
                    }}
                  >
                    Turn your thoughts into{"\n"}clear insights
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* CTA — only appears after second headline is fully visible */}
            {phase === 3 && (
              <Animated.View entering={CTA_ENTER}>
                <OnboardingCTAButton
                  label="Start Journaling Free"
                  onPress={handleGetStarted}
                  paddingVertical={18}
                  fontSize={18}
                  pulse
                  primaryColor={themeColors.primary}
                />
              </Animated.View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
  );
}
