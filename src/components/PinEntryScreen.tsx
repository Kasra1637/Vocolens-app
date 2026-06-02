/**
 * PinEntryScreen
 *
 * Unified PIN creation (setup) and PIN verification (verify) screen.
 * Input is driven entirely by the native device number-pad keyboard via a
 * hidden zero-size TextInput — no custom numpad tiles rendered at all.
 *
 * mode="setup"  — first-time creation
 *   Screen 1 "Enter Your PIN":    user types 4 digits on the native keypad.
 *   Screen 2 "Confirm Your PIN":  user re-enters the same 4 digits.
 *     · Each dot turns green ✓ (position matches) or red ✗ (mismatch) as
 *       each key is pressed, giving live per-digit feedback.
 *     · Full match → setPin() → onComplete().
 *     · Full mismatch → shake + error, clear and retry.
 *
 * mode="verify" (default) — unlock
 *   User types 4 digits → verifyPin() → onSuccess() on match.
 *   Shake + remaining-attempts warning on mismatch.
 *   Locks out after maxAttempts.
 *
 * Tapping anywhere on the dot row re-focuses the hidden input so the
 * keyboard re-opens if the user dismissed it.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  Platform,
  InteractionManager,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Lock, Check, X } from 'lucide-react-native';
import { successHaptic, confirmHaptic, errorHaptic, tapHaptic } from '@/lib/haptics';
import { setPin, verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

type SetupPhase = 'create' | 'confirm';

interface PinEntryScreenProps {
  mode?: 'setup' | 'verify';
  onComplete?: () => void;   // setup: called after PIN saved
  onSuccess?: () => void;    // verify: called after PIN verified
  onCancel?: () => void;     // kept for API compatibility
  onBack?: () => void;       // kept for API compatibility
  title?: string;
  subtitle?: string;
  maxAttempts?: number;
  /** Extra ms added to the Android focus delay — use when mounted inside a Modal */
  androidFocusDelay?: number;
}

