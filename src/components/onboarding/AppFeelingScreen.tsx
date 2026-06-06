/**
 * Onboarding: App Feeling Screen
 * "I want Vocolens to be my..."
 */

import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import { Home, CalendarCheck, Heart } from "lucide-react-native";
import useOnboardingStore, {
  THEME_COLORS,
  AppFeelingType,
} from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";

interface Option {
  id: AppFeelingType;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
}

const OPTIONS: Option[] = [
  { id: "quiet-room",         label: "Private space to self discover", icon: Home },
  { id: "understanding-tool", label: "Daily emotional check-in",        icon: CalendarCheck },
  { id: "listening-friend",   label: "Friend, not a fixer",             icon: Heart },
];

export function AppFeelingScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedAppFeeling = useOnboardingStore((s) => s.setSelectedAppFeeling);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selected, setSelected] = useState<AppFeelingType | null>(null);

  const handleSelect = (id: AppFeelingType) => {
    playClickSound();
    selectHaptic();
    setSelected(id);
  };

  const handleContinue = () => {
    if (!selected) return;
    playClickSound();
    tapHaptic();
    setSelectedAppFeeling(selected);
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
                I want Vocolens to be my...
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
                Pick the energy you want when you open this app.
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
                              width: 40, height: 40, borderRadius: 12,
                              backgroundColor: "rgba(255,255,255,0.15)",
                              alignItems: "center", justifyContent: "center",
                              marginRight: 14,
                            }}
                          >
                            <Icon size={22} color="#FFFFFF" strokeWidth={2} />
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
              />
            </Animated.View>

            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
