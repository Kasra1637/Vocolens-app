/**
 * Onboarding Screen 3: Mood Insight Screen
 *
 * Visual reflection screen that shows the user's mood and follow-up selection
 * with animated progress visualization to foster understanding and motivation.
 */

import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";

const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
import { successHaptic } from "@/lib/haptics";
import { Sparkles } from "lucide-react-native";
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
  happy: "Your positivity is a powerful foundation for growth.",
  stressed: "Acknowledging pressure is the first step to managing it.",
  anxious: "Understanding your triggers helps you find calm.",
  calm: "Your peace of mind is a valuable asset to nurture.",
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
  const progressWidth = useSharedValue(0);
  const ringScale = useSharedValue(0);

  useEffect(() => {
    // Animate progress bar — gentler timing for neurodivergent users
    progressWidth.value = withDelay(
      500,
      withTiming(100, { duration: 1600, easing: Easing.out(Easing.cubic) }),
    );
    // Animate ring — higher damping for less bounce
    ringScale.value = withDelay(
      700,
      withSpring(1, { damping: 18, stiffness: 80 }),
    );
  }, []);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const handleContinue = () => {
    playClickSound();
    successHaptic();
    nextStep();
  };

  const handleBack = () => {
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
        <ProgressBar currentStep={currentStep} totalSteps={13} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character with Success State */}
            <View
              className="items-center justify-center"
              style={{ height: 110 }}
            >
              <EmotionalCompanion
                state="success"
                size={110}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Personalized greeting headline */}
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
                  lineHeight: 36,
                }}
              >
                {userName
                  ? `${getGreetingPrefix()}, ${userName} 👋`
                  : `${getGreetingPrefix()} 👋`}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.62)",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 5,
                  lineHeight: 20,
                  letterSpacing: 0.1,
                  maxWidth: 260,
                }}
              >
                You just took the first step toward deeper self-awareness.
              </Text>
            </Animated.View>

            {/* Visual Reflection Card */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 12 }}
            >
              <View
                className="rounded-2xl p-6 mx-2"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                }}
              >
                {/* Mood Icon */}
                <View className="items-center mb-6">
                  <Animated.View
                    style={[
                      {
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                      },
                      ringAnimatedStyle,
                    ]}
                  >
                    <Sparkles size={40} color="#FFFFFF" strokeWidth={2} />
                  </Animated.View>
                </View>

                {/* Mood & Follow-up Labels */}
                <View className="items-center gap-3">
                  <View
                    className="px-5 py-2 rounded-full"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.18)" }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 18,
                      }}
                    >
                      {moodLabel}
                    </Text>
                  </View>

                  {followUpLabel && (
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: 14,
                      }}
                    >
                      Inspired by: {followUpLabel}
                    </Text>
                  )}
                </View>

                {/* Progress Bar Visualization */}
                <View className="mt-6">
                  <View
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                  >
                    <Animated.View
                      className="h-full rounded-full"
                      style={[
                        { backgroundColor: "rgba(255, 255, 255, 0.75)" },
                        progressAnimatedStyle,
                      ]}
                    />
                  </View>
                  <Text
                    className="text-center mt-3"
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255, 255, 255, 0.65)",
                      fontSize: 12,
                    }}
                  >
                    Self-awareness unlocked
                  </Text>
                </View>
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
