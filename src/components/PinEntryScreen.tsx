/**
 * PinEntryScreen
 *
 * Unified PIN creation (setup) and PIN verification (verify) screen.
 * Input is driven 100% by the in-app PinKeypad — NO native soft-keyboard,
 * number-pad or system dialog is ever shown.
 *
 * mode="setup"  — first-time creation or change-PIN new-PIN step
 * mode="verify" (default) — unlock or change-PIN current-PIN step
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { View, Text, StyleSheet, BackHandler, Platform } from 'react-native';

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
import { Lock, Check, X } from 'phosphor-react-native';
import { successHaptic, confirmHaptic, errorHaptic } from '@/lib/haptics';
import { setPin, verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { PinKeypad } from './PinKeypad';

type SetupPhase = 'create' | 'confirm';

interface PinEntryScreenProps {
  mode?: 'setup' | 'verify';
  onComplete?: () => void;
  onSuccess?: () => void;
  onCancel?: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  maxAttempts?: number;
  androidFocusDelay?: number;
  maxLength?: number;
}

const DEFAULT_PIN_LENGTH = 4;

export const PinEntryScreen = forwardRef<PinEntryScreenHandle, PinEntryScreenProps>(
function PinEntryScreen({
  mode = 'verify',
  onComplete,
  onSuccess,
  onBack,
  title,
  subtitle,
  maxAttempts = 5,
  maxLength = DEFAULT_PIN_LENGTH,
}: PinEntryScreenProps, ref) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [busy,       setBusy]       = useState(false);

  const [setupPhase, setSetupPhase] = useState<SetupPhase>('create');
  const [firstPin,   setFirstPin]   = useState('');
  const [matched,    setMatched]    = useState(false);

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

  useImperativeHandle(ref, () => ({ focusKeyboard: () => {} }), []);

  // ─── SECURITY: Block hardware back button when used as an auth gate ───────
  // When onBack is undefined (lock-screen context), the back button is consumed
  // entirely so Android cannot dismiss the PIN screen and bypass authentication.
  // When onBack IS provided (e.g. settings change-PIN), normal back behavior applies.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (onBack !== undefined) return; // Allow back when an explicit handler is provided
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // Consume the event — PIN screen is non-dismissible in auth-gate mode.
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  useEffect(() => {
    setCurrentPin('');
    setErrorMsg('');
    setSetupPhase('create');
    setFirstPin('');
    setMatched(false);
    setBusy(false);
    setAttempts(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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

    if (mode === 'setup') {
      if (setupPhase === 'create') {
        confirmHaptic();
        setFirstPin(currentPin);
        setTimeout(() => setSetupPhase('confirm'), 220);
        return;
      }

      if (currentPin !== firstPin) {
        triggerShake();
        setErrorMsg("PINs don't match — try again");
        setTimeout(() => setCurrentPin(''), 500);
        return;
      }

      confirmHaptic();
      setMatched(true);
      setBusy(true);
      try {
        await setPin(currentPin);
        successHaptic();
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
    if (mode === 'setup') {
      return setupPhase === 'create' ? 'Create Your PIN' : 'Confirm Your PIN';
    }
    if (title) return title;
    return 'Enter Your PIN';
  };

  const subtitleText = (): string => {
    if (mode === 'setup') {
      return setupPhase === 'create'
        ? 'Choose a 4-digit PIN for Vocolens.'
        : 'Re-enter your PIN to confirm.';
    }
    if (subtitle) return subtitle;
    return 'Use your 4-digit PIN to unlock.';
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
              <View key={i} style={[styles.dot, styles.dotFilled, styles.dotGreen]}>
                <Check size={10} color="#FFFFFF" weight="duotone" />
              </View>
            );
          }

          if (isConfirmStep && isTyped) {
            const ok = currentPin[i] === firstPin[i];
            return (
              <View key={i} style={[styles.dot, styles.dotFilled, ok ? styles.dotGreen : styles.dotRed]}>
                {ok
                  ? <Check size={10} color="#FFFFFF" weight="duotone" />
                  : <X     size={10} color="#FFFFFF" weight="duotone" />
                }
              </View>
            );
          }

          return (
            <View
              key={i}
              style={[
                styles.dot,
                isTyped && styles.dotFilled,
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

            {/* Header area — icon + text */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.headerArea}>
              <View style={styles.iconCircle}>
                <Lock size={28} color="#FFFFFF" weight="duotone" />
              </View>
              <Animated.Text
                key={`heading-${setupPhase}`}
                entering={FadeIn.duration(200)}
                style={styles.heading}
              >
                {headingText()}
              </Animated.Text>
              <Animated.Text
                key={`subtitle-${setupPhase}`}
                entering={FadeIn.duration(220)}
                style={styles.subtitle}
              >
                {subtitleText()}
              </Animated.Text>
            </Animated.View>

            {/* Dots + error */}
            {isLocked ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.lockedArea}>
                <Text style={styles.lockedText}>
                  Too many failed attempts. Please restart the app or wait a moment and try again.
                </Text>
              </Animated.View>
            ) : (
              <View style={styles.dotArea}>
                {renderDots()}
                {errorMsg !== '' && (
                  <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
                    {errorMsg}
                  </Animated.Text>
                )}
              </View>
            )}

            {/* Keypad */}
            {!isLocked && (
              <PinKeypad
                value={currentPin}
                maxLength={maxLength}
                disabled={busy || matched}
                onDigit={handleDigit}
                onBackspace={handleBackspace}
                onSubmit={handleSubmit}
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
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
  },
  headerArea: {
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 20,
  },
  dotArea: {
    alignItems: 'center',
    gap: 16,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFilled: {
    backgroundColor: '#FFFFFF',
  },
  dotGreen: {
    backgroundColor: 'rgba(72,199,142,0.9)',
  },
  dotRed: {
    backgroundColor: 'rgba(255,99,99,0.9)',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,120,120,0.9)',
    textAlign: 'center',
  },
  lockedArea: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  lockedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,200,100,0.9)',
    textAlign: 'center',
    lineHeight: 21,
  },
});
