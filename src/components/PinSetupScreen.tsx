/**
 * PinSetupScreen
 *
 * Full-screen 4-digit PIN creation with a confirm step.
 * Uses a rendered in-app numeric keypad (no hidden TextInput / system keyboard).
 * The dot row shows filled circles as the user taps digits — no digit values shown.
 *
 * Confirm step: once the re-entered PIN reaches 4 digits AND matches the first
 * PIN, each dot is replaced by a ✓ checkmark badge before the screen advances.
 *
 * Flow: create → confirm → success → onComplete()
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
import { ShieldCheck, ArrowLeft, Delete, Check } from 'lucide-react-native';
import { successHaptic, confirmHaptic, errorHaptic, tapHaptic } from '@/lib/haptics';
import { setPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';

type Phase = 'create' | 'confirm' | 'success';

interface PinSetupScreenProps {
  /** Called once the PIN is saved successfully. */
  onComplete: () => void;
  /** Optional: show a back/cancel button; called when pressed. */
  onCancel?: () => void;
  /** Optional heading override. */
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

  const [phase, setPhase] = useState<Phase>('create');
  const [firstPin, setFirstPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  // True while showing the "matched" checkmarks before advancing
  const [matched, setMatched] = useState(false);

  // Shake animation for dot row on wrong PIN
  const shakeX = useSharedValue(0);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = useCallback(() => {
    errorHaptic();
    shakeX.value = withSequence(
      withTiming(-10, { duration: 60 }),
      withTiming(10,  { duration: 60 }),
      withTiming(-8,  { duration: 60 }),
      withTiming(8,   { duration: 60 }),
      withTiming(-4,  { duration: 60 }),
      withTiming(0,   { duration: 60 }),
    );
  }, [shakeX]);

  // ── Numpad press ──────────────────────────────────────────────────────────
  const handleDigit = useCallback(
    async (digit: number) => {
      if (saving || phase === 'success' || matched) return;
      if (currentPin.length >= 4) return;

      tapHaptic();
      const next = currentPin + digit.toString();
      setCurrentPin(next);
      if (errorMsg) setErrorMsg('');

      if (next.length < 4) return;

      // ── 4 digits reached ─────────────────────────────────────────────────
      if (phase === 'create') {
        confirmHaptic();
        setFirstPin(next);
        setTimeout(() => {
          setCurrentPin('');
          setPhase('confirm');
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

      // ── PINs match: show checkmarks then save ─────────────────────────────
      confirmHaptic();
      setMatched(true);

      setSaving(true);
      try {
        await setPin(next);
        successHaptic();
        setTimeout(() => {
          setPhase('success');
          setTimeout(() => onComplete(), 1000);
        }, 700);
      } catch {
        setErrorMsg('Could not save PIN. Please try again.');
        triggerShake();
        setSaving(false);
        setMatched(false);
        setCurrentPin('');
      }
    },
    [saving, phase, matched, currentPin, errorMsg, firstPin, triggerShake, onComplete],
  );

  const handleDelete = useCallback(() => {
    if (saving || phase === 'success' || matched) return;
    if (currentPin.length === 0) return;
    tapHaptic();
    setCurrentPin((p) => p.slice(0, -1));
    if (errorMsg) setErrorMsg('');
  }, [saving, phase, matched, currentPin, errorMsg]);

  const handleBack = useCallback(() => {
    if (phase === 'confirm') {
      setPhase('create');
      setCurrentPin('');
      setErrorMsg('');
      setMatched(false);
    } else {
      onCancel?.();
    }
  }, [phase, onCancel]);

  // ── Text helpers ──────────────────────────────────────────────────────────
  const headingText = (): string => {
    if (phase === 'success') return "You're protected";
    if (phase === 'confirm') return 'Confirm your PIN';
    return title ?? 'Protect with a PIN';
  };

  const subtitleText = (): string => {
    if (phase === 'success') return 'Your journal is locked with your 4-digit PIN.';
    if (phase === 'confirm') return 'Re-enter your PIN to confirm.';
    return subtitle ?? 'Choose a 4-digit PIN. You can always change it in Settings.';
  };

  const bgColors = themeColors.backgroundGradient;

  // ── Dot row ───────────────────────────────────────────────────────────────
  const renderDots = () => (
    <Animated.View style={[styles.dotRow, dotStyle]}>
      {[0, 1, 2, 3].map((i) => {
        const filled = currentPin.length > i;
        const showCheck = matched && filled;
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
          >
            {showCheck && (
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
            )}
          </View>
        );
      })}
    </Animated.View>
  );

  // ── Numpad ────────────────────────────────────────────────────────────────
  const disabled = saving || phase === 'success' || matched;

  const renderNumpad = () => (
    <View style={styles.numpad}>
      {/* Rows 1-3: 1-2-3 / 4-5-6 / 7-8-9 */}
      {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row) => (
        <View key={row[0]} style={styles.numRow}>
          {row.map((n) => (
            <Pressable
              key={n}
              onPress={() => handleDigit(n)}
              disabled={disabled || currentPin.length >= 4}
              style={({ pressed }) => [
                styles.numKey,
                {
                  backgroundColor: pressed
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.12)',
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Text style={styles.numKeyText}>{n}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      {/* Row 4: [empty] 0 [backspace] */}
      <View style={styles.numRow}>
        {/* Spacer */}
        <View style={[styles.numKey, { backgroundColor: 'transparent' }]} />

        <Pressable
          onPress={() => handleDigit(0)}
          disabled={disabled || currentPin.length >= 4}
          style={({ pressed }) => [
            styles.numKey,
            {
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(255,255,255,0.12)',
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Text style={styles.numKeyText}>0</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={disabled || currentPin.length === 0}
          style={({ pressed }) => [
            styles.numKey,
            {
              backgroundColor: pressed
                ? 'rgba(255,255,255,0.20)'
                : 'transparent',
              opacity: (disabled || currentPin.length === 0) ? 0.35 : 1,
            },
          ]}
        >
          <Delete size={24} color="rgba(255,255,255,0.85)" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={bgColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
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

            {/* Top area: companion + heading */}
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
                {renderDots()}
              </Animated.View>
            )}

            {/* Numpad — hidden on success */}
            {phase !== 'success' && renderNumpad()}
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
    gap: 16,
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
  // ── Numpad ─────────────────────────────────────────────────────────────────
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
