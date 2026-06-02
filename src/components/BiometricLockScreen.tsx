/**
 * BiometricLockScreen
 *
 * App-level lock screen shown every time the user opens the app while biometric
 * lock is enabled.  Orchestrates the full adaptive authentication flow:
 *
 * Normal path
 * ────────────
 *  1. Auto-prompt fingerprint / Face ID on mount.
 *  2. On success → celebrate (first unlock) or go straight to the app.
 *  3. On cancel  → show manual "Try again" button.
 *  4. On failure → show error, let user retry.
 *
 * Biometric invalidation path  (user added/removed a fingerprint)
 * ────────────────────────────
 *  1. `authenticateWithBiometrics()` returns `invalidated: true`
 *     OR  `useBiometricStore().needsPinReAuth` is already true from a previous
 *     session where invalidation was detected.
 *  2. Screen switches to `PinEntryScreen` inline with an explanatory message.
 *  3. On PIN success:
 *     a. `clearBiometricInvalidation()` resets the persisted flag.
 *     b. `authenticateWithBiometrics()` is called once more to re-enrol the
 *        new biometric state (prompts the OS fingerprint sheet).
 *     c. On re-enrolment success → unlock and return to the app.
 *     d. If the user cancels re-enrolment → unlock anyway; next launch will
 *        try biometric normally again.
 *
 * PIN-only path  (biometric hardware unavailable / not enrolled)
 * ────────────────────────────────────────────────────────────────
 *  If `checkBiometricCapabilities()` returns `isAvailable: false` on mount
 *  AND a PIN is set → go straight to PIN entry so the user is never locked out.
 *  If no PIN is set either → let them through (failsafe; shouldn't happen in
 *  normal flow because BiometricSetupScreen always sets a PIN alongside biometric).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
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
  | 'loading'          // initial capability check + silent biometric attempt
  | 'pin_fallback'     // biometric failed/cancelled/unavailable → enter PIN
  | 'pin_setup'        // re-register: set up a fresh PIN before re-enrolment
  | 'reregistering';   // re-enrolment biometric prompt after PIN verified

export function BiometricLockScreen() {
  const setUnlocked                  = useBiometricStore((s) => s.setUnlocked);
  const isBiometricEnabled           = useBiometricStore((s) => s.isBiometricEnabled);
  const needsPinReAuth               = useBiometricStore((s) => s.needsPinReAuth);
  const markBiometricInvalidated     = useBiometricStore((s) => s.markBiometricInvalidated);
  const clearBiometricInvalidation   = useBiometricStore((s) => s.clearBiometricInvalidation);
  const enableBiometric              = useBiometricStore((s) => s.enableBiometric);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

  const [view,           setView]          = useState<LockView>('loading');
  const [biometricName,  setBiometricName]  = useState('Fingerprint');
  const [authenticating, setAuthenticating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pinContext,     setPinContext]     = useState<{ title: string; subtitle: string } | null>(null);

  // ─── Mount: resolve initial view ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // ── PIN-only users (no biometric ever set up) ──────────────────────────
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
      setBiometricName(getBiometricTypeName(caps.supportedTypes));

      // Was biometric already flagged as invalidated in a previous session?
      if (needsPinReAuth) {
        const pinExists = await isPinSet();
        if (pinExists) {
          setPinContext({
            title: 'Verify with PIN',
            subtitle: 'Your fingerprints have changed. Enter your PIN once to restore biometric unlock.',
          });
          setView('pin_fallback');
        } else {
          setPinContext({
            title: 'Set a new PIN',
            subtitle: 'Your fingerprints changed and no backup PIN is set. Create a PIN to continue.',
          });
          setView('pin_setup');
        }
        return;
      }

      // Biometric hardware unavailable — go straight to PIN, no biometric screen
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

      // ── Happy path: fire biometric silently while 'loading' is shown ───────
      // The OS prompt appears over the loading view, resolves, and we either
      // celebrate or fall through to PIN — no "Welcome back" biometric UI shown.
      runBiometricAuth();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Biometric prompt (fires silently over the loading view) ────────────
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
        setView('pin_fallback');
      } else {
        setPinContext({
          title: 'Set a backup PIN',
          subtitle: 'Your fingerprints changed and you have no backup PIN. Please set one to continue.',
        });
        setView('pin_setup');
      }
      return;
    }

    // Cancelled or failed — fall silently to PIN, no error screen shown
    const pinExists = await isPinSet();
    if (pinExists) {
      setPinContext({
        title: 'Enter your PIN',
        subtitle: 'Use your 4-digit PIN to unlock Vocolens.',
      });
      setView('pin_fallback');
    } else {
      // No PIN set — try biometric once more as a last resort
      errorHaptic();
      setAuthError('Authentication failed. Please try again.');
    }
  }, [authenticating, markBiometricInvalidated, setUnlocked]);

  // ─── After PIN success during invalidation flow OR PIN-only unlock ───────
  const handlePinFallbackSuccess = useCallback(async () => {
    // PIN-only user (biometric was never enabled) — unlock with celebration
    if (!isBiometricEnabled) {
      successHaptic();
      setShowCelebration(true);
      return;
    }

    // Biometric-invalidation recovery path:
    // 1. Clear the persistent invalidation flag
    clearBiometricInvalidation();

    // 2. Try to re-enrol the new biometric state
    setView('reregistering');
    const result = await authenticateWithBiometrics(
      'Scan your fingerprint to restore biometric unlock',
    );

    if (result.success) {
      enableBiometric();
      successHaptic();
      setShowCelebration(true);
    } else {
      // User cancelled or hardware issue — unlock anyway; biometric still enabled
      setUnlocked(true);
    }
  }, [
    isBiometricEnabled,
    clearBiometricInvalidation,
    enableBiometric,
    setUnlocked,
  ]);

  // ─── After PIN setup (no-PIN edge-case) ──────────────────────────────────
  const handlePinSetupComplete = useCallback(async () => {
    clearBiometricInvalidation();
    // Re-run biometric prompt to re-register
    setView('reregistering');
    const result = await authenticateWithBiometrics(
      'Scan your fingerprint to restore biometric unlock',
    );
    if (result.success) {
      enableBiometric();
      successHaptic();
      setUnlocked(true);
    } else {
      setUnlocked(true);
    }
  }, [clearBiometricInvalidation, enableBiometric, setUnlocked]);

  // ─── Celebration done ─────────────────────────────────────────────────────
  const handleCelebrationDone = useCallback(() => {
    setUnlocked(true);
  }, [setUnlocked]);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const bgColors = themeColors.backgroundGradient;

  const renderLoading = () => (
    <View style={styles.content}>
      <View />
      <Animated.View entering={FadeIn.duration(300)} style={{ alignItems: 'center', gap: 12 }}>
        <EmotionalCompanion
          state="idle"
          size={80}
          themeColor={selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary}
        />
        <Text style={styles.subtitle}>Checking security…</Text>
      </Animated.View>
      <View />
    </View>
  );

  const renderReregistering = () => (
    <View style={styles.content}>
      <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', gap: 20 }}>
        <EmotionalCompanion
          state="processing"
          size={90}
          themeColor={selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary}
        />
        <Text style={styles.title}>Restoring biometric</Text>
        <Text style={styles.subtitle}>
          Scan your fingerprint once to re-register it with Vocolens.
        </Text>
      </Animated.View>
      <View />
      <View />
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
          {view === 'loading'       && renderLoading()}
          {view === 'reregistering' && renderReregistering()}

          {view === 'pin_fallback' && pinContext && (
            <PinEntryScreen
              onSuccess={handlePinFallbackSuccess}
              onBack={undefined}
              title={pinContext.title}
              subtitle={pinContext.subtitle}
            />
          )}

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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
});
