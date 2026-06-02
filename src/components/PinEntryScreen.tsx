/**
 * PinEntryScreen
 *
 * Single unified component for both PIN creation (first-time setup) and
 * PIN verification (unlock). Uses a rendered in-app numeric keypad —
 * the same native-style touchpad on every device with no system keyboard.
 *
 * ── Modes ─────────────────────────────────────────────────────────────────
 *
 * mode="verify"  (default)
 *   Title:    "Enter Your PIN"
 *   Subtitle: "Use your 4-digit PIN to unlock Vocolens."
 *   Flow:     User enters 4 digits → verifyPin() → onSuccess() on match,
 *             shake + error on mismatch.  Locks out after maxAttempts.
 *
 * mode="setup"
 *   Title:    "Enter Your PIN"
 *   Subtitle: "Use your 4-digit PIN to unlock Vocolens."
 *   Flow:     Enter 4 digits (create step) → enter 4 digits again (confirm
 *             step). On the confirm step each dot shows a real-time ✓ or ✗
 *             indicator per key press to signal whether the running sequence
 *             matches the first PIN so far. On full match → setPin() →
 *             onComplete(). On mismatch at 4 digits → shake + error,
 *             clear confirm entry.
 *
 * ── Props ─────────────────────────────────────────────────────────────────
 *
 * mode          "setup" | "verify"       default: "verify"
 * onComplete    () => void               called after PIN saved  (setup)
 * onSuccess     () => void               called after PIN verified (verify)
 * onCancel      () => void   optional    back arrow on create step (setup)
 * onBack        () => void   optional    back arrow (verify)
 * title         string       optional    heading override
 * subtitle      string       optional    subheading override
 * maxAttempts   number       optional    verify mode only, default 5
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
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
import { Lock, ArrowLeft, Delete, Check, X } from 'lucide-react-native';
import { successHaptic, confirmHaptic, errorHaptic, tapHaptic } from '@/lib/haptics';
import { setPin, verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type SetupPhase = 'create' | 'confirm';

interface PinEntryScreenProps {
  /** "setup" = first-time PIN creation; "verify" = unlock (default) */
  mode?: 'setup' | 'verify';

  // ── setup mode callbacks ──────────────────────────────────────────────────
  /** Called after the PIN has been saved successfully (setup mode). */
  onComplete?: () => void;
  /** Optional back/cancel from the create step (setup mode). */
  onCancel?: () => void;

  // ── verify mode callbacks ─────────────────────────────────────────────────
  /** Called after PIN is verified successfully (verify mode). */
  onSuccess?: () => void;
  /** Optional back/cancel (verify mode). */
  onBack?: () => void;

  // ── shared overrides ──────────────────────────────────────────────────────
  title?: string;
  subtitle?: string;

  // ── verify mode only ──────────────────────────────────────────────────────
  maxAttempts?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PinEntryScreen({
  mode = 'verify',
  onComplete,
  onCancel,
  onSuccess,
  onBack,
  title,
  subtitle,
  maxAttempts = 5,
}: PinEntryScreenProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

  // ── shared state ──────────────────────────────────────────────────────────
  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [busy,       setBusy]       = useState(false);

  // ── setup-mode state ──────────────────────────────────────────────────────
  const [setupPhase, setSetupPhase] = useState<SetupPhase>('create');
  const [firstPin,   setFirstPin]   = useState('');
  /** True while the success checkmarks are showing before onComplete fires */
  const [matched,    setMatched]    = useState(false);

  // ── verify-mode state ─────────────────────────────────────────────────────
  const [attempts, setAttempts] = useState(0);
  const isLocked = mode === 'verify' && attempts >= maxAttempts;

  // ── shake animation ───────────────────────────────────────────────────────
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

  // ── derived text ──────────────────────────────────────────────────────────
  const headingText = (): string => {
    if (title) return title;
    return 'Enter Your PIN';
  };

  const subtitleText = (): string => {
    if (subtitle) return subtitle;
    if (mode === 'setup' && setupPhase === 'confirm') {
      return 'Re-enter your PIN to confirm.';
    }
    return 'Use your 4-digit PIN to unlock Vocolens.';
  };

  // ── numpad digit press ────────────────────────────────────────────────────
  const handleDigit = useCallback(
    async (digit: number) => {
      if (busy || matched || isLocked) return;
      if (currentPin.length >= 4) return;

      tapHaptic();
      const next = currentPin + digit.toString();
      setCurrentPin(next);
      if (errorMsg) setErrorMsg('');

      if (next.length < 4) return;

      // ── 4 digits reached ─────────────────────────────────────────────────

      if (mode === 'setup') {
        if (setupPhase === 'create') {
          // Store first PIN, advance to confirm
          confirmHaptic();
          setFirstPin(next);
          setTimeout(() => {
            setCurrentPin('');
            setSetupPhase('confirm');
          }, 250);
          return;
        }

        // confirm phase — check match
        if (next !== firstPin) {
          triggerShake();
          setErrorMsg("PINs don't match — try again");
          setTimeout(() => setCurrentPin(''), 500);
          return;
        }

        // ── PINs match → save ─────────────────────────────────────────────
        confirmHaptic();
        setMatched(true);
        setBusy(true);
        try {
          await setPin(next);
          successHaptic();
          setTimeout(() => {
            onComplete?.();
          }, 700);
        } catch {
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

  // ── backspace ─────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (busy || matched || isLocked) return;
    if (currentPin.length === 0) return;
    tapHaptic();
    setCurrentPin((p) => p.slice(0, -1));
    if (errorMsg) setErrorMsg('');
  }, [busy, matched, isLocked, currentPin, errorMsg]);

  // ── back / cancel ─────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (mode === 'setup') {
      if (setupPhase === 'confirm') {
        setSetupPhase('create');
        setCurrentPin('');
        setErrorMsg('');
        setMatched(false);
      } else {
        onCancel?.();
      }
    } else {
      onBack?.();
    }
  }, [mode, setupPhase, onCancel, onBack]);

  // Show back arrow when:
  //   setup + create phase → only if onCancel supplied
  //   setup + confirm phase → always (goes back to create)
  //   verify → only if onBack supplied
  const showBackArrow =
    (mode === 'setup' && setupPhase === 'confirm') ||
    (mode === 'setup' && setupPhase === 'create' && !!onCancel) ||
    (mode === 'verify' && !!onBack);

  // ── dot row ───────────────────────────────────────────────────────────────
  /**
   * On the confirm step of setup mode each position shows a per-key indicator:
   *   • typed so far AND matches first PIN up to that index → green ✓
   *   • typed so far AND does NOT match first PIN at that index → red ✗
   *   • not yet typed → empty circle
   *
   * In create/verify modes: filled circle = digit entered, empty = not yet.
   * While matched (success moment): all filled dots show a white ✓.
   */
  const renderDots = () => {
    const isConfirmStep = mode === 'setup' && setupPhase === 'confirm';

    return (
      <Animated.View style={[styles.dotRow, dotAnimStyle]}>
        {[0, 1, 2, 3].map((i) => {
          const isTyped = currentPin.length > i;

          // ── confirm step: per-key match indicator ─────────────────────────
          if (isConfirmStep && isTyped && !matched) {
            const digitMatches = currentPin[i] === firstPin[i];
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: digitMatches
                      ? 'rgba(72,199,142,0.85)'   // green — match so far
                      : 'rgba(255,99,99,0.85)',    // red — mismatch
                    borderColor: digitMatches
                      ? 'rgba(72,199,142,1)'
                      : 'rgba(255,99,99,1)',
                  },
                ]}
              >
                {digitMatches
                  ? <Check size={11} color="#FFFFFF" strokeWidth={3} />
                  : <X     size={11} color="#FFFFFF" strokeWidth={3} />
                }
              </View>
            );
          }

          // ── matched state: all white ✓ ────────────────────────────────────
          if (matched && isTyped) {
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: 'rgba(72,199,142,0.85)',
                    borderColor: 'rgba(72,199,142,1)',
                  },
                ]}
              >
                <Check size={11} color="#FFFFFF" strokeWidth={3} />
              </View>
            );
          }

          // ── default: filled or empty circle ───────────────────────────────
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

  // ── numpad ────────────────────────────────────────────────────────────────
  const numpadDisabled = busy || matched || isLocked;

  const renderNumpad = () => (
    <View style={styles.numpad}>
      {/* Rows 1-3 */}
      {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row) => (
        <View key={row[0]} style={styles.numRow}>
          {row.map((n) => (
            <Pressable
              key={n}
              onPress={() => handleDigit(n)}
              disabled={numpadDisabled || currentPin.length >= 4}
              style={({ pressed }) => [
                styles.numKey,
                {
                  backgroundColor: pressed
                    ? 'rgba(255,255,255,0.26)'
                    : 'rgba(255,255,255,0.12)',
                  opacity: numpadDisabled ? 0.45 : 1,
                },
              ]}
            >
              <Text style={styles.numKeyText}>{n}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      {/* Row 4: spacer | 0 | backspace */}
      <View style={styles.numRow}>
        <View style={[styles.numKey, { backgroundColor: 'transparent' }]} />

        <Pressable
          onPress={() => handleDigit(0)}
          disabled={numpadDisabled || currentPin.length >= 4}
          style={({ pressed }) => [
            styles.numKey,
            {
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.26)'
                : 'rgba(255,255,255,0.12)',
              opacity: numpadDisabled ? 0.45 : 1,
            },
          ]}
        >
          <Text style={styles.numKeyText}>0</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={numpadDisabled || currentPin.length === 0}
          style={({ pressed }) => [
            styles.numKey,
            {
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.20)'
                : 'transparent',
              opacity: (numpadDisabled || currentPin.length === 0) ? 0.35 : 1,
            },
          ]}
        >
          <Delete size={24} color="rgba(255,255,255,0.85)" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );

  // ─── Layout ───────────────────────────────────────────────────────────────

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

            {/* Back arrow */}
            {showBackArrow && (
              <Pressable
                onPress={handleBack}
                style={styles.backBtn}
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={22} color="rgba(255,255,255,0.75)" strokeWidth={2} />
              </Pressable>
            )}

            {/* Top: lock badge + heading */}
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
                <Text style={styles.subtitle}>{subtitleText()}</Text>
              </View>
            </Animated.View>

            {/* Middle: dots or locked message */}
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
              <Animated.View
                entering={FadeInDown.delay(70).duration(380)}
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
                {renderDots()}
              </Animated.View>
            )}

            {/* Numpad */}
            {renderNumpad()}

          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  // ── Top area ──────────────────────────────────────────────────────────────
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
  // ── Dot row ───────────────────────────────────────────────────────────────
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
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,120,120,1)',
    textAlign: 'center',
  },
  // ── Locked state ──────────────────────────────────────────────────────────
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
  // ── Numpad ────────────────────────────────────────────────────────────────
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
  numKeyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
  },
});
