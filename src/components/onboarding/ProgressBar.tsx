/**
 * Progress Bar Component
 *
 * Displays progress across onboarding screens
 */

import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="w-full"
      style={{
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${progress}%`,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderTopRightRadius: 3,
          borderBottomRightRadius: 3,
        }}
      />
    </Animated.View>
  );
}
