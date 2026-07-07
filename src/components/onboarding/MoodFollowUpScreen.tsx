/**
 * Onboarding Screen: Mood Follow-Up Screen
 *
 * Dynamically adjusts the question and answer options based on the user's selected mood.
 * Trigger-style icons on every option card (matching InsightsTriggerCard design).
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import {
  Trophy,
  Smiley,
  Target,
  ListChecks,
  Clock,
  TrendUp,
  Wind,
  SmileySad,
  SmileyMeh,
  SunHorizon,
  Leaf,
  SmileyWink,
} from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  MoodType,
  MoodFollowUpType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

interface FollowUpOption {
  id: MoodFollowUpType;
  label: string;
  icon: any;
}

interface MoodFollowUpConfig {
  question: string;
  options: FollowUpOption[];
}

const MOOD_FOLLOWUP_MAP: Record<MoodType, MoodFollowUpConfig> = {
  happy: {
    question: "What's inspiring you most today?",
    options: [
      { id: "small-win",        label: "Small win",         icon: Trophy    },
      { id: "supportive-friend",label: "Supportive friend", icon: Smiley    },
      { id: "clear-goal",       label: "Clear goal",        icon: Target    },
    ],
  },
  stressed: {
    question: "What's adding pressure to your day?",
    options: [
      { id: "too-many-tasks",      label: "Too many tasks",      icon: ListChecks },
      { id: "tight-deadline",      label: "Tight deadline",      icon: Clock      },
      { id: "high-expectations",   label: "High expectations",   icon: TrendUp    },
    ],
  },
  anxious: {
    question: "What's keeping you from feeling calm right now?",
    options: [
      { id: "get-distracted",   label: "Get distracted",   icon: Wind      },
      { id: "feel-overwhelmed", label: "Feel overwhelmed", icon: SmileySad },
      { id: "dont-start",       label: "Don't start",      icon: SmileyMeh },
    ],
  },
  calm: {
    question: "What's bringing you peace today?",
    options: [
      { id: "quiet-moment",    label: "Quiet moment",    icon: SunHorizon },
      { id: "fresh-air",       label: "Fresh air",       icon: Leaf       },
      { id: "positive-thought",label: "Positive thought",icon: SmileyWink },
    ],
  },
};

const DEFAULT_CONFIG: MoodFollowUpConfig = MOOD_FOLLOWUP_MAP.happy;

export function MoodFollowUpScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedMoodFollowUp = useOnboardingStore(
    (s) => s.setSelectedMoodFollowUp,
  );
  const selectedMood = useOnboardingStore((s) => s.selectedMood);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedOption, setLocalOption] = useState<MoodFollowUpType | null>(
    null,
  );

  const config = selectedMood
    ? MOOD_FOLLOWUP_MAP[selectedMood]
    : DEFAULT_CONFIG;

  const handleOptionSelect = (option: MoodFollowUpType) => {
    playClickSound();
    selectHaptic();
    setLocalOption(option);
  };

  const handleContinue = () => {
    if (!selectedOption) return;
    playClickSound();
    tapHaptic();
    setSelectedMoodFollowUp(selectedOption);
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

            {/* Dynamic Title */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              className="items-center mb-4"
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
                {config.question}
              </Text>
            </Animated.View>

            {/* Options */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginTop: 4, marginBottom: 16 }}
            >
              <View className="gap-2">
                {config.options.map((option, index) => {
                  const isSelected = selectedOption === option.id;
                  const Icon = option.icon;
                  return (
                    <Animated.View
                      key={option.id}
                      entering={FadeIn.delay(320 + index * 80).duration(800).easing(SOFT)}
                    >
                      <Pressable
                        onPress={() => handleOptionSelect(option.id)}
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
                            {option.label}
                          </Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Continue */}
            <Animated.View
              entering={FadeIn.delay(550).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selectedOption}
                borderColor={themeColors.primary}
              />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