export function PinEntryScreen({
  mode = 'verify',
  onComplete,
  onSuccess,
  title,
  subtitle,
  maxAttempts = 5,
  androidFocusDelay = 0,
}: PinEntryScreenProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

  const inputRef = useRef<TextInput>(null);

  // shared state
  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [busy,       setBusy]       = useState(false);

  // setup-mode state
  const [setupPhase, setSetupPhase] = useState<SetupPhase>('create');
  const [firstPin,   setFirstPin]   = useState('');
  const [matched,    setMatched]    = useState(false);

  // verify-mode state
  const [attempts, setAttempts] = useState(0);
  const isLocked = mode === 'verify' && attempts >= maxAttempts;

  // ── shake animation ──────────────────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = useCallback(() => {
    errorHaptic();
    shakeX.value = withSequence(
      withTiming(-10, { duration: 55 }),
      withTiming(10,  { duration: 55 }),
      withTiming(-8,  { duration: 55 }),
      withTiming(8,   { duration: 55 }),
      withTiming(-4,  { duration: 55 }),
      withTiming(0,   { duration: 55 }),
    );
  }, [shakeX]);

  // ── focus helpers ────────────────────────────────────────────────────────
  const focusInput = useCallback(() => {
    if (isLocked || busy || matched) return;
    InteractionManager.runAfterInteractions(() => {
      const delay = Platform.OS === 'android' ? 150 + androidFocusDelay : 50;
      setTimeout(() => inputRef.current?.focus(), delay);
    });
  }, [isLocked, busy, matched, androidFocusDelay]);

  // Focus on mount and whenever the setup phase changes
  useEffect(() => {
    if (isLocked) {
      Keyboard.dismiss();
    } else {
      focusInput();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, setupPhase]);

  // Dismiss keyboard once matched/saved
  useEffect(() => {
    if (matched) Keyboard.dismiss();
  }, [matched]);

  // ── text input handler ───────────────────────────────────────────────────
  const handleChange = useCallback(
    async (text: string) => {
      if (busy || matched || isLocked) return;

      // Strip non-digits, cap at 4
      const digits = text.replace(/[^\d]/g, '').slice(0, 4);
      setCurrentPin(digits);
      if (errorMsg) setErrorMsg('');

      if (digits.length < 4) return;

      // ── 4 digits entered ────────────────────────────────────────────────
      if (mode === 'setup') {
        if (setupPhase === 'create') {
          confirmHaptic();
          setFirstPin(digits);
          setTimeout(() => {
            setCurrentPin('');
            setSetupPhase('confirm');
          }, 300);
          return;
        }

        // confirm phase
        if (digits !== firstPin) {
          triggerShake();
          setErrorMsg("PINs don't match — try again");
          setTimeout(() => setCurrentPin(''), 500);
          return;
        }

        // match — save
        confirmHaptic();
        setMatched(true);
        setBusy(true);
        try {
          await setPin(digits);
          successHaptic();
          setTimeout(() => onComplete?.(), 600);
        } catch {
          setErrorMsg('Could not save PIN. Please try again.');
          triggerShake();
          setBusy(false);
          setMatched(false);
          setCurrentPin('');
        }
        return;
      }

      // verify mode
      setBusy(true);
      const valid = await verifyPin(digits);
      setBusy(false);

      if (valid) {
        successHaptic();
        Keyboard.dismiss();
        onSuccess?.();
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
    [
      busy, matched, isLocked, errorMsg,
      mode, setupPhase, firstPin,
      attempts, maxAttempts,
      triggerShake, onComplete, onSuccess,
    ],
  );

  // ── heading / subtitle ───────────────────────────────────────────────────
  const headingText = (): string => {
    if (title) return title;
    if (mode === 'setup' && setupPhase === 'confirm') return 'Confirm Your PIN';
    return 'Enter Your PIN';
  };

  const subtitleText = (): string => {
    if (mode === 'setup' && setupPhase === 'confirm') return 'Re-enter your PIN to confirm.';
    if (subtitle) return subtitle;
    return 'Use your 4-digit PIN to unlock Vocolens.';
  };

  // ── dot row ──────────────────────────────────────────────────────────────
  // confirm step: green ✓ if digit matches first PIN at that index, red ✗ if not.
  // matched state: all four dots green ✓.
  // create / verify: filled circle per digit typed, empty otherwise.
  const renderDots = () => {
    const isConfirmStep = mode === 'setup' && setupPhase === 'confirm';

    return (
      <Animated.View style={[styles.dotRow, dotAnimStyle]}>
        {[0, 1, 2, 3].map((i) => {
          const isTyped = currentPin.length > i;

          if (matched && isTyped) {
            return (
              <View key={i} style={[styles.dot, styles.dotGreen]}>
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            );
          }

          if (isConfirmStep && isTyped) {
            const ok = currentPin[i] === firstPin[i];
            return (
              <View key={i} style={[styles.dot, ok ? styles.dotGreen : styles.dotRed]}>
                {ok
                  ? <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  : <X     size={11} color="#FFFFFF" strokeWidth={3} />
                }
              </View>
            );
          }

          return (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: isTyped ? themeColors.primary : 'transparent',
                  borderColor: isTyped
                    ? themeColors.primary
                    : 'rgba(255,255,255,0.45)',
                },
              ]}
            />
          );
        })}
      </Animated.View>
    );
  };

  // ── layout ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/*
            Hidden zero-size TextInput — the sole source of input.
            Placed inside layout bounds (not absolute off-screen) so Android's
            focus system can always reach it.
          */}
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
            secureTextEntry
            editable={!busy && !matched && !isLocked}
            style={styles.hiddenInput}
            accessibilityLabel="PIN entry"
          />

          <View style={styles.content}>

            {/* Lock badge + heading — animated once on mount */}
            <Animated.View entering={FadeInDown.duration(380)} style={styles.topArea}>
              <View
                style={[
                  styles.lockBadge,
                  {
                    borderColor: `${themeColors.primary}60`,
                    backgroundColor: `${themeColors.primary}22`,
                  },
                ]}
              >
                <Lock size={38} color="#FFFFFF" strokeWidth={1.8} />
              </View>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={styles.heading}>{headingText()}</Text>
                {/* key cross-fades subtitle when phase changes */}
                <Animated.Text
                  key={setupPhase}
                  entering={FadeIn.duration(220)}
                  style={styles.subtitle}
                >
                  {subtitleText()}
                </Animated.Text>
              </View>
            </Animated.View>

            {/* Dots — tap to re-open keyboard if dismissed */}
            {isLocked ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.lockedArea}>
                <Text style={styles.lockedText}>
                  Too many failed attempts. Please restart the app or wait a
                  moment and try again.
                </Text>
              </Animated.View>
            ) : (
              <Pressable
                onPress={focusInput}
                accessibilityRole="button"
                accessibilityLabel="Tap to open keypad"
                style={styles.dotArea}
              >
                {errorMsg !== '' && (
                  <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                    {errorMsg}
                  </Animated.Text>
                )}
                {renderDots()}
                <Text style={styles.tapHint}>Tap to open keypad</Text>
              </Pressable>
            )}

            {/* Bottom spacer keeps layout stable when keyboard is open */}
            <View style={styles.bottomSpacer} />

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Zero-size, inside layout bounds so Android focus works
  hiddenInput: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  topArea: {
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  lockBadge: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 18,
    paddingVertical: 16,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 22,
    justifyContent: 'center',
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotGreen: {
    backgroundColor: 'rgba(72,199,142,0.85)',
    borderColor: 'rgba(72,199,142,1)',
  },
  dotRed: {
    backgroundColor: 'rgba(255,99,99,0.85)',
    borderColor: 'rgba(255,99,99,1)',
  },
  tapHint: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,120,120,1)',
    textAlign: 'center',
  },
  lockedArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: 'rgba(255,200,100,1)',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 40,
  },
});
