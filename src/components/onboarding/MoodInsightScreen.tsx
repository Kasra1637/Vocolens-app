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
import {
  Smiley,
  SmileySad,
  SmileyNervous,
  SmileyBlank,
  Question,
  type Icon as PhosphorIcon,
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
import { ConfirmationInsightCard } from "@/components/onboarding/ConfirmationInsightCard";
import { personalizeInsightText } from "@/lib/onboarding-personalization";

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
  "not-sure": "Not sure",
};

const MOOD_COLORS: Record<MoodType, string> = {
  happy: "#9370DB",
  stressed: "#7B8FB5",
  anxious: "#A78BFA",
  calm: "#8BA888",
  "not-sure": "#9CA3AF",
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

// Icon per mood — mirrors the icons on MoodSelectionScreen so the
// confirmation card echoes the exact icon the user just tapped.
const MOOD_ICONS: Record<MoodType, PhosphorIcon> = {
  happy: Smiley,
  stressed: SmileySad,
  anxious: SmileyNervous,
  calm: SmileyBlank,
  "not-sure": Question,
};

// "not-sure" is deliberately NOT phrased as if the app now knows what the
// user feels — it doesn't, and pretending otherwise would be exactly the
// wrong response to an alexithymia-relevant answer. Instead it validates
// that "I don't know" is a normal, useful starting point, and names the
// concrete mechanism (AI-assisted naming from the words/tone in a voice
// entry) that helps from here — without claiming the feeling is already
// identified.
const MOOD_INSIGHT_MESSAGES: Record<MoodType, string> = {
  happy: "We'll help you notice what lifts you — so you can return to it on purpose",
  stressed: "Soon you'll spot the pressure building early — and head it off sooner",
  anxious: "You'll start to see your triggers coming, instead of being blindsided",
  calm: "We'll help you protect this calm and recognize what creates it",
  "not-sure": "Not knowing is a normal place to start — talk it out, we'll help put a name to it",
};

export function MoodInsightScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
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
    // "not-sure" skips MoodFollowUpScreen (step 7) on the way in — see
    // MoodSelectionScreen.handleContinue — because that screen's question
    // presupposes the user already knows what they're feeling, which
    // doesn't apply here. Skip it symmetrically on the way back too, or
    // the user would land on a follow-up question for a mood ("happy",
    // via DEFAULT_CONFIG) they never actually selected.
    if (selectedMood === "not-sure") {
      setCurrentStep(6);
    } else {
      prevStep();
    }
  };

  const moodLabel = selectedMood ? MOOD_LABELS[selectedMood] : "Your Mood";
  const moodColor = selectedMood
    ? MOOD_COLORS[selectedMood]
    : themeColors.primary;
  const followUpLabel = selectedMoodFollowUp
    ? FOLLOWUP_LABELS[selectedMoodFollowUp]
    : "";
  // First-word-only, mirroring the convention used for the Insights greeting
  // and push notification titles — a user who typed a full name is still
  // addressed by just their first name.
  const firstName = userName ? userName.trim().split(/\s+/)[0] || null : null;
  const insightMessage = personalizeInsightText(
    selectedMood
      ? MOOD_INSIGHT_MESSAGES[selectedMood]
      : "We'll help you understand what you're feeling",
    firstName,
  );

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
                      : selectedMood === "not-sure"
                        ? "This is where we help most"
                        : "Let's build on that calm"}
              </Text>
            </Animated.View>

            {/* Visual Reflection Card */}
            <Animated.View
              entering={FadeIn.delay(250).duration(900).easing(SOFT)}
              style={{ marginBottom: 16 }}
            >
              <ConfirmationInsightCard
                icon={selectedMood ? MOOD_ICONS[selectedMood] : Smiley}
                eyebrow={selectedMood === "not-sure" ? "You said" : "You're feeling"}
                value={moodLabel}
                secondaryLine={
                  followUpLabel ? `Inspired by ${followUpLabel}` : undefined
                }
                insight={insightMessage}
                ringAnimatedStyle={ringAnimatedStyle}
              />
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
