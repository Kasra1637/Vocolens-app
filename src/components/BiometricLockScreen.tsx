/**
 * BiometricLockScreen
 *
 * Flow (biometric path):
 *  App opens → biometric fires immediately (no welcome screen, no delay)
 *  → Success → celebration (which shows the warm greeting + companion)
 *  → app opens.
 *  → Cancelled / failed → PIN screen → celebration → app opens.
 *
 * Flow (PIN-only path):
 *  Biometric never set up → PIN entry → celebration → app opens.
 *
 * Flow (invalidation path):
 *  Fingerprints changed → PIN verification → re-register biometric → app.
 *
 * The welcome screen ("Welcome back, [Name]. Your journal is ready for you.")
 * has been removed entirely. The celebration already carries that greeting:
 *   "Good to see you, [Name]. / Your journal is here. Ready when you are."
 * Removing the welcome screen eliminates the collision where the welcome
 * screen was visible underneath the celebration overlay on the PIN path,
 * and removes the Knox-dialog window-of-opportunity on Android.
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
  | 'loading'        // async capability check in progress (shown briefly on mount)
  | 'pin_fallback'   // biometric failed/cancelled/unavailable → enter PIN
  | 'pin_setup'      // no PIN exists after invalidation → create one
  | 'reregistering'; // re-enrolment prompt after PIN verified

export function BiometricLockScreen() {
  const setUnlocked                = useBiometricStore((s) => s.setUnlocked);
  const isBiometricEnabled         = useBiometricStore((s) => s.isBiometricEnabled);
  const needsPinReAuth             = useBiometricStore((s) => s.needsPinReAuth);
  const markBiometricInvalidated   = useBiometricStore((s) => s.markBiometricInvalidated);
  const clearBiometricInvalidation = useBiometricStore((s) => s.clearBiometricInvalidation);
  const enableBiometric            = useBiometricStore((s) => s.enableBiometric);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];
  const themeColor    = selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary;

  const [view,            setView]            = useState<LockView>('loading');
  const [authenticating,  setAuthenticating]  = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pinContext,      setPinContext]       = useState<{ title: string; subtitle: string } | null>(null);

  // ─── Biometric auth ───────────────────────────────────────────────────────
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

    // Cancelled or any failure — fall silently to PIN, no error shown
    const pinExists = await isPinSet();
    if (pinExists) {
      setPinContext({
        title: 'Enter your PIN',
        subtitle: 'Use your 4-digit PIN to unlock Vocolens.',
      });
      setView('pin_fallback');
    } else {
      errorHaptic();
      setUnlocked(true); // failsafe — no PIN set, shouldn't reach here post-onboarding
    }
  }, [authenticating, enableBiometric, markBiometricInvalidated, setUnlocked]);

  // ─── Mount: resolve path immediately, no settling delay ──────────────────
  useEffect(() => {
    (async () => {
      // PIN-only users — no biometric set up, go straight to PIN
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
      getBiometricTypeName(caps.supportedTypes);

      // Biometric invalidated from a previous session
      if (needsPinReAuth) {
        const pinExists = await isPinSet();
        setPinContext(pinExists
          ? { title: 'Verify with PIN',  subtitle: 'Your fingerprints have changed. Enter your PIN once to restore biometric unlock.' }
          : { title: 'Set a new PIN',    subtitle: 'Your fingerprints changed and no backup PIN is set. Create a PIN to continue.' }
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

      // Biometric available — fire immediately, no welcome screen, no delay.
      // The celebration carries the warm greeting when auth succeeds.
      runBiometricAuth();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── PIN success ──────────────────────────────────────────────────────────
  const handlePinFallbackSuccess = useCallback(async () => {
    // PIN-only device path → celebration carries the greeting
    if (!isBiometricEnabled) {
      successHaptic();
      setShowCelebration(true);
      return;
    }

    // Biometric invalidation recovery — re-register fingerprint
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
    <View style={{ flex: 1, backgroundColor: '#0F0E1A' }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>

          {/* Loading — shown briefly during the async capability check */}
          {view === 'loading' && (
            <View style={styles.content}>
              <View />
              <Animated.View
                entering={FadeIn.duration(400)}
                style={{ alignItems: 'center' }}
              >
                <EmotionalCompanion
                  state="idle"
                  size={90}
                  themeColor={themeColor}
                />
              </Animated.View>
              <View />
            </View>
          )}

          {/* Re-registration in progress */}
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
                <Text style={styles.heading}>Restoring biometric</Text>
                <Text style={styles.subtitle}>
                  Scan your fingerprint once to re-register it with Vocolens.
                </Text>
              </Animated.View>
              <View />
            </View>
          )}

          {/* PIN fallback */}
          {view === 'pin_fallback' && pinContext && (
            <PinEntryScreen
              onSuccess={handlePinFallbackSuccess}
              onBack={undefined}
              title={pinContext.title}
              subtitle={pinContext.subtitle}
            />
          )}

          {/* PIN setup — invalidation edge case */}
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

      {/* Celebration — renders over everything, carries the warm greeting */}
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
  heading: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 34,
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
