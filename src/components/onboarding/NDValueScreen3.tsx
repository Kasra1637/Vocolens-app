/**
 * Onboarding Value Screen 3 — "Real Outcomes, Real Lives"
 *
 * Social proof + specific outcome preview before personalisation begins.
 * Shows concrete before/after transformations neurodivergent users care about.
 * Placed at step 3, right before ThemeSelection.
 */

import React from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { Eye, Handshake, BookOpen, BarChart3 } from "lucide-react-native";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { useClickSound } from "@/lib/hooks/useClickSound";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

const OUTCOMES = [
  {
    icon: Eye,
    before: "\"Why am I like this?\"",
    after: "\"I see the pattern now — work stress always hits hardest on Sundays.\"",
  },
  {
    icon: BookOpen,
    before: "\"I can't describe what I'm feeling.\"",
    after: "\"Apprehension — that's exactly it. Not fear, not worry. Apprehension.\"",
  },
  {
    icon: Handshake,
    before: "\"I push people away without meaning to.\"",
    after: "\"When I feel overwhelmed, I go silent. Now I can spot it early.\"",
  },
  {
    icon: BarChart3,
    before: "\"My mood swings feel random.\"",
    after: "\"Social interactions drain me. I need recovery time. That's just me.\"",
  },
];

const STAT_PILLS = [
  { value: "8", label: "core emotions tracked" },
  { value: "60s", label: "to log an entry" },
  { value: "24", label: "emotional intensity levels" },
];

export function NDValueScreen3() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const handleContinue = () => {
    playClickSound();
    tapHaptic();
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
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={true} />

          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 4,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Mascot */}
            <Animated.View
              entering={FadeIn.duration(600).delay(60).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 4 }}
            >
              <EmotionalCompanion
                state="success"
                size={100}
                themeColor={themeColors.primary}
              />
            </Animated.View>

            {/* Headline */}
            <Animated.View
              entering={FadeIn.duration(900).delay(100).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 6 }}
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
                What clarity looks like
              </Text>
            </Animated.View>

            {/* Subheadline */}
            <Animated.View
              entering={FadeIn.duration(900).delay(190).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 20 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: 15,
                  textAlign: "center",
                  lineHeight: 23,
                }}
              >
                These aren't goals. They're real shifts that happen when you understand your own emotional patterns.
              </Text>
            </Animated.View>

            {/* Stat pills */}
            <Animated.View
              entering={FadeIn.duration(700).delay(260).easing(SOFT)}
              style={{
                flexDirection: "row",
                gap: 10,
                marginBottom: 20,
                justifyContent: "center",
              }}
            >
              {STAT_PILLS.map((pill) => (
                <View
                  key={pill.label}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.20)",
                    borderRadius: 16,
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Fraunces_700Bold",
                      color: "#FFFFFF",
                      fontSize: 22,
                      marginBottom: 2,
                    }}
                  >
                    {pill.value}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.60)",
                      fontSize: 10,
                      textAlign: "center",
                      lineHeight: 14,
                    }}
                  >
                    {pill.label}
                  </Text>
                </View>
              ))}
            </Animated.View>

            {/* Before / After cards */}
            <View style={{ gap: 12, marginBottom: 28 }}>
              {OUTCOMES.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Animated.View
                    key={item.before}
                    entering={FadeIn.duration(700).delay(330 + index * 90).easing(SOFT)}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.10)",
                      borderWidth: 1.5,
                      borderColor: "rgba(255,255,255,0.18)",
                      borderRadius: 20,
                      padding: 16,
                    }}
                  >
                    {/* Icon + before */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                      <View
                        style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: "rgba(255,255,255,0.12)",
                          alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={22} color="rgba(255,255,255,0.50)" strokeWidth={2} />
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255,255,255,0.50)",
                          fontSize: 13,
                          lineHeight: 20,
                          fontStyle: "italic",
                          flex: 1,
                          paddingTop: 10,
                        }}
                      >
                        {item.before}
                      </Text>
                    </View>

                    {/* Divider with arrow */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        marginBottom: 10,
                      }}
                    />

                    {/* After */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                      <View
                        style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: "rgba(255,255,255,0.18)",
                          alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={22} color="#FFFFFF" strokeWidth={2} />
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "rgba(255,255,255,0.92)",
                          fontSize: 13,
                          lineHeight: 20,
                          flex: 1,
                          paddingTop: 10,
                        }}
                      >
                        {item.after}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })}
            </View>

            {/* CTA */}
            <Animated.View
              entering={FadeIn.duration(800).delay(740).easing(SOFT)}
            >
              <OnboardingCTAButton
                label="Let's personalise my experience"
                onPress={handleContinue}
                paddingVertical={17}
                fontSize={16}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
