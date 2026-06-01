/**
 * Onboarding Value Screen 2 — "What Vocolens Actually Does"
 *
 * Bridges the problem (screen 1) to the solution before the personalisation questions.
 * Uses outcome-first framing: what changes, not what the app does technically.
 * Placed at step 2.
 */

import React from "react";
import { View, Text, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { Mic, Smile, TrendingUp, FlaskConical } from "lucide-react-native";
import { tapHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { useClickSound } from "@/lib/hooks/useClickSound";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

const HOW_IT_WORKS = [
  {
    icon: Mic,
    step: "01",
    headline: "Just speak — no working memory tax",
    body: "Talking is faster than your thoughts. No blank page, no executive-function hurdle.",
  },
  {
    icon: Smile,
    step: "02",
    headline: "AI puts words to the feeling",
    body: "When emotions are hard to name, the science-backed Plutchik model names them for you.",
  },
  {
    icon: TrendingUp,
    step: "03",
    headline: "Your triggers become visible",
    body: "See the patterns behind the overwhelm — privately, on your device, at your pace.",
  },
];

export function NDValueScreen2() {
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
                state="processing"
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
                Speak, we listen
              </Text>
            </Animated.View>

            {/* Subheadline */}
            <Animated.View
              entering={FadeIn.duration(900).delay(200).easing(SOFT)}
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
                No writing. No pressure. No judgment. Just speak — and watch the clarity follow.
              </Text>
            </Animated.View>

            {/* Step cards */}
            <View style={{ gap: 12, marginBottom: 28 }}>
              {HOW_IT_WORKS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Animated.View
                    key={item.step}
                    entering={FadeIn.duration(700).delay(260 + index * 90).easing(SOFT)}
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            color: "rgba(255,255,255,0.40)",
                            fontSize: 10,
                            letterSpacing: 1,
                          }}
                        >
                          STEP {item.step}
                        </Text>
                      </View>
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

            {/* Trust cue — establish credibility early */}
            <Animated.View
              entering={FadeIn.duration(700).delay(540).easing(SOFT)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                marginBottom: 20,
                opacity: 0.7,
              }}
            >
              <FlaskConical size={13} color="#FFFFFF" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                Built on the scientifically validated Plutchik emotion model
              </Text>
            </Animated.View>

            {/* CTA */}
            <Animated.View
              entering={FadeIn.duration(800).delay(680).easing(SOFT)}
            >
              <OnboardingCTAButton
                label="This is what I need"
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
