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
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { ShieldCheck } from "lucide-react-native";
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
      icon: ShieldCheck,
      title: "Your activities stay here",
      description:
        "Everything stays here. Nothing leaves unless you choose to export it.",
    },
    {
      icon: ShieldCheck,
      title: "No cloud, no servers",
      description:
        "Your journal lives only on this device, never on a server we control.",
    },
    {
      icon: ShieldCheck,
      title: "Locked to you alone",
      description:
        "Face ID, fingerprint, or PIN. Set it up once and keep your journal private.",
    },
    {
      icon: ShieldCheck,
      title: "Hardware-encrypted security",
      description:
        "Your PIN is encrypted in the device's secure hardware-backed keystore.",
    },
    {
      icon: ShieldCheck,
      title: "Delete means delete",
      description:
        "In Settings, Delete Account wipes all your data with no copies kept.",
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
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Character */}
            <Animated.View
              entering={FadeIn.duration(600).delay(80).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 4 }}
            >
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={themeColors.primary}
              />
            </Animated.View>

            {/* Title */}
            <Animated.View
              entering={FadeIn.duration(900).delay(120).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 24 }}
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
                You own your data
              </Text>
            </Animated.View>

            {/* Feature cards — one per row, matching NDValueScreen1 exactly */}
            <View style={{ gap: 12, marginBottom: 28 }}>
              {privacyFeatures.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Animated.View
                    key={item.title}
                    entering={FadeIn.duration(700).delay(280 + index * 90).easing(SOFT)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1.5,
                      borderColor: "rgba(255,255,255,0.18)",
                      borderRadius: 20,
                      padding: 16,
                      gap: 14,
                    }}
                  >
                    {/* Icon badge */}
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={22} color="#FFFFFF" strokeWidth={2} />
                    </View>

                    {/* Text */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 14,
                          marginBottom: 4,
                          lineHeight: 20,
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255,255,255,0.70)",
                          fontSize: 13,
                          lineHeight: 20,
                        }}
                      >
                        {item.description}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* CTA */}
            <Animated.View
              entering={FadeIn.duration(800).delay(700).easing(SOFT)}
            >
              <OnboardingCTAButton label="Continue" onPress={handleContinue} />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
