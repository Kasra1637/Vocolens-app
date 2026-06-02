/**
 * BiometricLockScreen
 *
 * Flow (biometric path):
 *  1. Welcome screen renders immediately — companion character + warm greeting.
 *  2. After a short settling delay (400ms iOS / 600ms Android), biometric auth
 *     fires automatically in the background. User does not tap anything.
 *  3. Success → celebration → app.
 *  4. Cancelled / failed → PIN screen → celebration → app.
 *
 * Flow (PIN-only path):
 *  Biometric never set up → go straight to PIN entry.
 *
 * Flow (invalidation path):
 *  Fingerprints changed → PIN verification → re-register biometric → app.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { successHaptic, errorHaptic } from '@/lib/haptics';
import useBiometricStore from '@/lib/state/biometric-store';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import {
  authenticateWithBiometrics,
  checkBiometricCapabilities,
  getBiometricTypeName,
  isPinSet,
} from '@/lib/auth-service';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { BiometricUnlockCelebration } from '@/components/BiometricUnlockCelebration';
import { PinEntryScreen } from '@/components/PinEntryScreen';

// ─── View states ──────────────────────────────────────────────────────────────
type LockView =
  | 'welcome'        // companion + greeting shown while biometric fires silently
  | 'pin_fallback'   // biometric failed/cancelled/unavailable → enter PIN
  | 'pin_setup'      // no PIN exists after invalidation → create one
  | 'reregistering'; // re-enrolment prompt after PIN verified

// Delay before triggering the OS biometric sheet — gives the welcome screen
// time to fully render and settle so the OS prompt doesn't appear abruptly.
const BIOMETRIC_DELAY_MS = Platform.OS === 'android' ? 600 : 400;

export function BiometricLockScreen() {
  const setUnlocked                = useBiometricStore((s) => s.setUnlocked);
  const isBiometricEnabled         = useBiometricStore((s) => s.isBiometricEnabled);
  const needsPinReAuth             = useBiometricStore((s) => s.needsPinReAuth);
  const markBiometricInvalidated   = useBiometricStore((s) => s.markBiometricInvalidated);
  const clearBiometricInvalidation = useBiometricStore((s) => s.clearBiometricInvalidation);
  const enableBiometric            = useBiometricStore((s) => s.enableBiometric);

  const selectedTheme  = useOnboardingStore((s) => s.selectedTheme);
  const userName       = useOnboardingStore((s) => s.userName);
  const themeColors    = THEME_COLORS[selectedTheme];
  const themeColor     = selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary;

  const [view,            setView]            = useState<LockView>('welcome');
  const [authenticating,  setAuthenticating]  = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pinContext,      setPinContext]       = useState<{ title: string; subtitle: string } | null>(null);

  const firstName = userName?.split(' ')[0] ?? null;

  // ─── Silent biometric auth ────────────────────────────────────────────────
  const runBiometricAuth = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);

    const result = await authenticateWithBiometrics('Unlock Vocolens');
    setAuthenticating(false);

    if (result.success) {
      enableBiometric();
      successHaptic();
      setShowCelebration(true);
      return;
    }

    if (result.invalidated) {
      markBiometricInvalidated();
      const pinExists = await isPinSet();
      if (pinExists) {
        setPinContext({
          title: 'Verify with PIN',
          subtitle: 'Your fingerprints have changed. Enter your PIN once to restore biometric unlock.',
        });
      } else {
        setPinContext({
          title: 'Set a backup PIN',
          subtitle: 'Your fingerprints changed and you have no backup PIN. Please set one to continue.',
        });
        setView('pin_setup');
        return;
      }
      setView('pin_fallback');
      return;
    }

    // Cancelled or any failure — fall silently to PIN
    const pinExists = await isPinSet();
    if (pinExists) {
      setPinContext({
        title: 'Enter your PIN',
        subtitle: 'Use your 4-digit PIN to unlock Vocolens.',
      });
      setView('pin_fallback');
    } else {
      errorHaptic();
      // No PIN set — failsafe unlock (shouldn't occur post-onboarding)
      setUnlocked(true);
    }
  }, [authenticating, enableBiometric, markBiometricInvalidated, setUnlocked]);

  // ─── Mount ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // PIN-only users — skip biometric, go straight to PIN entry
      if (!isBiometricEnabled) {
        const pinExists = await isPinSet();
        if (pinExists) {
          setPinContext({
            title: 'Enter your PIN',
            subtitle: 'Use your 4-digit PIN to unlock Vocolens.',
          });
          setView('pin_fallback');
        } else {
          setUnlocked(true);
        }
        return;
      }

      const caps = await checkBiometricCapabilities();
      getBiometricTypeName(caps.supportedTypes); // side-effect: name used for re-reg text

      // Already flagged as invalidated from a previous session
      if (needsPinReAuth) {
        const pinExists = await isPinSet();
        setPinContext(pinExists
          ? { title: 'Verify with PIN', subtitle: 'Your fingerprints have changed. Enter your PIN once to restore biometric unlock.' }
          : { title: 'Set a new PIN',   subtitle: 'Your fingerprints changed and no backup PIN is set. Create a PIN to continue.' }
        );
        setView(pinExists ? 'pin_fallback' : 'pin_setup');
        return;
      }

      // Hardware unavailable — go straight to PIN
      if (!caps.isAvailable) {
        const pinExists = await isPinSet();
        if (pinExists) {
          setPinContext({
            title: 'Enter your PIN',
            subtitle: 'Fingerprint is unavailable on this device right now.',
          });
          setView('pin_fallback');
        } else {
          setUnlocked(true);
        }
        return;
      }

      // ── Happy path ────────────────────────────────────────────────────────
      // Welcome screen is already showing. Wait for it to settle, then fire
      // the biometric prompt silently. The user sees the companion and greeting
      // while the OS sheet appears — no buttons, no instructions needed.
      setTimeout(runBiometricAuth, BIOMETRIC_DELAY_MS);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── PIN success ──────────────────────────────────────────────────────────
  const handlePinFallbackSuccess = useCallback(async () => {
    if (!isBiometricEnabled) {
      successHaptic();
      setShowCelebration(true);
      return;
    }

    clearBiometricInvalidation();
    setView('reregistering');
    const result = await authenticateWithBiometrics(
      'Scan your fingerprint to restore biometric unlock',
    );
    enableBiometric();
    successHaptic();
    if (result.success) {
      setShowCelebration(true);
    } else {
      setUnlocked(true);
    }
  }, [isBiometricEnabled, clearBiometricInvalidation, enableBiometric, setUnlocked]);

  const handlePinSetupComplete = useCallback(async () => {
    clearBiometricInvalidation();
    setView('reregistering');
    const result = await authenticateWithBiometrics(
      'Scan your fingerprint to restore biometric unlock',
    );
    enableBiometric();
    successHaptic();
    if (result.success) {
      setShowCelebration(true);
    } else {
      setUnlocked(true);
    }
  }, [clearBiometricInvalidation, enableBiometric, setUnlocked]);

  const handleCelebrationDone = useCallback(() => {
    setUnlocked(true);
  }, [setUnlocked]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>

          {/* ── Welcome screen (biometric fires silently behind this) ── */}
          {view === 'welcome' && (
            <View style={styles.content}>
              {/* Top spacer */}
              <View />

              {/* Companion + greeting */}
              <Animated.View
                entering={FadeInDown.duration(500)}
                style={{ alignItems: 'center', gap: 20 }}
              >
                <EmotionalCompanion
                  state="idle"
                  size={110}
                  themeColor={themeColor}
                />
                <Animated.View
                  entering={FadeIn.delay(180).duration(600)}
                  style={{ alignItems: 'center', gap: 8 }}
                >
                  <Text style={styles.greeting}>
                    {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
                  </Text>
                  <Text style={styles.subtitle}>
                    Your journal is ready for you.
                  </Text>
                </Animated.View>
              </Animated.View>

              {/* Bottom spacer */}
              <View />
            </View>
          )}

          {/* ── Re-registration in progress ── */}
          {view === 'reregistering' && (
            <View style={styles.content}>
              <View />
              <Animated.View
                entering={FadeIn.duration(400)}
                style={{ alignItems: 'center', gap: 20 }}
              >
                <EmotionalCompanion
                  state="processing"
                  size={100}
                  themeColor={themeColor}
                />
                <Text style={styles.greeting}>Restoring biometric</Text>
                <Text style={styles.subtitle}>
                  Scan your fingerprint once to re-register it with Vocolens.
                </Text>
              </Animated.View>
              <View />
            </View>
          )}

          {/* ── PIN fallback ── */}
          {view === 'pin_fallback' && pinContext && (
            <PinEntryScreen
              onSuccess={handlePinFallbackSuccess}
              onBack={undefined}
              title={pinContext.title}
              subtitle={pinContext.subtitle}
            />
          )}

          {/* ── PIN setup (invalidation edge case) ── */}
          {view === 'pin_setup' && pinContext && (
            <PinEntryScreen
              mode="setup"
              onComplete={handlePinSetupComplete}
              title={pinContext.title}
              subtitle={pinContext.subtitle}
            />
          )}

        </SafeAreaView>
      </LinearGradient>

      {/* Celebration overlay */}
      {showCelebration && (
        <BiometricUnlockCelebration onDone={handleCelebrationDone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 60,
  },
  greeting: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 36,
    opacity: 0.92,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
