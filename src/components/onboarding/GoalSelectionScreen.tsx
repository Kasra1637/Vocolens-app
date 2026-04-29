/**
 * Onboarding Screen: Goal Selection Screen
 *
 * Goal selection interface — icon circles removed, text-only cards.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { tapHaptic, selectHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS, GoalType } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { useClickSound } from '@/lib/hooks/useClickSound';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';

interface GoalOption {
  id: GoalType;
  label: string;
  description: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  { id: 'emotional-processing', label: 'Emotional Processing', description: 'Process and understand emotions' },
  { id: 'goal-setting',         label: 'Goal Setting',         description: 'Track and achieve your goals' },
  { id: 'self-reflection',      label: 'Self-Reflection',      description: 'Gain deeper self-awareness' },
  { id: 'decision-making',      label: 'Decision Making',      description: 'Make clearer decisions' },
];

export function GoalSelectionScreen() {
  const nextStep        = useOnboardingStore((s) => s.nextStep);
  const prevStep        = useOnboardingStore((s) => s.prevStep);
  const setSelectedGoal = useOnboardingStore((s) => s.setSelectedGoal);
  const selectedTheme   = useOnboardingStore((s) => s.selectedTheme);
  const currentStep     = useOnboardingStore((s) => s.currentStep);
  const themeColors     = THEME_COLORS[selectedTheme];
  const playClickSound  = useClickSound();

  const [selectedGoal, setLocalGoal] = useState<GoalType | null>(null);

  const handleGoalSelect = (goal: GoalType) => {
    playClickSound();
    selectHaptic();
    setLocalGoal(goal);
  };

  const handleContinue = () => {
    if (!selectedGoal) return;
    playClickSound();
    tapHaptic();
    setSelectedGoal(selectedGoal);
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
              <EmotionalCompanion state="idle" size={120} themeColor={themeColors.primary} />
            </View>

            {/* Title */}
            <Animated.View entering={FadeInUp.delay(400).duration(600)} className="items-center mb-4">
              <Text
                className="text-center mb-1"
                style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 22, opacity: 0.92, letterSpacing: 0.2 }}
              >
                What's your main goal for using Vocolens?
              </Text>
            </Animated.View>

            {/* Goal Options */}
            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={{ marginTop: 4, marginBottom: 12 }}>
              <View className="gap-2">
                {GOAL_OPTIONS.map((goal, index) => {
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <Animated.View key={goal.id} entering={FadeInDown.delay(700 + index * 80).duration(400)}>
                      <Pressable
                        onPress={() => handleGoalSelect(goal.id)}
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
                          <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 15 }}>
                            {goal.label}
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
              <OnboardingCTAButton label="Continue" onPress={handleContinue} disabled={!selectedGoal} />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
