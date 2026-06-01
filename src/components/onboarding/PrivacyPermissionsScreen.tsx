/**
 * Onboarding Screen 4: Privacy and Permissions (Redesigned)
 *
 * UX/UI Improvements:
 * - Progress indicator dots
 * - Better card hierarchy and spacing
 * - Enhanced visual feedback
 * - Improved permission toggles with better labels
 * - Clearer privacy feature presentation
 * - Consistent button design with icons
 */

import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { Eye, Database, Lock } from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

// Progress indicator component
function ProgressDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <View className="flex-row items-center justify-center mb-4">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          className={`h-2 rounded-full mx-1 ${
            index === currentStep
              ? "w-8 bg-white"
              : index < currentStep
                ? "w-2 bg-white/60"
                : "w-2 bg-white/30"
          }`}
        />
      ))}
    </View>
  );
}

export function PrivacyPermissionsScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const privacyFeatures = [
    {
      icon: <Database size={22} color="#FFFFFF" />,
      title: "Journal data stays on-device",
      description:
        "Entries, stats & badges are stored locally. No cloud backup, no account server.",
    },
    {
      icon: <Lock size={22} color="#FFFFFF" />,
      title: "PIN-protected access",
      description:
        "Your 4-digit PIN is stored in your device's secure hardware keystore — never in plain text.",
    },
    {
      icon: <Eye size={22} color="#FFFFFF" />,
      title: "No analytics or tracking",
      description:
        "We include zero tracking SDKs. All usage stats are computed locally and never transmitted.",
    },
  ];

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

          <View className="flex-1 px-6 py-3">
            {/* Character at Top */}
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

            {/* Header */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              className="items-center mb-3"
            >
              <Text
                className="text-center mb-1"
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                  lineHeight: 38,
                }}
              >
                Your privacy
              </Text>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: 15,
                  textAlign: "center",
                  fontFamily: "Inter_400Regular",
                }}
              >
                How we protect your privacy
              </Text>
            </Animated.View>

            {/* Privacy Shield Card — all four items together */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              className="rounded-3xl mb-4"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
                paddingHorizontal: 16,
                paddingVertical: 4,
                marginBottom: 16,
              }}
            >
              {privacyFeatures.map((feature, index) => (
                <View
                  key={index}
                  className="flex-row items-center border-b border-white/20"
                  style={{ paddingVertical: 10 }}
                >
                  <View
                    className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                  >
                    {feature.icon}
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        fontSize: 14,
                        marginBottom: 2,
                        fontFamily: "Inter_700Bold",
                      }}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: 12,
                        lineHeight: 17,
                        fontFamily: "Inter_400Regular",
                      }}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>

            {/* Continue Button */}
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
