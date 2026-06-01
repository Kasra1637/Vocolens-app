/**
 * Onboarding Screen 3: Name Collection Screen
 *
 * Collects the user's first name immediately after the Personalize
 * Permission screen. The name is persisted in the onboarding store
 * and surfaced as a personalized greeting in later insight screens.
 *
 * Layout mirrors MoodSelectionScreen exactly:
 *  - Fixed height:120 character container at the top
 *  - Content flows downward with a flex:1 spacer at the bottom
 *  - No KeyboardAvoidingView — screen stays locked when keyboard opens
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { tapHaptic, selectHaptic } from "@/lib/haptics";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { OnboardingCTAButton } from "@/components/onboarding/OnboardingCTAButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

// Shared easing curve used across every onboarding screen
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

export function NameCollectionScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setUserName = useOnboardingStore((s) => s.setUserName);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [name, setName] = useState("");
  const inputRef = useRef<TextInput>(null);

  const trimmed = name.trim();
  const isReady = trimmed.length > 0;

  const handleContinue = () => {
    if (!isReady) return;
    playClickSound();
    tapHaptic();
    setUserName(trimmed);
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

          {/* Same column layout as MoodSelectionScreen */}
          <View className="flex-1 px-6 py-3">

            {/* Character — identical container to MoodSelectionScreen */}
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
              className="items-center mb-2"
            >
              <Text
                className="text-center"
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 30,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                How should we call you?
              </Text>
            </Animated.View>

            {/* Subtitle */}
            <Animated.View
              entering={FadeIn.delay(200).duration(900).easing(SOFT)}
              className="items-center mb-6"
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.68)",
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 22,
                  letterSpacing: 0.1,
                  maxWidth: "85%",
                }}
              >
                I'll use it to make your experience feel personal.
              </Text>
            </Animated.View>

            {/* Text input */}
            <Animated.View
              entering={FadeIn.delay(300).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <Pressable onPress={() => inputRef.current?.focus()}>
                <View
                  style={{
                    borderWidth: 2,
                    borderColor: isReady
                      ? "rgba(255,255,255,0.70)"
                      : "rgba(255,255,255,0.28)",
                    borderRadius: 18,
                    backgroundColor: isReady
                      ? "rgba(255,255,255,0.16)"
                      : "rgba(255,255,255,0.08)",
                    paddingHorizontal: 20,
                    paddingVertical: 18,
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (text.trim().length === 1 && name.trim().length === 0) {
                        selectHaptic();
                      }
                    }}
                    placeholder="Enter your first name"
                    placeholderTextColor="rgba(255,255,255,0.38)"
                    autoCorrect={false}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleContinue}
                    // Prevent the keyboard from scrolling/resizing the view
                    scrollEnabled={false}
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                      fontSize: 18,
                      textAlign: "center",
                      padding: 0,
                      margin: 0,
                    }}
                  />
                </View>
              </Pressable>

              {/* Nice-to-meet-you hint */}
              {trimmed.length > 0 && (
                <Animated.View
                  entering={FadeIn.duration(400).easing(SOFT)}
                  style={{ alignItems: "center", marginTop: 10 }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.55)",
                      fontSize: 12,
                      letterSpacing: 0.2,
                    }}
                  >
                    👋 Nice to meet you, {trimmed}!
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* CTA — same position as MoodSelectionScreen's Continue button */}
            <Animated.View
              entering={FadeIn.delay(440).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton
                label="Continue"
                onPress={handleContinue}
                disabled={!isReady}
              />
            </Animated.View>

            {/* Spacer pushes everything up, mirrors other screens */}
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
