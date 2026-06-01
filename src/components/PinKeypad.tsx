/**
 * PinKeypad
 *
 * Reusable 4-digit PIN keypad that renders a standard phone-layout numeric
 * grid (1-2-3 / 4-5-6 / 7-8-9 / ·-0-⌫).  Designed to be embedded inside
 * full-screen auth flows so it uses native layout rather than a Modal overlay.
 *
 * Props
 * ─────
 * pin          Current in-progress PIN string (0-4 digits)
 * onDigit      Called with the digit string when a key is pressed
 * onDelete     Called when the backspace key is pressed
 * disabled     Dims the pad and ignores presses
 * errorShake   When true the dot row plays a shake animation (reset to false
 *              after ~600 ms by the parent to allow re-triggering)
 * themeColor   Accent colour driven by the user's selected app theme
 * isDark       Adjust text/background contrast for dark-mode hosts
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Delete } from 'lucide-react-native';
import { tapHaptic, errorHaptic } from '@/lib/haptics';

interface PinKeypadProps {
  pin: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  errorShake?: boolean;
  themeColor: string;
  isDark?: boolean;
}

const PAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PinKeypad({
  pin,
  onDigit,
  onDelete,
  disabled = false,
  errorShake = false,
  themeColor,
  isDark = true,
}: PinKeypadProps) {
  // Shake animation for the dot row on wrong PIN
  const shakeX = useSharedValue(0);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useEffect(() => {
    if (errorShake) {
      errorHaptic();
      shakeX.value = withSequence(
        withTiming(-10, { duration: 60 }),
        withTiming(10,  { duration: 60 }),
        withTiming(-8,  { duration: 60 }),
        withTiming(8,   { duration: 60 }),
        withTiming(-4,  { duration: 60 }),
        withTiming(0,   { duration: 60 }),
      );
    }
  }, [errorShake]);

  const textColor = isDark ? '#E8E0F5' : '#2D1A4E';
  const keyBg     = isDark ? `${themeColor}22` : `${themeColor}18`;
  const keyPressed = `${themeColor}44`;

  return (
    <View style={styles.container}>
      {/* PIN dot indicators */}
      <Animated.View style={[styles.dotRow, dotStyle]}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: pin.length > i ? themeColor : 'transparent',
                borderColor: pin.length > i ? themeColor : 'rgba(255,255,255,0.35)',
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Keypad grid */}
      <View style={styles.grid} pointerEvents={disabled ? 'none' : 'auto'}>
        {PAD_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((key) => {
              if (key === '') {
                return <View key="spacer" style={styles.keyCell} />;
              }
              if (key === 'del') {
                return (
                  <Pressable
                    key="del"
                    onPress={() => { tapHaptic(); onDelete(); }}
                    disabled={disabled || pin.length === 0}
                    style={({ pressed }) => [
                      styles.keyCell,
                      styles.key,
                      {
                        backgroundColor: pressed ? keyPressed : keyBg,
                        opacity: pin.length === 0 ? 0.3 : 1,
                      },
                    ]}
                    accessibilityLabel="Delete"
                    accessibilityRole="button"
                  >
                    <Delete size={22} color={themeColor} strokeWidth={2} />
                  </Pressable>
                );
              }
              return (
                <Pressable
                  key={key}
                  onPress={() => { tapHaptic(); onDigit(key); }}
                  disabled={disabled}
                  style={({ pressed }) => [
                    styles.keyCell,
                    styles.key,
                    { backgroundColor: pressed ? keyPressed : keyBg },
                  ]}
                  accessibilityLabel={key}
                  accessibilityRole="button"
                >
                  <Text style={[styles.keyText, { color: textColor }]}>{key}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 28,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  grid: {
    width: '100%',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  keyCell: {
    flex: 1,
    height: 64,
  },
  key: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 26,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
});
