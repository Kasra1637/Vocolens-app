/**
 * Onboarding Screen 4: Journaling Goals Screen
 *
 * "What would you like to gain from your voice journaling?"
 * Placed after Goal Selection in the onboarding flow
 */

import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Eye, Compass, Lightbulb, ArrowRight } from "lucide-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  JournalingGainType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

interface GainOption {
  id: JournalingGainType;
  label: string;
  icon: typeof Eye;
  color: string;
  description: string;
}

const GAIN_OPTIONS: GainOption[] = [
  {
    id: "self-awareness",
    label: "Greater Self-Awareness",
    icon: Eye,
    color: "#9370DB",
    description: "Understand yourself on a deeper level",
  },
  {
    id: "clarity",
    label: "Clarity on Decisions",
    icon: Compass,
    color: "#8B5BBF",
    description: "Think through choices with confidence",
  },
  {
    id: "creative-inspiration",
    label: "Creative Inspiration",
    icon: Lightbulb,
    color: "#FFABAB",
    description: "Spark new ideas and fresh perspectives",
  },
];

export function JournalingGoalsScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedJournalingGain = useOnboardingStore(
    (s) => s.setSelectedJournalingGain,
  );
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedGain, setLocalGain] = useState<JournalingGainType | null>(
    null,
  );

  const handleGainSelect = (gain: JournalingGainType) => {
    playClickSound();
    selectHaptic();
    setLocalGain(gain);
  };

  const handleContinue = () => {
    if (!selectedGain) return;

    playClickSound();
    tapHaptic();
    setSelectedJournalingGain(selectedGain);
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
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={13} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character at Top */}
            <View
              className="items-center justify-center"
              style={{ height: 120 }}
            >
              <EmotionalCompanion
                state="idle"
                size={120}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Title Section */}
            <Animated.View
              entering={FadeIn.delay(400).duration(600).easing(SOFT)}
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
                What would you like to gain from your voice journaling?
              </Text>
            </Animated.View>

            {/* Options */}
            <Animated.View
              entering={FadeIn.delay(600).duration(600).easing(SOFT)}
              style={{ marginTop: 4, marginBottom: 12 }}
            >
              <View className="gap-2">
                {GAIN_OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  const isSelected = selectedGain === option.id;

                  return (
                    <Animated.View
                      key={option.id}
                      entering={FadeIn.delay(700 + index * 80).duration(400).easing(SOFT)}
                    >
                      <Pressable
                        onPress={() => handleGainSelect(option.id)}
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
                        <View className="flex-row items-center p-2.5">
                          <View
                            className="rounded-full items-center justify-center mr-2.5"
                            style={{
                              width: 44,
                              height: 44,
                              backgroundColor: `${option.color}40`,
                              borderWidth: 2,
                              borderColor: "rgba(255, 255, 255, 0.3)",
                            }}
                          >
                            <Icon size={22} color="#FFFFFF" strokeWidth={2.5} />
                          </View>

                          <View className="flex-1">
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
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Bottom Buttons */}
            <Animated.View
              entering={FadeIn.delay(400).duration(500).easing(SOFT)}
              className="pb-6"
            >
              <Pressable
                onPress={handleContinue}
                disabled={!selectedGain}
                className="w-full rounded-2xl active:opacity-70"
                style={{
                  borderWidth: 2,
                  borderColor: selectedGain
                    ? "#FFFFFF"
                    : "rgba(255, 255, 255, 0.3)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: Platform.OS === "android" ? 0 : 8,
                  opacity: selectedGain ? 1 : 0.5,
                }}
              >
                <View className="flex-row items-center justify-center py-4">
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "bold",
                      marginRight: 6,
                      fontFamily: "Inter_700Bold",
                    }}
                  >
                    Continue
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
