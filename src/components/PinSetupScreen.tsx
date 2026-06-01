/**
 * PinSetupScreen
 *
 * Full-screen 4-digit PIN creation with a confirm step.
 * Used in two contexts:
 *   1. Onboarding — called from BiometricSetupScreen after biometric is enabled,
 *      so every user who opts into the lock also has a PIN safety net.
 *   2. Re-registration — shown after a successful PIN fallback when the OS
 *      invalidated the previous biometric token (user changed fingerprints).
 *
 * Flow: create (enter 4 digits) → confirm (re-enter 4 digits) → success → onComplete()
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { successHaptic, confirmHaptic } from '@/lib/haptics';
import { setPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { PinKeypad } from '@/components/PinKeypad';
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
  const themeColors   = THEME_COLORS[selectedTheme];

  const [phase,       setPhase]       = useState<Phase>('create');
  const [firstPin,    setFirstPin]    = useState('');
  const [currentPin,  setCurrentPin]  = useState('');
  const [errorShake,  setErrorShake]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [saving,      setSaving]      = useState(false);

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

  const triggerShake = useCallback(() => {
    setErrorShake(true);
    setTimeout(() => setErrorShake(false), 700);
  }, []);

  const handleDigit = useCallback(async (digit: string) => {
    if (saving) return;
    const next = currentPin + digit;
    setCurrentPin(next);
    setErrorMsg('');

    if (next.length < 4) return;

    // PIN now complete — advance phase after a brief visual pause
    if (phase === 'create') {
      confirmHaptic();
      setFirstPin(next);
      setTimeout(() => {
        setCurrentPin('');
        setPhase('confirm');
      }, 200);
      return;
    }

    // Confirm phase: verify match
    if (next !== firstPin) {
      triggerShake();
      setErrorMsg("PINs don't match — try again");
      setTimeout(() => setCurrentPin(''), 600);
      return;
    }

    // Match — save PIN
    setSaving(true);
    try {
      await setPin(next);
      successHaptic();
      setPhase('success');
      setTimeout(() => onComplete(), 1200);
    } catch {
      setErrorMsg('Could not save PIN. Please try again.');
      triggerShake();
      setSaving(false);
      setCurrentPin('');
    }
  }, [currentPin, phase, firstPin, saving, onComplete, triggerShake]);

  const handleDelete = useCallback(() => {
    if (saving) return;
    setCurrentPin((p) => p.slice(0, -1));
    setErrorMsg('');
  }, [saving]);

  const handleBack = useCallback(() => {
    if (phase === 'confirm') {
      setPhase('create');
      setCurrentPin('');
      setErrorMsg('');
    } else {
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

            {/* Middle: keypad or success badge */}
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
                style={styles.keypadWrap}
              >
                {errorMsg !== '' && (
                  <Animated.Text
                    entering={FadeIn.duration(200)}
                    style={styles.errorText}
                  >
                    {errorMsg}
                  </Animated.Text>
                )}
                <PinKeypad
                  pin={currentPin}
                  onDigit={handleDigit}
                  onDelete={handleDelete}
                  disabled={saving}
                  errorShake={errorShake}
                  themeColor={themeColors.primary}
                  isDark
                />
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
  keypadWrap: {
    width: '100%',
    gap: 12,
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
