/**
 * Onboarding Screen: Personalize Permission Screen
 *
 * Inserted between "Pick Your Colors" (ThemeSelectionScreen, step 1)
 * and the Name Collection screen (step 3).
 *
 * Goal: gain user consent to proceed through the personalization setup
 * while clearly reinforcing privacy and security.
 */

import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { Lock } from "lucide-react-native";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

// Consistent easing used across all onboarding screens
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

export function PersonalizePermissionScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const handleContinue = () => {
    playClickSound();
    tapHaptic();
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

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
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 12 }}>
            {/* Character — same container dimensions as MoodSelectionScreen */}
            <View
              style={{
                height: 80,
                alignItems: "center",
                justifyContent: "center",
              }}
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
              style={{ alignItems: "center", marginBottom: 14 }}
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
                Personalize your experience
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View
              entering={FadeIn.delay(230).duration(900).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 40 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 15,
                  textAlign: "center",
                  lineHeight: 24,
                  letterSpacing: 0.1,
                  maxWidth: "85%",
                }}
              >
                Answer a few quick questions so we can tailor everything just
                for you.
              </Text>
            </Animated.View>

            {/* Trust / Privacy badge */}
            <Animated.View
              entering={FadeIn.delay(360).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "rgba(255,255,255,0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.20)",
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                }}
              >
                <Lock size={13} color="rgba(255,255,255,0.80)" strokeWidth={2.2} />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.80)",
                    fontSize: 12.5,
                    letterSpacing: 0.1,
                    flexShrink: 1,
                  }}
                >
                  Your answers are private, encrypted, and never shared.
                </Text>
              </View>
            </Animated.View>

            {/* CTA button */}
            <Animated.View
              entering={FadeIn.delay(480).duration(800).easing(SOFT)}
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
