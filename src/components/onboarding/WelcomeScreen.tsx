/**
 * Onboarding Screen 1: Welcome Screen
 *
 * Conversion-optimised layout:
 * - Hero character + headline
 * - Value-prop bullets (icon + copy)
 * - Social proof badge
 * - Prominent CTA with trust micro-copy
 */

import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Mic, Brain, TrendingUp, Lock, ShieldCheck } from 'lucide-react-native';
import { tapHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { BackButton } from '@/components/onboarding/BackButton';
import { useClickSound } from '@/lib/hooks/useClickSound';

const BULLETS = [
  { icon: Mic,        text: 'Talk for 60 seconds — your journal writes itself',                  color: '#FFFFFF' },
  { icon: Brain,      text: 'AI surfaces emotions & patterns you\'d never notice alone',         color: '#FFFFFF' },
  { icon: TrendingUp, text: 'Watch yourself grow with personalized daily insights',              color: '#FFFFFF' },
  { icon: Lock,       text: 'End-to-end encrypted — only you can read your entries',             color: '#FFFFFF' },
  { icon: ShieldCheck, text: 'Your data is never sold or shared with anyone',                   color: '#FFFFFF' },
];

export function WelcomeScreen() {
  const nextStep      = useOnboardingStore((s) => s.nextStep);
  const prevStep      = useOnboardingStore((s) => s.prevStep);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStep   = useOnboardingStore((s) => s.currentStep);
  const themeColors   = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  const handleBack    = () => { playClickSound(); tapHaptic(); prevStep(); };
  const handleGetStarted = () => { playClickSound(); tapHaptic(); nextStep(); };

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
          <BackButton onPress={handleBack} show={false} />

          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>

            {/* Character */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(600)}
              style={{ alignItems: 'center', marginBottom: 16 }}
            >
              <EmotionalCompanion state="idle" size={120} themeColor={themeColors.primary} />
            </Animated.View>

            {/* Headline */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(600)}
              style={{ alignItems: 'center', marginBottom: 8 }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_700Bold',
                  color: '#FFFFFF',
                  fontSize: 26,
                  textAlign: 'center',
                  opacity: 0.97,
                  letterSpacing: 0.2,
                  lineHeight: 34,
                }}
              >
                Feel heard.{'\n'}Grow every day.
              </Text>
            </Animated.View>

            {/* Tagline */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(600)}
              style={{ alignItems: 'center', marginBottom: 20 }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  color: 'rgba(255,255,255,0.80)',
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 22,
                  letterSpacing: 0.1,
                }}
              >
                Just talk — AI transcribes, analyzes,{'\n'}and helps you grow.
              </Text>
            </Animated.View>

            {/* Feature bullets */}
            <Animated.View
              entering={FadeInUp.delay(350).duration(600)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.18)',
                paddingVertical: 14,
                paddingHorizontal: 18,
                gap: 12,
                marginBottom: 16,
              }}
            >
              {BULLETS.map(({ icon: Icon, text, color }, i) => (
                <React.Fragment key={i}>
                  {i === 3 && (
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 2 }} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        backgroundColor: 'rgba(255,255,255,0.18)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color={color} strokeWidth={2.2} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: 'Inter_400Regular',
                        color: 'rgba(255,255,255,0.90)',
                        fontSize: 13,
                        lineHeight: 19,
                      }}
                    >
                      {text}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </Animated.View>

            {/* CTA */}
            <Animated.View entering={FadeInUp.delay(500).duration(600)}>
              <OnboardingCTAButton
                label="Start Journaling Free"
                onPress={handleGetStarted}
                paddingVertical={18}
                fontSize={18}
              />
            </Animated.View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
