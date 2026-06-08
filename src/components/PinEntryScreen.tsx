/**
 * PinEntryScreen
 *
 * Unified PIN creation (setup) and PIN verification (verify) screen.
 * Input is driven 100% by the in-app PinKeypad — NO native soft-keyboard,
 * number-pad or system dialog is ever shown. This guarantees identical UX
 * on iOS and Android and removes a class of "keyboard never opens" bugs.
 *
 * mode="setup"  — first-time creation or change-PIN new-PIN step
 *   Phase 1 "Enter Your New PIN":   user types 4 digits + taps OK.
 *   Phase 2 "Confirm Your New PIN": user re-enters the same 4 digits + OK.
 *     · Each dot turns green ✓ (position matches) or red ✗ (mismatch) as
 *       digits land, giving live per-digit feedback.
 *     · OK on a full match → setPin() → onComplete().
 *     · OK on a full mismatch → shake + error, clear and retry.
 *
 * mode="verify" (default) — unlock or change-PIN current-PIN step
 *   User types 4 digits + OK → verifyPin() → onSuccess() on match.
 *   Shake + remaining-attempts warning on mismatch.
 *   Locks out after maxAttempts.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Imperative handle.
 *
 * `focusKeyboard()` is kept for backward compatibility with existing call
 * sites (e.g. settings.tsx's <Modal onShow>). The in-app keypad is always
 * visible, so the method is a no-op — but keeping the surface unchanged
 * means we don't have to touch parents.
 */
export interface PinEntryScreenHandle {
  focusKeyboard: () => void;
}
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
import { successHaptic, confirmHaptic, errorHaptic } from '@/lib/haptics';
import { setPin, verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { PinKeypad } from './PinKeypad';

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
  /** Kept for API compatibility; no longer used (no native keyboard). */
  androidFocusDelay?: number;
  /** PIN length. Existing app standard is 4. */
  maxLength?: number;
}

const DEFAULT_PIN_LENGTH = 4;

export const PinEntryScreen = forwardRef<PinEntryScreenHandle, PinEntryScreenProps>(
function PinEntryScreen({
  mode = 'verify',
  onComplete,
  onSuccess,
  title,
  subtitle,
  maxAttempts = 5,
  maxLength = DEFAULT_PIN_LENGTH,
}: PinEntryScreenProps, ref) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

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

  // No-op imperative handle (the in-app keypad is always visible)
  useImperativeHandle(ref, () => ({ focusKeyboard: () => {} }), []);

  // Reset input when switching setup phase
  useEffect(() => {
    setCurrentPin('');
    setErrorMsg('');
  }, [setupPhase]);

  // ── keypad handlers ──────────────────────────────────────────────────────
  const handleDigit = useCallback(
    (digit: string) => {
      if (busy || matched || isLocked) return;
      setCurrentPin((prev) => {
        if (prev.length >= maxLength) return prev;
        return prev + digit;
      });
      if (errorMsg) setErrorMsg('');
    },
    [busy, matched, isLocked, maxLength, errorMsg],
  );

  const handleBackspace = useCallback(() => {
    if (busy || matched || isLocked) return;
    setCurrentPin((prev) => prev.slice(0, -1));
    if (errorMsg) setErrorMsg('');
  }, [busy, matched, isLocked, errorMsg]);

  const handleSubmit = useCallback(async () => {
    if (busy || matched || isLocked) return;
    if (currentPin.length !== maxLength) return;

    // ── setup mode ────────────────────────────────────────────────────────
    if (mode === 'setup') {
      if (setupPhase === 'create') {
        confirmHaptic();
        setFirstPin(currentPin);
        // brief pause so the user sees their 4 dots before the phase swap
        setTimeout(() => setSetupPhase('confirm'), 220);
        return;
      }

      // confirm phase
      if (currentPin !== firstPin) {
        triggerShake();
        setErrorMsg("PINs don't match — try again");
        setTimeout(() => setCurrentPin(''), 500);
        return;
      }

      // match — persist
      confirmHaptic();
      setMatched(true);
      setBusy(true);
      try {
        await setPin(currentPin);
        successHaptic();
        // Slight delay so the user sees the four green ✓ dots before the
        // parent navigates away.
        setTimeout(() => onComplete?.(), 600);
      } catch (err) {
        console.error('[PinEntryScreen] setPin failed:', err);
        setErrorMsg('Could not save PIN. Please try again.');
        triggerShake();
        setBusy(false);
        setMatched(false);
        setCurrentPin('');
      }
      return;
    }

    // ── verify mode ───────────────────────────────────────────────────────
    setBusy(true);
    let valid = false;
    try {
      valid = await verifyPin(currentPin);
    } catch (err) {
      console.error('[PinEntryScreen] verifyPin error:', err);
      valid = false;
    }
    setBusy(false);

    if (valid) {
      successHaptic();
      onSuccess?.();
      return;
    }

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    triggerShake();

    if (newAttempts >= maxAttempts) {
      setErrorMsg('Too many incorrect attempts. Please wait and try again.');
    } else {
      const remaining = maxAttempts - newAttempts;
      setErrorMsg(
        remaining === 1
          ? 'Incorrect PIN — 1 attempt remaining.'
          : `Incorrect PIN — ${remaining} attempts remaining.`,
      );
    }
    setTimeout(() => setCurrentPin(''), 500);
  }, [
    busy, matched, isLocked,
    currentPin, maxLength,
    mode, setupPhase, firstPin,
    attempts, maxAttempts,
    triggerShake, onComplete, onSuccess,
  ]);

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
  const renderDots = () => {
    const isConfirmStep = mode === 'setup' && setupPhase === 'confirm';

    return (
      <Animated.View style={[styles.dotRow, dotAnimStyle]}>
        {Array.from({ length: maxLength }).map((_, i) => {
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
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

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
                <Animated.Text
                  key={setupPhase}
                  entering={FadeIn.duration(220)}
                  style={styles.subtitle}
                >
                  {subtitleText()}
                </Animated.Text>
              </View>
            </Animated.View>

            {/* Dots + error message */}
            {isLocked ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.lockedArea}>
                <Text style={styles.lockedText}>
                  Too many failed attempts. Please restart the app or wait a
                  moment and try again.
                </Text>
              </Animated.View>
            ) : (
              <View style={styles.dotArea}>
                {errorMsg !== '' && (
                  <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                    {errorMsg}
                  </Animated.Text>
                )}
                {renderDots()}
              </View>
            )}

            {/* In-app numeric keypad — always visible, no native keyboard */}
            {!isLocked && (
              <PinKeypad
                value={currentPin}
                maxLength={maxLength}
                disabled={busy || matched}
                onDigit={handleDigit}
                onBackspace={handleBackspace}
                onSubmit={handleSubmit}
                style={styles.keypad}
              />
            )}

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  topArea: {
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
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
    gap: 14,
    paddingVertical: 8,
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
  keypad: {
    width: '100%',
    marginTop: 8,
  },
});
