/**
 * PinSetupScreen
 *
 * Full-screen 4-digit PIN creation with a confirm step. Uses the device's
 * NATIVE numeric keyboard via a hidden TextInput — the keypad you see when
 * you tap a phone field anywhere else on the device. We render only the dot
 * indicators on screen; the OS handles input.
 *
 * Used in two contexts:
 *   1. Onboarding — called from BiometricSetupScreen after biometric is enabled,
 *      so every user who opts into the lock also has a PIN safety net.
 *   2. Re-registration — shown after a successful PIN fallback when the OS
 *      invalidated the previous biometric token (user changed fingerprints).
 *
 * Flow: create (enter 4 digits) → confirm (re-enter 4 digits) → success → onComplete()
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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { successHaptic, confirmHaptic, errorHaptic } from '@/lib/haptics';
import { setPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';

type Phase = 'create' | 'confirm' | 'success';

interface PinSetupScreenProps {
  /** Called once the PIN is saved successfully. */
  onComplete: () => void;
  /** Optional: show a back/cancel button; called when pressed. */
  onCancel?: () => void;
  /** Optional heading override (e.g. "Set a backup PIN" during re-registration). */
  title?: string;
  subtitle?: string;
}

export function PinSetupScreen({
  onComplete,
  onCancel,
  title,
  subtitle,
}: PinSetupScreenProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors = THEME_COLORS[selectedTheme];

  const inputRef = useRef<TextInput>(null);

  const [phase, setPhase] = useState<Phase>('create');
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Shake animation for the dot row on a wrong PIN
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

  const headingText = (): string => {
    if (phase === 'success') return "You're protected";
    if (phase === 'confirm') return 'Confirm your PIN';
    return title ?? 'Create your PIN';
  };

  const subtitleText = (): string => {
    if (phase === 'success') return 'Your journal is locked with your 4-digit PIN.';
    if (phase === 'confirm') return 'Re-enter your PIN to make sure it matches.';
    return subtitle ?? 'Choose a 4-digit PIN. You can always change it in Settings.';
  };

  // Open the system keyboard on mount and whenever the phase changes to a
  // PIN-entry phase. A short setTimeout is needed on Android so the request
  // isn't dropped during the screen mount/transition.
  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), Platform.OS === 'android' ? 300 : 100);
  }, []);

  useEffect(() => {
    if (phase === 'success') {
      Keyboard.dismiss();
    } else {
      focusInput();
    }
  }, [phase, focusInput]);

  // Called by the hidden TextInput on every keystroke
  const handleChange = useCallback(
    async (text: string) => {
      if (saving || phase === 'success') return;

      // Only digits, max 4 chars
      const digits = text.replace(/[^\d]/g, '').slice(0, 4);
      setCurrentPin(digits);
      if (errorMsg) setErrorMsg('');

      if (digits.length < 4) return;

      // ── PIN now complete — advance phase or save ─────────────────────────
      if (phase === 'create') {
        confirmHaptic();
        setFirstPin(digits);
        setTimeout(() => {
          setCurrentPin('');
          setPhase('confirm');
        }, 200);
        return;
      }

      // confirm phase: must match firstPin
      if (digits !== firstPin) {
        triggerShake();
        setErrorMsg("PINs don't match — try again");
        setTimeout(() => setCurrentPin(''), 500);
        return;
      }

      // Match — save PIN
      setSaving(true);
      try {
        await setPin(digits);
        successHaptic();
        Keyboard.dismiss();
        setPhase('success');
        setTimeout(() => onComplete(), 1200);
      } catch {
        setErrorMsg('Could not save PIN. Please try again.');
        triggerShake();
        setSaving(false);
        setCurrentPin('');
      }
    },
    [saving, phase, errorMsg, firstPin, triggerShake, onComplete],
  );

  const handleBack = useCallback(() => {
    if (phase === 'confirm') {
      setPhase('create');
      setCurrentPin('');
      setErrorMsg('');
    } else {
      Keyboard.dismiss();
      onCancel?.();
    }
  }, [phase, onCancel]);

  const bgColors = themeColors.backgroundGradient;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Hidden TextInput — drives the system numeric keyboard.
              Off-screen rather than display:none so iOS keeps it focusable. */}
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
            editable={!saving && phase !== 'success'}
            secureTextEntry
          />

          <View style={styles.content}>
            {/* Back / cancel button */}
            {phase !== 'success' && (onCancel || phase === 'confirm') && (
              <Pressable
                onPress={handleBack}
                style={styles.backBtn}
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={22} color="rgba(255,255,255,0.75)" strokeWidth={2} />
              </Pressable>
            )}

            {/* Top area */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.topArea}>
              <EmotionalCompanion
                state={phase === 'success' ? 'success' : 'processing'}
                size={80}
                themeColor={selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary}
              />
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={styles.heading}>{headingText()}</Text>
                <Text style={styles.subtitle}>{subtitleText()}</Text>
              </View>
            </Animated.View>

            {/* Middle: dot indicators or success badge */}
            {phase === 'success' ? (
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.successBadge}
              >
                <ShieldCheck size={56} color="#FFFFFF" strokeWidth={1.8} />
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.delay(80).duration(400)}
                style={styles.dotArea}
              >
                {errorMsg !== '' && (
                  <Animated.Text
                    entering={FadeIn.duration(200)}
                    style={styles.errorText}
                  >
                    {errorMsg}
                  </Animated.Text>
                )}

                {/* Tap the dots area to bring the keyboard back if the user dismissed it */}
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

            {/* Bottom spacer keeps layout stable */}
            <View style={{ height: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Off-screen but still focusable — drives the OS numeric keyboard
  hiddenInput: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 16,
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
  heading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '88%',
  },
  dotArea: {
    width: '100%',
    alignItems: 'center',
    gap: 24,
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
  successBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
