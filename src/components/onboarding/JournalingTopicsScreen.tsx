/**
 * Onboarding Screen 6: Journaling Topics Screen
 *
 * "What topics do you most enjoy journaling about?"
 * Placed after Reflection Feelings in the onboarding flow
 */

import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { tapHaptic, selectHaptic } from '@/lib/haptics';
import { Mountain, Rocket, BookHeart, ArrowRight } from 'lucide-react-native';
import useOnboardingStore, { THEME_COLORS, JournalingTopicType } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { useClickSound } from '@/lib/hooks/useClickSound';

interface TopicOption {
  id: JournalingTopicType;
  label: string;
  icon: typeof Mountain;
  color: string;
  description: string;
}

const TOPIC_OPTIONS: TopicOption[] = [
  {
    id: 'challenges-growth',
    label: 'Personal Challenges & Growth',
    icon: Mountain,
    color: '#8B5BBF',
    description: 'Overcoming obstacles and evolving',
  },
  {
    id: 'dreams-aspirations',
    label: 'Dreams and Aspirations',
    icon: Rocket,
    color: '#FF69B4',
    description: 'Envisioning your future self',
  },
  {
    id: 'daily-moments',
    label: 'Daily Moments & Details',
    icon: BookHeart,
    color: '#9370DB',
    description: 'Capturing the beauty of everyday life',
  },
];

export function JournalingTopicsScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const setSelectedJournalingTopic = useOnboardingStore((s) => s.setSelectedJournalingTopic);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const [selectedTopic, setLocalTopic] = useState<JournalingTopicType | null>(null);

  const handleTopicSelect = (topic: JournalingTopicType) => {
    playClickSound();
    selectHaptic();
    setLocalTopic(topic);
  };

  const handleContinue = () => {
    if (!selectedTopic) return;

    playClickSound();
    tapHaptic();
    setSelectedJournalingTopic(selectedTopic);
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
              <EmotionalCompanion
                state="idle"
                size={120}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Title Section */}
            <Animated.View
              entering={FadeInUp.delay(400).duration(600)}
              className="items-center mb-4"
            >
              <Text
                className="text-2xl font-bold text-center mb-1"
                style={{ fontFamily: 'Comfortaa_700Bold', color: '#FFFFFF' }}
              >
                What topics do you most enjoy journaling about?
              </Text>
            </Animated.View>

            {/* Options */}
            <Animated.View
              entering={FadeInDown.delay(600).duration(600)}
              style={{ marginTop: 4, marginBottom: 12 }}
            >
              <View className="gap-2">
                {TOPIC_OPTIONS.map((option, index) => {
                  const Icon = option.icon;
                  const isSelected = selectedTopic === option.id;

                  return (
                    <Animated.View
                      key={option.id}
                      entering={FadeInDown.delay(700 + index * 80).duration(400)}
                    >
                      <Pressable
                        onPress={() => handleTopicSelect(option.id)}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(255, 255, 255, 0.25)'
                            : 'rgba(255, 255, 255, 0.12)',
                          borderWidth: 2,
                          borderColor: isSelected
                            ? 'rgba(255, 255, 255, 0.6)'
                            : 'rgba(255, 255, 255, 0.2)',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: isSelected ? 0.15 : 0.08,
                          shadowRadius: 8,
                        }}
                      >
                        <View className="flex-row items-center p-2.5">
                          <View
                            className="rounded-full items-center justify-center mr-2.5"
                            style={{
                              width: 44,
                              height: 44,
                              backgroundColor: `${option.color}40`,
                              borderWidth: 2,
                              borderColor: 'rgba(255, 255, 255, 0.3)',
                            }}
                          >
                            <Icon
                              size={22}
                              color="#FFFFFF"
                              strokeWidth={2.5}
                            />
                          </View>

                          <View className="flex-1">
                            <Text
                              style={{
                                fontFamily: 'Comfortaa_600SemiBold',
                                color: '#FFFFFF',
                                fontSize: 15
                              }}
                            >
                              {option.label}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Bottom Buttons */}
            <Animated.View
              entering={FadeInUp.delay(400).duration(500)}
              className="pb-6"
            >
              <Pressable
                onPress={handleContinue}
                disabled={!selectedTopic}
                className="w-full rounded-2xl active:opacity-70"
                style={{
                  borderWidth: 2,
                  borderColor: selectedTopic ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: Platform.OS === 'android' ? 0 : 8,
                  opacity: selectedTopic ? 1 : 0.5,
                }}
              >
                <View className="flex-row items-center justify-center py-4">
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginRight: 6, fontFamily: 'Inter_700Bold' }}>
                    Continue
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
