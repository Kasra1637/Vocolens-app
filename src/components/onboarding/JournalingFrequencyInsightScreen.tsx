/**
 * Onboarding Screen 8: Journaling Frequency Insight Screen
 *
 * Confirms the user's selected journaling frequency and surfaces
 * a study-backed insight about optimal session cadence.
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { tapHaptic, successHaptic } from '@/lib/haptics';
import { BookOpen } from 'lucide-react-native';
import useOnboardingStore, { THEME_COLORS, JournalingFrequencyType } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { useClickSound } from '@/lib/hooks/useClickSound';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';

const FREQUENCY_LABELS: Record<JournalingFrequencyType, string> = {
  'once-twice': '1–2 times a week',
  'three-five': '3–5 times a week',
  'daily': 'Every day',
};

export function JournalingFrequencyInsightScreen() {
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const selectedJournalingFrequency = useOnboardingStore((s) => s.selectedJournalingFrequency);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const progressWidth = useSharedValue(0);
  const ringScale = useSharedValue(0);

  useEffect(() => {
    successHaptic();
    progressWidth.value = withDelay(
      400,
      withTiming(100, { duration: 1400, easing: Easing.out(Easing.cubic) })
    );
    ringScale.value = withDelay(600, withSpring(1, { damping: 12, stiffness: 100 }));
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
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const frequencyLabel = selectedJournalingFrequency
    ? FREQUENCY_LABELS[selectedJournalingFrequency]
    : '3–5 times a week';

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
            {/* Character */}
            <View className="items-center justify-center" style={{ height: 110 }}>
              <EmotionalCompanion
                state="success"
                size={110}
                themeColor={themeColors.primary}
              />
            </View>

            {/* Title */}
            <Animated.View
              entering={FadeInUp.delay(300).duration(600)}
              className="items-center mb-3"
            >
              <Text
                className="text-center"
                style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF', fontSize: 22, opacity: 0.92, letterSpacing: 0.2 }}
              >
                Great choice!
              </Text>
            </Animated.View>

            {/* Insight Card */}
            <Animated.View
              entering={FadeInDown.delay(500).duration(600)}
              style={{ marginBottom: 12 }}
            >
              <View
                className="rounded-3xl p-6 mx-1"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.18)',
                }}
              >
                {/* Icon */}
                <View className="items-center mb-5">
                  <Animated.View
                    style={[
                      {
                        width: 90,
                        height: 90,
                        borderRadius: 45,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      },
                      ringAnimatedStyle,
                    ]}
                  >
                    <BookOpen size={38} color="#FFFFFF" strokeWidth={2} />
                  </Animated.View>
                </View>

                {/* Selected frequency badge */}
                <View className="items-center mb-5">
                  <View
                    className="px-5 py-2 rounded-full"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_700Bold',
                        color: '#FFFFFF',
                        fontSize: 16,
                      }}
                    >
                      {frequencyLabel}
                    </Text>
                  </View>
                </View>

                {/* Study insight */}
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: 14,
                    lineHeight: 22,
                    textAlign: 'center',
                  }}
                >
                  Studies suggest that{' '}
                  <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFFFFF' }}>
                    15–20 minute sessions, 3–4 times per week
                  </Text>
                  , provide optimal relief from stress and anxiety.
                </Text>

                {/* Progress bar */}
                <View className="mt-6">
                  <View
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                  >
                    <Animated.View
                      className="h-full rounded-full"
                      style={[{ backgroundColor: 'rgba(255, 255, 255, 0.75)' }, progressAnimatedStyle]}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Continue */}
            <Animated.View entering={FadeInUp.delay(700).duration(500)} className="pb-6">
              <OnboardingCTAButton label="Continue" onPress={handleContinue} />
            </Animated.View>
            <View style={{ flex: 1 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
