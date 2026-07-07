/**
 * Onboarding Screen 2: Mood Selection Screen
 *
 * Mood selection interface — icon circles removed, text-only cards.
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";

// Gentle easing — content appears smoothly, optimized for neurodivergent users.
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Smiley, SmileySad, SmileyNervous, SmileyBlank } from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  MoodType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

interface MoodOption {
  id: MoodType;
  label: string;
  description: string;
  icon: any;
}

const MOOD_OPTIONS: MoodOption[] = [
  { id: "happy",    label: "Happy",   description: "Feeling joyful and positive",         icon: Smiley        },
  { id: "stressed", label: "Stressed",description: "Feeling overwhelmed or pressured",    icon: SmileySad     },
  { id: "anxious",  label: "Anxious", description: "Feeling worried or uneasy",           icon: SmileyNervous },
  { id: "calm",     label: "Calm",    description: "Feeling peaceful and relaxed",        icon: SmileyBlank   },
];

export function MoodSelectionScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedMood = useOnboardingStore((s) => s.setSelectedMood);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const userName = useOnboardingStore((s) => s.userName);
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
    <View className="flex-1">
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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

            {/* Title */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              className="items-center mb-5"
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
                How are you feeling today, {userName || "friend"}?
              </Text>
            </Animated.View>

            {/* Mood Options */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16, marginTop: 4 }}
            >
              <View className="gap-2">
                {MOOD_OPTIONS.map((mood, index) => {
                  const isSelected = selectedMood === mood.id;
                  const Icon = mood.icon;
                  return (
                    <Animated.View
                      key={mood.id}
                      entering={FadeIn.delay(320 + index * 80).duration(800).easing(SOFT)}
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
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.15 : 0.08,
                          shadowRadius: 8,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14 }}>
                          <View
                            style={{
                              width: 44, height: 44, borderRadius: 22,
                              overflow: "hidden",
                              alignItems: "center", justifyContent: "center",
                              marginRight: 14,
                              flexShrink: 0,
                            }}
                          >
                            <LinearGradient
                              colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={{
                                position: "absolute",
                                left: 0, right: 0, top: 0, bottom: 0,
                              }}
                            />
                            <Icon size={24} color="#FFFFFF" weight="duotone" />
                          </View>
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
            </Animated.View>

            {/* Continue — sits directly below mood options */}
            <Animated.View
              entering={FadeIn.delay(600).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selectedMood}
              />
            </Animated.View>

            {/* Remaining space goes to the bottom */}
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
