/**
 * PinKeypad
 *
 * Dark circular keypad matching the reference design:
 * - Solid dark circular keys on the theme background
 * - White digits centered in each circle
 * - Backspace icon (bottom-left), 0 (bottom-center), Check (bottom-right)
 * - Confirm button uses the theme's primary color when enabled
 * - Clean, minimal, no borders
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Backspace, Check } from 'phosphor-react-native';
import { tapHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

export interface PinKeypadProps {
  value: string;
  maxLength?: number;
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  style?: ViewStyle;
}

const ROWS: Array<Array<'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'0'|'BACK'|'OK'>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['BACK', '0', 'OK'],
];

export function PinKeypad({
  value,
  maxLength = 4,
  disabled = false,
  onDigit,
  onBackspace,
  onSubmit,
  style,
}: PinKeypadProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];

  const canSubmit = value.length === maxLength && !disabled;

  const handlePress = useCallback(
    (key: typeof ROWS[number][number]) => {
      if (disabled) return;
      if (key === 'BACK') {
        if (value.length === 0) return;
        tapHaptic();
        onBackspace();
        return;
      }
      if (key === 'OK') {
        if (!canSubmit) return;
        tapHaptic();
        onSubmit();
        return;
      }
      if (value.length >= maxLength) return;
      tapHaptic();
      onDigit(key);
    },
    [disabled, value.length, maxLength, canSubmit, onBackspace, onSubmit, onDigit],
  );

  return (
    <View style={[styles.wrap, style]}>
      {ROWS.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map((key) => (
            <KeypadButton
              key={key}
              label={key}
              disabled={
                disabled ||
                (key === 'BACK' && value.length === 0) ||
                (key === 'OK'   && !canSubmit) ||
                (key !== 'BACK' && key !== 'OK' && value.length >= maxLength)
              }
              onPress={() => handlePress(key)}
              canSubmit={canSubmit}
              primaryColor={themeColors.primary}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Individual key ──────────────────────────────────────────────────────────
interface KeypadButtonProps {
  label: string;
  disabled: boolean;
  onPress: () => void;
  canSubmit: boolean;
  primaryColor: string;
}

function KeypadButton({
  label,
  disabled,
  onPress,
  canSubmit,
  primaryColor,
}: KeypadButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.9, { duration: 60 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 140 });
  };

  const isBack = label === 'BACK';
  const isOk = label === 'OK';
  const isDigit = !isBack && !isOk;

  const content = (() => {
    if (isBack) return <Backspace size={22} color="#FFFFFF" weight="duotone" />;
    if (isOk)   return <Check  size={22} color="#FFFFFF" weight="duotone" />;
    return <Text style={styles.digitText}>{label}</Text>;
  })();

  // OK button gets the primary color when enabled
  const okStyle: ViewStyle | undefined =
    isOk && canSubmit ? { backgroundColor: primaryColor } : undefined;

  return (
    <Animated.View style={[styles.btnWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          isBack ? 'Delete last digit' : isOk ? 'Submit PIN' : `Digit ${label}`
        }
        accessibilityState={{ disabled }}
        style={[
          styles.btn,
          isDigit && styles.digitBtn,
          (isBack || isOk) && styles.actionBtn,
          okStyle,
          disabled && styles.btnDisabled,
        ]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  btnWrap: {
    width: 72,
    height: 72,
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  digitText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
  },
});

export default PinKeypad;
