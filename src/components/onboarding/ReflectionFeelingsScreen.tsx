/**
 * Onboarding Screen 7: Journaling Frequency Screen
 *
 * "How often do you journal per week?"
 * Replaces the previous reflection feelings screen.
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import useOnboardingStore, {
  THEME_COLORS,
  JournalingFrequencyType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { getStaggeredFadeIn } from "@/lib/animations";

interface FrequencyOption {
  id: JournalingFrequencyType;
  label: string;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: "once-twice", label: "1–2 times a week" },
  { id: "three-five", label: "3–5 times a week" },
  { id: "daily", label: "Every day" },
];

export function ReflectionFeelingsScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setJournalingFrequency = useOnboardingStore(
    (s) => s.setJournalingFrequency,
  );
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedFrequency, setLocalFrequency] =
    useState<JournalingFrequencyType | null>(null);

  const handleSelect = (freq: JournalingFrequencyType) => {
    playClickSound();
    selectHaptic();
    setLocalFrequency(freq);
  };

  const handleContinue = () => {
    if (!selectedFrequency) return;
    playClickSound();
    tapHaptic();
    setJournalingFrequency(selectedFrequency);
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

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
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character */}
            <Animated.View
              entering={getStaggeredFadeIn(0)}
              className="items-center justify-center"
              style={{ height: 120 }}
            >
              <EmotionalCompanion
                state="idle"
                size={120}
                themeColor={themeColors.primary}
              />
            </Animated.View>

            {/* Title */}
            <Animated.View
              entering={getStaggeredFadeIn(1)}
              className="items-center mb-4"
            >
              <Text
                className="text-center mb-1"
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 22,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                How often do you journal per week?
              </Text>
            </Animated.View>

            {/* Options */}
            <View style={{ marginTop: 4, marginBottom: 12 }}>
              <View className="gap-2">
                {FREQUENCY_OPTIONS.map((option, index) => {
                  const isSelected = selectedFrequency === option.id;

                  return (
                    <Animated.View
                      key={option.id}
                      entering={getStaggeredFadeIn(2 + index)}
                    >
                      <Pressable
                        onPress={() => handleSelect(option.id)}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255, 255, 255, 0.25)"
                            : "rgba(255, 255, 255, 0.12)",
                          borderWidth: 2,
                          borderColor: isSelected
                            ? "rgba(255, 255, 255, 0.6)"
                            : "rgba(255, 255, 255, 0.2)",
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.15 : 0.08,
                          shadowRadius: 8,
                        }}
                      >
                        <View
                          style={{ paddingHorizontal: 16, paddingVertical: 16 }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "#FFFFFF",
                              fontSize: 15,
                            }}
                          >
                            {option.label}
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* Continue */}
            <Animated.View
              entering={getStaggeredFadeIn(2 + FREQUENCY_OPTIONS.length)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selectedFrequency}
                pulse
                primaryColor={themeColors.primary}
              />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
}
