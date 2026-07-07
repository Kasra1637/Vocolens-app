/**
 * Onboarding: Processing Style Screen
 * "How do you process things best?"
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Microphone, FileText, TreeStructure, Question } from "phosphor-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  ProcessingStyleType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

interface Option {
  id: ProcessingStyleType;
  label: string;
  icon: any;
}

const OPTIONS: Option[] = [
  { id: "talking-out",       label: "Saying it out loud",    icon: Microphone },
  { id: "seeing-written",    label: "Seeing it written",     icon: FileText },
  { id: "noticing-patterns", label: "Spotting the pattern",  icon: TreeStructure },
  { id: "right-question",    label: "The right question",    icon: Question },
];


export function ProcessingStyleScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedProcessingStyle = useOnboardingStore((s) => s.setSelectedProcessingStyle);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selected, setSelected] = useState<ProcessingStyleType | null>(null);

  const handleSelect = (id: ProcessingStyleType) => {
    playClickSound();
    selectHaptic();
    setSelected(id);
  };

  const handleContinue = () => {
    if (!selected) return;
    playClickSound();
    tapHaptic();
    setSelectedProcessingStyle(selected);
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
        <ProgressBar currentStep={currentStep} totalSteps={26} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View style={{ flex: 1, paddingHorizontal: 24, paddingVertical: 12 }}>
            {/* Character */}
            <View style={{ height: 80, alignItems: "center", justifyContent: "center" }}>
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={themeColors.primary}
              />
            </View>


            {/* Title */}
            <Animated.View
              entering={FadeIn.delay(100).duration(900).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 8 }}
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
                How do you process things best?
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
                Everyone's brain organises differently
              </Text>
            </Animated.View>

            {/* Options */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginTop: 12, marginBottom: 16 }}
            >
              <View style={{ gap: 8 }}>
                {OPTIONS.map((option, index) => {
                  const isSelected = selected === option.id;
                  const Icon = option.icon;
                  return (
                    <Animated.View
                      key={option.id}
                      entering={FadeIn.delay(320 + index * 80).duration(800).easing(SOFT)}
                    >
                      <Pressable
                        onPress={() => handleSelect(option.id)}
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(255,255,255,0.12)",
                          borderWidth: 2,
                          borderColor: isSelected
                            ? "rgba(255,255,255,0.6)"
                            : "rgba(255,255,255,0.2)",
                          borderRadius: 16,
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
                              flex: 1,
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
              entering={FadeIn.delay(600).duration(800).easing(SOFT)}
              style={{ paddingBottom: 24 }}
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!selected}
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
