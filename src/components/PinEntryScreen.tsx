/**
 * PinEntryScreen
 *
 * Full-screen 4-digit PIN entry used as the biometric fallback. Uses the
 * device's NATIVE numeric keyboard via a hidden TextInput. We render only
 * the dot indicators on screen; the OS handles input.
 *
 * Props
 * ─────
 * onSuccess       Called after the PIN is verified successfully.
 * onBack          Optional — if supplied a back/cancel arrow is shown.
 * title           Override the heading (e.g. different wording for re-auth).
 * subtitle        Override the subheading.
 * maxAttempts     Defaults to 5. After that the screen shows a locked message.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Lock, ArrowLeft } from 'lucide-react-native';
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

interface PinEntryScreenProps {
  onSuccess: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  maxAttempts?: number;
}

export function PinEntryScreen({
  onSuccess,
  onBack,
  title = 'Enter your PIN',
  subtitle = 'Use your 4-digit PIN to unlock Vocolens.',
  maxAttempts = 5,
}: PinEntryScreenProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];

  const inputRef = useRef<TextInput>(null);

  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const isLocked = attempts >= maxAttempts;

  // Shake animation on wrong PIN
  const shakeX = useSharedValue(0);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = useCallback(() => {
    errorHaptic();
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [shakeX]);

  // Open the OS keyboard on mount and re-focus on demand
  const focusInput = useCallback(() => {
    if (isLocked) return;
    setTimeout(() => inputRef.current?.focus(), Platform.OS === 'android' ? 300 : 100);
  }, [isLocked]);

  useEffect(() => {
    if (isLocked) {
      Keyboard.dismiss();
    } else {
      focusInput();
    }
  }, [isLocked, focusInput]);

  const handleChange = useCallback(
    async (text: string) => {
      if (verifying || isLocked) return;

      const digits = text.replace(/[^\d]/g, '').slice(0, 4);
      setCurrentPin(digits);
      if (errorMsg) setErrorMsg('');

      if (digits.length < 4) return;

      setVerifying(true);
      const valid = await verifyPin(digits);
      setVerifying(false);

      if (valid) {
        successHaptic();
        Keyboard.dismiss();
        onSuccess();
        return;
      }

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      triggerShake();

      if (newAttempts >= maxAttempts) {
        setErrorMsg('Too many incorrect attempts. Please wait and try again.');
        Keyboard.dismiss();
      } else {
        const remaining = maxAttempts - newAttempts;
        setErrorMsg(
          remaining === 1
            ? 'Incorrect PIN — 1 attempt remaining.'
            : `Incorrect PIN — ${remaining} attempts remaining.`,
        );
      }
      setTimeout(() => setCurrentPin(''), 500);
    },
    [verifying, isLocked, errorMsg, attempts, maxAttempts, onSuccess, triggerShake],
  );

  return (
    <View style={styles.container}>
      {/* Hidden TextInput drives the native numeric keyboard */}
      <TextInput
        ref={inputRef}
        value={currentPin}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        maxLength={4}
        autoFocus
        caretHidden
        style={styles.hiddenInput}
        accessibilityLabel="PIN entry"
        editable={!verifying && !isLocked}
        secureTextEntry
      />

      {/* Back button */}
      {onBack && (
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color="rgba(255,255,255,0.75)" strokeWidth={2} />
        </Pressable>
      )}

      {/* Top area */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.topArea}>
        <View
          style={[
            styles.lockBadge,
            {
              borderColor: `${themeColors.primary}60`,
              backgroundColor: `${themeColors.primary}20`,
            },
          ]}
        >
          <Lock size={36} color="#FFFFFF" strokeWidth={1.8} />
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </Animated.View>

      {/* Dots or locked state */}
      {isLocked ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ alignItems: 'center', paddingHorizontal: 24, gap: 16 }}
        >
          <Text style={styles.lockedText}>
            Too many failed attempts. Please restart the app or wait a moment and
            try again.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(80).duration(350)}
          style={styles.dotArea}
        >
          {errorMsg !== '' && (
            <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
              {errorMsg}
            </Animated.Text>
          )}

          <Pressable onPress={focusInput} accessibilityRole="button">
            <Animated.View style={[styles.dotRow, dotStyle]}>
              {[0, 1, 2, 3].map((i) => {
                const filled = currentPin.length > i;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor: filled
                          ? themeColors.primary
                          : 'transparent',
                        borderColor: filled
                          ? themeColors.primary
                          : 'rgba(255,255,255,0.45)',
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>
          </Pressable>

          <Pressable onPress={focusInput} style={styles.tapHintWrap}>
            <Text style={styles.tapHint}>Tap here to open the keyboard</Text>
          </Pressable>
        </Animated.View>
      )}

      <View style={{ height: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
  },
  // Off-screen but still focusable — drives the OS numeric keyboard
  hiddenInput: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  topArea: {
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  lockBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '88%',
  },
  dotArea: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 22,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  tapHintWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tapHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,120,120,1)',
    textAlign: 'center',
    marginBottom: 4,
  },
  lockedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,200,100,1)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
