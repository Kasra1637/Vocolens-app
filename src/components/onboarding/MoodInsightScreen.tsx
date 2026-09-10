/**
 * Onboarding Screen 3: Mood Insight Screen
 *
 * Visual reflection screen that shows the user's mood and follow-up
 * selection, with an animated icon ring to foster understanding and
 * motivation. Card visual spec, haptics, and animation timing are shared
 * with the other confirmation/insight screens (Goal, JournalingFrequency,
 * ProcessingStyle, SelfAwareness).
 */

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { Sparkle } from "phosphor-react-native";
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

// Time-of-day aware greeting prefix
function getGreetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Hey";
}

const MOOD_LABELS: Record<MoodType, string> = {
  happy: "Happy",
  stressed: "Stressed",
  anxious: "Anxious",
  calm: "Calm",
};

const MOOD_COLORS: Record<MoodType, string> = {
  happy: "#9370DB",
  stressed: "#7B8FB5",
  anxious: "#A78BFA",
  calm: "#8BA888",
};

const FOLLOWUP_LABELS: Record<MoodFollowUpType, string> = {
  "small-win": "Small Win",
  "supportive-friend": "Supportive Friend",
  "clear-goal": "Clear Goal",
  "too-many-tasks": "Too Many Tasks",
  "tight-deadline": "Tight Deadline",
  "high-expectations": "High Expectations",
  "get-distracted": "Get Distracted",
  "feel-overwhelmed": "Feel Overwhelmed",
  "dont-start": "Don't Start",
  "quiet-moment": "Quiet Moment",
  "fresh-air": "Fresh Air",
  "positive-thought": "Positive Thought",
};

const MOOD_INSIGHT_MESSAGES: Record<MoodType, string> = {
  happy: "We'll help you notice what lifts you — so you can return to it on purpose",
  stressed: "Soon you'll spot the pressure building early — and head it off sooner",
  anxious: "You'll start to see your triggers coming, instead of being blindsided",
  calm: "We'll help you protect this calm and recognise what creates it",
};

export function MoodInsightScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedMood = useOnboardingStore((s) => s.selectedMood);
  const selectedMoodFollowUp = useOnboardingStore(
    (s) => s.selectedMoodFollowUp,
  );
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const userName = useOnboardingStore((s) => s.userName);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  // Animation values
  const ringScale = useSharedValue(0);

  useEffect(() => {
    // Confirming haptic on entry — matches the other confirmation screens
    // (JournalingFrequency/ProcessingStyle/SelfAwareness), which all fire
    // this on mount. Was previously missing here, so this screen felt
    // inconsistent with the others in the same confirmation-screen family.
    successHaptic();
    // Animate ring — higher damping for less bounce
    ringScale.value = withDelay(
      700,
      withSpring(1, { damping: 18, stiffness: 80 }),
    );
  }, []);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const handleContinue = () => {
    playClickSound();
    successHaptic();
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const moodLabel = selectedMood ? MOOD_LABELS[selectedMood] : "Your Mood";
  const moodColor = selectedMood
    ? MOOD_COLORS[selectedMood]
    : themeColors.primary;
  const followUpLabel = selectedMoodFollowUp
    ? FOLLOWUP_LABELS[selectedMoodFollowUp]
    : "";
  const insightMessage = selectedMood
    ? MOOD_INSIGHT_MESSAGES[selectedMood]
    : "";

  return (
    <View className="flex-1">
      <LinearGradient
        colors={themeColors.backgroundGradient}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={25} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character with Success State */}
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

            {/* Confirmation headline */}
            <Animated.View
              entering={FadeIn.delay(80).duration(900).easing(SOFT)}
              style={{ alignItems: "center", marginBottom: 12 }}
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
                {selectedMood === "happy"
                  ? "Let's capture that energy"
                  : selectedMood === "stressed"
                    ? "We hear you"
                    : selectedMood === "anxious"
                      ? "You're not alone in this"
                      : "Let's build on that calm"}
              </Text>
            </Animated.View>

            {/* Visual Reflection Card */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <View
                className="p-6 mx-1"
                style={{
                  borderRadius: 24,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.18)",
                }}
              >
                {/* Mood Icon */}
                <View className="items-center mb-6">
                  <Animated.View
                    style={[
                      {
                        width: 90,
                        height: 90,
                        borderRadius: 45,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                      },
                      ringAnimatedStyle,
                    ]}
                  >
                    <Sparkle size={38} color="#FFFFFF" weight="regular" />
                  </Animated.View>
                </View>

                {/* Selection badge — sizing/spacing matches the other
                    confirmation screens (Goal/JournalingFrequency/
                    ProcessingStyle/SelfAwareness): 16px label, mb-5 */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: "rgba(255, 255, 255, 0.18)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 16,
                      }}
                    >
                      {moodLabel}
                    </Text>
                  </View>

                  {/* Secondary context line — subordinate to the badge, but
                      no longer competing with the insight text below it */}
                  {followUpLabel && (
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 13,
                        marginTop: 10,
                      }}
                    >
                      Inspired by: {followUpLabel}
                    </Text>
                  )}
                </View>

                {/* Insight text — promoted to the same weight/size/opacity
                    as the other confirmation screens (14px, 0.9 opacity,
                    22 line-height) so the actual payoff message is legible
                    instead of the smallest, dimmest text on the card. Every
                    mood has a defined message (see MOOD_INSIGHT_MESSAGES),
                    so no gamified fallback copy is needed here. */}
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign: "center",
                  }}
                >
                  {insightMessage || "We'll help you understand what you're feeling"}
                </Text>
              </View>
            </Animated.View>

            {/* Continue Button */}
            <Animated.View
              entering={FadeIn.delay(400).duration(800).easing(SOFT)}
              className="pb-6"
            >
              <OnboardingCTAButton label="Continue" onPress={handleContinue} />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
