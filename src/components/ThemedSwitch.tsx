/**
 * ThemedSwitch Component
 * A custom switch that shows white when off and theme color when on
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  trackColor?: string;
  thumbColor?: string;
  disabled?: boolean;
}

export function ThemedSwitch({
  value,
  onValueChange,
  trackColor = '#8BA888',
  thumbColor = '#FFFFFF',
  disabled = false,
}: ThemedSwitchProps) {
  const animatedPosition = useSharedValue(value ? 20 : 0);
  const animatedColor = useSharedValue(value ? 1 : 0);

  const handlePress = () => {
    if (disabled) return;

    const newValue = !value;
    onValueChange(newValue);
    animatedPosition.value = withTiming(newValue ? 20 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
    animatedColor.value = withTiming(newValue ? 1 : 0, {
      duration: 300,
      easing: Easing.inOut(Easing.ease),
    });
  };

  const animatedThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animatedPosition.value }],
    backgroundColor: interpolateColor(
      animatedColor.value,
      [0, 1],
      [trackColor, thumbColor]
    ),
  }));

  const animatedTrackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      animatedColor.value,
      [0, 1],
      ['#FFFFFF', trackColor]
    ),
  }));

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          {
            width: 50,
            height: 28,
            borderRadius: 14,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
            borderWidth: 2,
            borderColor: trackColor,
          },
          animatedTrackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              margin: 0,
            },
            animatedThumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}


