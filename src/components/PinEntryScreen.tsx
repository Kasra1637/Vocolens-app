/**
 * PinEntryScreen
 *
 * Full-screen 4-digit PIN entry used as the biometric fallback.
 * Renders inline (not as a Modal) inside BiometricLockScreen so transitions
 * are seamless and the user is never shown a blank background.
 *
 * Props
 * ─────
 * onSuccess       Called after the PIN is verified successfully.
 * onBack          Optional — if supplied a back/cancel arrow is shown.
 * title           Override the heading (e.g. different wording for re-auth).
 * subtitle        Override the subheading.
 * maxAttempts     Defaults to 5. After that the screen shows a locked message.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Lock, ArrowLeft } from 'lucide-react-native';
import { successHaptic } from '@/lib/haptics';
import { verifyPin } from '@/lib/auth-service';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { PinKeypad } from '@/components/PinKeypad';

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
  title    = 'Enter your PIN',
  subtitle = 'Use your 4-digit PIN to unlock Vocolens.',
  maxAttempts = 5,
}: PinEntryScreenProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

  const [currentPin,  setCurrentPin]  = useState('');
  const [errorShake,  setErrorShake]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [verifying,   setVerifying]   = useState(false);
  const [attempts,    setAttempts]    = useState(0);

  const isLocked = attempts >= maxAttempts;

  const triggerShake = useCallback(() => {
    setErrorShake(true);
    setTimeout(() => setErrorShake(false), 700);
  }, []);

  const handleDigit = useCallback(async (digit: string) => {
    if (verifying || isLocked) return;

    const next = currentPin + digit;
    setCurrentPin(next);
    setErrorMsg('');

    if (next.length < 4) return;

    setVerifying(true);
    const valid = await verifyPin(next);
    setVerifying(false);

    if (valid) {
      successHaptic();
      onSuccess();
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
    setTimeout(() => setCurrentPin(''), 600);
  }, [currentPin, verifying, isLocked, attempts, maxAttempts, onSuccess, triggerShake]);

  const handleDelete = useCallback(() => {
    if (verifying || isLocked) return;
    setCurrentPin((p) => p.slice(0, -1));
    setErrorMsg('');
  }, [verifying, isLocked]);

  return (
    <View style={styles.container}>

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
        <View style={[styles.lockBadge, { borderColor: `${themeColors.primary}60`, backgroundColor: `${themeColors.primary}20` }]}>
          <Lock size={36} color="#FFFFFF" strokeWidth={1.8} />
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={styles.heading}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </Animated.View>

      {/* Keypad or locked state */}
      {isLocked ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ alignItems: 'center', paddingHorizontal: 24, gap: 16 }}
        >
          <Text style={styles.lockedText}>
            Too many failed attempts. Please restart the app or wait a moment and try again.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(80).duration(350)}
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
            disabled={verifying}
            errorShake={errorShake}
            themeColor={themeColors.primary}
            isDark
          />
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
  keypadWrap: {
    width: '100%',
    gap: 10,
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
