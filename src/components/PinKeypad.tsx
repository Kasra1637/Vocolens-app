/**
 * PinKeypad
 *
 * Elegant minimal numeric keypad for PIN entry.
 * Clean, borderless design with generous tap targets and subtle feedback.
 *
 * Layout — classic dial pad:
 *   ┌─────┬─────┬─────┐
 *   │  1  │  2  │  3  │
 *   ├─────┼─────┼─────┤
 *   │  4  │  5  │  6  │
 *   ├─────┼─────┼─────┤
 *   │  7  │  8  │  9  │
 *   ├─────┼─────┼─────┤
 *   │  ⌫  │  0  │ OK  │
 *   └─────┴─────┴─────┘
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
import { Delete, Check } from 'lucide-react-native';
import { tapHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

export interface PinKeypadProps {
  /** Current digit string (for OK-enabled gating) */
  value: string;
  /** Required length before OK is enabled (default 4) */
  maxLength?: number;
  /** Globally disable every key (used during async work) */
  disabled?: boolean;
  /** A digit 0-9 was pressed */
  onDigit: (digit: string) => void;
  /** Backspace pressed */
  onBackspace: () => void;
  /** OK pressed (fires only when value.length === maxLength) */
  onSubmit: () => void;
  /** Extra style on the outer wrapper */
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

  const okEnabledStyle = useMemo(
    () => ({
      backgroundColor: `${themeColors.primary}40`,
    }),
    [themeColors.primary],
  );

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
              okEnabledStyle={key === 'OK' && canSubmit ? okEnabledStyle : null}
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
  okEnabledStyle: ViewStyle | null;
  primaryColor: string;
}

function KeypadButton({
  label,
  disabled,
  onPress,
  okEnabledStyle,
  primaryColor,
}: KeypadButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.9, { duration: 80 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  const isBack = label === 'BACK';
  const isOk = label === 'OK';
  const isDigit = !isBack && !isOk;

  const content = (() => {
    if (isBack) return <Delete size={24} color="rgba(255,255,255,0.6)" strokeWidth={1.8} />;
    if (isOk)   return <Check  size={24} color="#FFFFFF" strokeWidth={2.2} />;
    return <Text style={styles.digitText}>{label}</Text>;
  })();

  return (
    <Animated.View style={[styles.btnAnimWrap, animatedStyle]}>
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
        style={({ pressed }) => [
          styles.btn,
          isDigit && styles.digitBtn,
          isBack && styles.actionBtn,
          isOk && styles.actionBtn,
          okEnabledStyle ?? null,
          disabled && styles.btnDisabled,
          pressed && !disabled && styles.btnPressed,
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
    maxWidth: 300,
    alignSelf: 'center',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  btnAnimWrap: {
    flex: 1,
    aspectRatio: 1.4,
    maxHeight: 64,
  },
  btn: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  actionBtn: {
    backgroundColor: 'transparent',
  },
  btnPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  digitText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 30,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default PinKeypad;
