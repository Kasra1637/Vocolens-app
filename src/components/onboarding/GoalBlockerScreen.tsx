/**
 * Onboarding Screen: Goal Blocker Screen
 *
 * Dynamically adjusts the question based on the user's selected goal.
 * Icon circles removed — text-only cards.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { tapHaptic, selectHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS, GoalBlockerType, GoalType } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { useClickSound } from '@/lib/hooks/useClickSound';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';

interface BlockerOption {
  id: GoalBlockerType;
  label: string;
  description: string;
}

const BLOCKER_OPTIONS: BlockerOption[] = [
  { id: 'lack-of-time',        label: 'Lack of Time',         description: 'Too busy to dedicate the space' },
  { id: 'self-doubt',          label: 'Self-Doubt',           description: 'Questioning if it will really help' },
  { id: 'lack-of-consistency', label: 'Lack of Consistency',  description: 'Difficulty sticking with a routine' },
];

const GOAL_QUESTION_MAP: Record<GoalType, string> = {
  'emotional-processing': "What's keeping you from achieving clarity in your emotional processing?",
  'goal-setting':         "What's keeping you from achieving clarity in your goal setting?",
  'self-reflection':      "What's keeping you from achieving clarity in your self-reflection?",
  'decision-making':      "What's keeping you from achieving clarity in your decision making?",
};

const DEFAULT_QUESTION = "What's been the biggest challenge on your journey?";

export function GoalBlockerScreen() {
  const nextStep               = useOnboardingStore((s) => s.nextStep);
  const prevStep               = useOnboardingStore((s) => s.prevStep);
  const setSelectedGoalBlocker = useOnboardingStore((s) => s.setSelectedGoalBlocker);
  const selectedGoal           = useOnboardingStore((s) => s.selectedGoal);
  const selectedTheme          = useOnboardingStore((s) => s.selectedTheme);
  const currentStep            = useOnboardingStore((s) => s.currentStep);
  const themeColors            = THEME_COLORS[selectedTheme];
  const playClickSound         = useClickSound();

  const [selectedBlocker, setLocalBlocker] = useState<GoalBlockerType | null>(null);

  const question = selectedGoal ? GOAL_QUESTION_MAP[selectedGoal] : DEFAULT_QUESTION;

  const handleBlockerSelect = (blocker: GoalBlockerType) => {
    playClickSound();
    selectHaptic();
    setLocalBlocker(blocker);
  };

  const handleContinue = () => {
    if (!selectedBlocker) return;
    playClickSound();
    tapHaptic();
    setSelectedGoalBlocker(selectedBlocker);
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
        <ProgressBar currentStep={currentStep} totalSteps={13} />

        <SafeAreaView className="flex-1">
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View className="flex-1 px-6 py-3">
            {/* Character at Top */}
            <View className="items-center justify-center" style={{ height: 120 }}>
              <EmotionalCompanion state="listening" size={120} themeColor={themeColors.primary} />
            </View>

            {/* Dynamic Title */}
            <Animated.View entering={FadeInUp.delay(400).duration(600)} className="items-center mb-4">
              <Text
                className="text-center mb-1"
                style={{ fontFamily: 'Comfortaa_700Bold', color: '#FFFFFF', fontSize: 22, opacity: 0.92, letterSpacing: 0.2 }}
              >
                {question}
              </Text>
            </Animated.View>

            {/* Blocker Options */}
            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={{ marginTop: 4, marginBottom: 12 }}>
              <View className="gap-2">
                {BLOCKER_OPTIONS.map((option, index) => {
                  const isSelected = selectedBlocker === option.id;
                  return (
                    <Animated.View key={option.id} entering={FadeInDown.delay(700 + index * 80).duration(400)}>
                      <Pressable
                        onPress={() => handleBlockerSelect(option.id)}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                          borderWidth: 2,
                          borderColor: isSelected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.15 : 0.08,
                          shadowRadius: 8,
                        }}
                      >
                        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
                          <Text style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF', fontSize: 15 }}>
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
            <Animated.View entering={FadeInUp.delay(400).duration(500)} className="pb-6">
              <OnboardingCTAButton label="Continue" onPress={handleContinue} disabled={!selectedBlocker} />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
