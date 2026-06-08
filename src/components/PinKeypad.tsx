/**
 * PinKeypad
 *
 * Fully in-app numeric keypad for PIN entry. Replaces the device's native
 * soft-keyboard so PIN flows work identically on iOS and Android without
 * relying on any system dialog or IME.
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
 *
 * • Themed via the active onboarding theme (primary colour, etc.).
 * • OK is only enabled when `value.length === maxLength`.
 * • Smooth press feedback via Animated.Pressable scale-down and haptics.
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

  // OK key is themed in the active primary colour; digit keys are
  // translucent white that adopts the primary tint on press.
  const okEnabledStyle = useMemo(
    () => ({
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
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
    <View style={[styles.wrap, style]} accessibilityRole="keyboardkey">
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

// ── Individual key — its own component so the press animation is isolated ──
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
    scale.value = withTiming(0.92, { duration: 70 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 120 });
  };

  const isBack = label === 'BACK';
  const isOk = label === 'OK';
  const isDigit = !isBack && !isOk;

  // Build the visual content for the key
  const content = (() => {
    if (isBack) return <Delete size={26} color="#FFFFFF" strokeWidth={2} />;
    if (isOk)   return <Check  size={26} color="#FFFFFF" strokeWidth={2.5} />;
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
          isBack && styles.backBtn,
          isOk && styles.okBtn,
          okEnabledStyle ?? null,
          disabled && styles.btnDisabled,
          // subtle tint on press for digit keys
          pressed && isDigit && !disabled && { backgroundColor: `${primaryColor}33` },
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
    maxWidth: 320,
    alignSelf: 'center',
    gap: 14,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
  },
  btnAnimWrap: {
    flex: 1,
  },
  btn: {
    height: 66,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  digitBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  okBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  digitText: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default PinKeypad;
