/**
 * PinEntryScreen
 *
 * Unified component for PIN creation (setup) and PIN verification (verify).
 * Uses a rendered in-app numeric keypad — no system keyboard, no digit labels
 * on the keys, no back button.
 *
 * mode="setup"   (first-time PIN creation)
 *   Screen 1 — "Enter Your PIN": user taps 4 digits on the keypad.
 *   Screen 2 — "Confirm Your PIN": user re-enters the same 4 digits.
 *              Each dot turns green ✓ or red ✗ per key press to show
 *              whether that position matches the first PIN.
 *              On full match → setPin() → onComplete().
 *              On full mismatch → shake + error, clear and try again.
 *
 * mode="verify"  (unlock, default)
 *   Single screen. User taps 4 digits → verifyPin() → onSuccess() on match,
 *   shake + error on mismatch. Locks out after maxAttempts.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
import { Lock, Delete, Check, X } from 'lucide-react-native';
import { successHaptic, confirmHaptic, errorHaptic, tapHaptic } from '@/lib/haptics';
import { setPin, verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

type SetupPhase = 'create' | 'confirm';

interface PinEntryScreenProps {
  mode?: 'setup' | 'verify';
  onComplete?: () => void;   // setup: called after PIN saved
  onSuccess?: () => void;    // verify: called after PIN verified
  onCancel?: () => void;     // kept for API compatibility, not rendered
  onBack?: () => void;       // kept for API compatibility, not rendered
  title?: string;
  subtitle?: string;
  maxAttempts?: number;
}

export function PinEntryScreen({
  mode = 'verify',
  onComplete,
  onSuccess,
  title,
  subtitle,
  maxAttempts = 5,
}: PinEntryScreenProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

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

  // shake animation
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

  // heading text — stays "Enter Your PIN" on both setup screens unless overridden
  const headingText = (): string => {
    if (title) return title;
    if (mode === 'setup' && setupPhase === 'confirm') return 'Confirm Your PIN';
    return 'Enter Your PIN';
  };

  // subtitle text
  const subtitleText = (): string => {
    if (subtitle && setupPhase === 'create') return subtitle;
    if (mode === 'setup' && setupPhase === 'confirm') {
      return 'Re-enter your PIN to confirm.';
    }
    if (subtitle) return subtitle;
    return 'Use your 4-digit PIN to unlock Vocolens.';
  };

  // numpad digit press
  const handleDigit = useCallback(
    async (digit: number) => {
      if (busy || matched || isLocked) return;
      if (currentPin.length >= 4) return;

      tapHaptic();
      const next = currentPin + digit.toString();
      setCurrentPin(next);
      if (errorMsg) setErrorMsg('');

      if (next.length < 4) return;

      // 4 digits complete
      if (mode === 'setup') {
        if (setupPhase === 'create') {
          confirmHaptic();
          setFirstPin(next);
          // Transition to confirm: clear input then switch phase
          setTimeout(() => {
            setCurrentPin('');
            setSetupPhase('confirm');
          }, 300);
          return;
        }

        // confirm phase — check full match
        if (next !== firstPin) {
          triggerShake();
          setErrorMsg("PINs don't match — try again");
          setTimeout(() => setCurrentPin(''), 500);
          return;
        }

        // Match — save PIN
        confirmHaptic();
        setMatched(true);
        setBusy(true);
        try {
          await setPin(next);
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
      const valid = await verifyPin(next);
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
    },
    [
      busy, matched, isLocked, currentPin, errorMsg,
      mode, setupPhase, firstPin,
      attempts, maxAttempts,
      triggerShake, onComplete, onSuccess,
    ],
  );

  // backspace
  const handleDelete = useCallback(() => {
    if (busy || matched || isLocked) return;
    if (currentPin.length === 0) return;
    tapHaptic();
    setCurrentPin((p) => p.slice(0, -1));
    if (errorMsg) setErrorMsg('');
  }, [busy, matched, isLocked, currentPin, errorMsg]);

  // ── dot row ───────────────────────────────────────────────────────────────
  // confirm step: each dot shows green ✓ (match) or red ✗ (mismatch) per
  // digit typed so far. Untyped positions stay as empty circles.
  // matched state: all four dots turn green ✓.
  // create/verify: filled circle per digit typed, empty otherwise.
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
              <View
                key={i}
                style={[styles.dot, ok ? styles.dotGreen : styles.dotRed]}
              >
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

  // ── numpad — keys have NO digit labels, only the backspace icon ───────────
  const numpadDisabled = busy || matched || isLocked;

  const numKeyStyle = ({ pressed }: { pressed: boolean }) => [
    styles.numKey,
    {
      backgroundColor: pressed
        ? 'rgba(255,255,255,0.26)'
        : 'rgba(255,255,255,0.12)',
      opacity: numpadDisabled ? 0.45 : 1,
    },
  ];

  const renderNumpad = () => (
    <View style={styles.numpad}>
      {/* Rows 1-3: keys with no labels */}
      {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row) => (
        <View key={row[0]} style={styles.numRow}>
          {row.map((n) => (
            <Pressable
              key={n}
              onPress={() => handleDigit(n)}
              disabled={numpadDisabled || currentPin.length >= 4}
              style={numKeyStyle}
            />
          ))}
        </View>
      ))}

      {/* Row 4: empty spacer | 0 key (no label) | backspace icon */}
      <View style={styles.numRow}>
        <View style={[styles.numKey, { backgroundColor: 'transparent' }]} />

        <Pressable
          onPress={() => handleDigit(0)}
          disabled={numpadDisabled || currentPin.length >= 4}
          style={numKeyStyle}
        />

        <Pressable
          onPress={handleDelete}
          disabled={numpadDisabled || currentPin.length === 0}
          style={({ pressed }) => [
            styles.numKey,
            {
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.18)'
                : 'transparent',
              opacity: (numpadDisabled || currentPin.length === 0) ? 0.30 : 1,
            },
          ]}
        >
          <Delete size={24} color="rgba(255,255,255,0.85)" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );

  // ── layout ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.content}>

            {/* Lock badge + heading — animated once on mount only */}
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
                {/* key forces subtitle to cross-fade when phase changes */}
                <Animated.Text
                  key={setupPhase}
                  entering={FadeIn.duration(220)}
                  style={styles.subtitle}
                >
                  {subtitleText()}
                </Animated.Text>
              </View>
            </Animated.View>

            {/* Dots or locked message */}
            {isLocked ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.lockedArea}
              >
                <Text style={styles.lockedText}>
                  Too many failed attempts. Please restart the app or wait a
                  moment and try again.
                </Text>
              </Animated.View>
            ) : (
              <View style={styles.dotArea}>
                {errorMsg !== '' && (
                  <Animated.Text
                    entering={FadeIn.duration(200)}
                    style={styles.errorText}
                  >
                    {errorMsg}
                  </Animated.Text>
                )}
                {renderDots()}
              </View>
            )}

            {/* Numpad */}
            {renderNumpad()}

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
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
  },
  dotRow: {
    flexDirection: 'row',
    gap: 22,
    justifyContent: 'center',
    paddingVertical: 8,
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
  numpad: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  numRow: {
    flexDirection: 'row',
    gap: 12,
  },
  numKey: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
