/**
 * Onboarding Screen 7: Journaling Frequency Screen
 *
 * "How often do you journal per week?"
 * Trigger-style icons matching InsightsTriggerCard design.
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Smiley, SmileyWink, Fire } from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  JournalingFrequencyType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

interface FrequencyOption {
  id: JournalingFrequencyType;
  label: string;
  icon: any;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: "once-twice", label: "1–2 times a week",   icon: Smiley     },
  { id: "three-five", label: "3–5 times a week",   icon: SmileyWink },
  { id: "daily",      label: "Every day",           icon: Fire       },
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
            {/* Character */}
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
                How often do you journal per week?
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.70)",
                  fontSize: 14,
                  textAlign: "center",
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                We'll tailor reminders to your rhythm
              </Text>
            </Animated.View>

            {/* Options */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginTop: 4, marginBottom: 16 }}
            >
              <View className="gap-2">
                {FREQUENCY_OPTIONS.map((option, index) => {
                  const isSelected = selectedFrequency === option.id;
                  const Icon = option.icon;

                  return (
                    <Animated.View
                      key={option.id}
                      entering={FadeIn.delay(320 + index * 80).duration(800).easing(SOFT)}
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
                disabled={!selectedFrequency}
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
