/**
 * Onboarding Value Screen 1 — "The Hidden Struggle"
 *
 * Speaks directly to the neurodivergent experience of emotional confusion.
 * Goal: create recognition and resonance before introducing the solution.
 * Placed at step 1, right after the WelcomeScreen.
 */

import React from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { Brain, Frown, Meh, Angry } from "lucide-react-native";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { useClickSound } from "@/lib/hooks/useClickSound";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

const PAIN_POINTS = [
  {
    icon: Brain,
    headline: "Emotions feel like static",
    body: "You know something's off — but naming it is exhausting.",
  },
  {
    icon: Meh,
    headline: "Overwhelm sneaks up",
    body: "Small things pile up unnoticed. Then suddenly, it's too much.",
  },
  {
    icon: Frown,
    headline: "Words don't come easy",
    body: "\"I'm fine\" is simpler than explaining the details to people. So it stays unsaid.",
  },
  {
    icon: Angry,
    headline: "Triggers blindside you",
    body: "The same situations flip your mood — again and again.",
  },
];

export function NDValueScreen1() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const handleContinue = () => {
    playClickSound();
    tapHaptic();
    nextStep();
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
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* Mascot */}
            <Animated.View
              entering={FadeIn.duration(600).delay(80).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 4 }}
            >
              <EmotionalCompanion
                state="processing"
                size={100}
                themeColor={themeColors.primary}
              />
            </Animated.View>

            {/* Headline */}
            <Animated.View
              entering={FadeIn.duration(900).delay(120).easing(SOFT)}
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
                Sound familiar?
              </Text>
            </Animated.View>

            {/* Subheadline */}
            <Animated.View
              entering={FadeIn.duration(900).delay(220).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 24 }}
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
                You're not broken. Your brain just works differently — and that deserves real support, not judgment.
              </Text>
            </Animated.View>

            {/* Pain-point cards */}
            <View style={{ gap: 12, marginBottom: 28 }}>
              {PAIN_POINTS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Animated.View
                    key={item.headline}
                    entering={FadeIn.duration(700).delay(280 + index * 90).easing(SOFT)}
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
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
                        width: 40, height: 40, borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.15)",
                        alignItems: "center", justifyContent: "center",
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
                        {item.headline}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255,255,255,0.70)",
                          fontSize: 13,
                          lineHeight: 20,
                        }}
                      >
                        {item.body}
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
              <OnboardingCTAButton
                label="I know this feeling"
                onPress={handleContinue}
                paddingVertical={17}
                fontSize={17}
              />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
