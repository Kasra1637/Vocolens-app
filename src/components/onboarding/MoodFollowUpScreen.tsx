/**
 * Onboarding Screen: Mood Follow-Up Screen
 *
 * Dynamically adjusts the question and answer options based on the user's selected mood.
 * Icon circles removed — text-only cards.
 */

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { tapHaptic, selectHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS, MoodType, MoodFollowUpType } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { useClickSound } from '@/lib/hooks/useClickSound';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';

interface FollowUpOption {
  id: MoodFollowUpType;
  label: string;
}

interface MoodFollowUpConfig {
  question: string;
  options: FollowUpOption[];
}

const MOOD_FOLLOWUP_MAP: Record<MoodType, MoodFollowUpConfig> = {
  happy: {
    question: "What's inspiring you most today?",
    options: [
      { id: 'small-win',        label: 'Small Win' },
      { id: 'supportive-friend', label: 'Supportive Friend' },
      { id: 'clear-goal',        label: 'Clear Goal' },
    ],
  },
  stressed: {
    question: "What's adding pressure to your day?",
    options: [
      { id: 'too-many-tasks',    label: 'Too Many Tasks' },
      { id: 'tight-deadline',    label: 'Tight Deadline' },
      { id: 'high-expectations', label: 'High Expectations' },
    ],
  },
  anxious: {
    question: "What's keeping you from feeling calm right now?",
    options: [
      { id: 'get-distracted',   label: 'Get Distracted' },
      { id: 'feel-overwhelmed', label: 'Feel Overwhelmed' },
      { id: 'dont-start',       label: "Don't Start" },
    ],
  },
  calm: {
    question: "What's bringing you peace today?",
    options: [
      { id: 'quiet-moment',    label: 'Quiet Moment' },
      { id: 'fresh-air',       label: 'Fresh Air' },
      { id: 'positive-thought', label: 'Positive Thought' },
    ],
  },
};

const DEFAULT_CONFIG: MoodFollowUpConfig = MOOD_FOLLOWUP_MAP.happy;

export function MoodFollowUpScreen() {
  const nextStep               = useOnboardingStore((s) => s.nextStep);
  const prevStep               = useOnboardingStore((s) => s.prevStep);
  const setSelectedMoodFollowUp = useOnboardingStore((s) => s.setSelectedMoodFollowUp);
  const selectedMood           = useOnboardingStore((s) => s.selectedMood);
  const selectedTheme          = useOnboardingStore((s) => s.selectedTheme);
  const currentStep            = useOnboardingStore((s) => s.currentStep);
  const themeColors            = THEME_COLORS[selectedTheme];
  const playClickSound         = useClickSound();

  const [selectedOption, setLocalOption] = useState<MoodFollowUpType | null>(null);

  const config = selectedMood ? MOOD_FOLLOWUP_MAP[selectedMood] : DEFAULT_CONFIG;

  const handleOptionSelect = (option: MoodFollowUpType) => {
    playClickSound();
    selectHaptic();
    setLocalOption(option);
  };

  const handleContinue = () => {
    if (!selectedOption) return;
    playClickSound();
    tapHaptic();
    setSelectedMoodFollowUp(selectedOption);
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
                style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 22, opacity: 0.92, letterSpacing: 0.2 }}
              >
                {config.question}
              </Text>
            </Animated.View>

            {/* Options */}
            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={{ marginTop: 4, marginBottom: 12 }}>
              <View className="gap-2">
                {config.options.map((option, index) => {
                  const isSelected = selectedOption === option.id;
                  return (
                    <Animated.View key={option.id} entering={FadeInDown.delay(700 + index * 80).duration(400)}>
                      <Pressable
                        onPress={() => handleOptionSelect(option.id)}
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
              <OnboardingCTAButton label="Continue" onPress={handleContinue} disabled={!selectedOption} />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
