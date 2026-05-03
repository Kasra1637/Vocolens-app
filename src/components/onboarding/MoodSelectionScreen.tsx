/**
 * Onboarding Screen 2: Mood Selection Screen
 *
 * Mood selection interface — icon circles removed, text-only cards.
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import useOnboardingStore, {
  THEME_COLORS,
  MoodType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import { getStaggeredFadeIn } from "@/lib/animations";

interface MoodOption {
  id: MoodType;
  label: string;
  description: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { id: "happy", label: "Happy", description: "Feeling joyful and positive" },
  {
    id: "stressed",
    label: "Stressed",
    description: "Feeling overwhelmed or pressured",
  },
  { id: "anxious", label: "Anxious", description: "Feeling worried or uneasy" },
  { id: "calm", label: "Calm", description: "Feeling peaceful and relaxed" },
];

export function MoodSelectionScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedMood = useOnboardingStore((s) => s.setSelectedMood);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedMood, setLocalMood] = useState<MoodType | null>(null);

  const handleMoodSelect = (mood: MoodType) => {
    playClickSound();
    selectHaptic();
    setLocalMood(mood);
  };

  const handleContinue = () => {
    if (!selectedMood) return;
    playClickSound();
    tapHaptic();
    setSelectedMood(selectedMood);
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
            {/* Character at Top */}
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
              className="items-center mb-5"
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
                How are you feeling today?
              </Text>
            </Animated.View>

            {/* Mood Options */}
            <View style={{ marginBottom: 16 }}>
              <View className="gap-2">
                {MOOD_OPTIONS.map((mood, index) => {
                  const isSelected = selectedMood === mood.id;
                  return (
                    <Animated.View
                      key={mood.id}
                      entering={getStaggeredFadeIn(2 + index)}
                    >
                      <Pressable
                        onPress={() => handleMoodSelect(mood.id)}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(255,255,255,0.12)",
                          borderWidth: 2,
                          borderColor: isSelected
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.2)",
                          shadowColor: themeColors.primary,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.25 : 0.08,
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
                            {mood.label}
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* Continue — sits directly below mood options */}
            <Animated.View
              entering={getStaggeredFadeIn(2 + MOOD_OPTIONS.length)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selectedMood}
                pulse
                primaryColor={themeColors.primary}
              />
            </Animated.View>

            {/* Remaining space goes to the bottom */}
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
  );
}
