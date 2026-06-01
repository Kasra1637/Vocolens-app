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
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Fingerprint, Lock } from 'lucide-react-native';
import { successHaptic, tapHaptic, errorHaptic } from '@/lib/haptics';
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
import { PinSetupScreen } from '@/components/PinSetupScreen';

// ─── View states ──────────────────────────────────────────────────────────────
type LockView =
  | 'loading'          // initial capability check
  | 'biometric'        // normal fingerprint prompt
  | 'pin_fallback'     // biometric invalidated → enter PIN to re-register
  | 'pin_setup'        // re-register: set up a fresh PIN before re-enrolment
  | 'reregistering'    // re-enrolment biometric prompt after PIN verified
  | 'unlocked';        // success, celebration in progress

export function BiometricLockScreen() {
  const setUnlocked                  = useBiometricStore((s) => s.setUnlocked);
  const disableBiometric             = useBiometricStore((s) => s.disableBiometric);
  const needsPinReAuth               = useBiometricStore((s) => s.needsPinReAuth);
  const markBiometricInvalidated     = useBiometricStore((s) => s.markBiometricInvalidated);
  const clearBiometricInvalidation   = useBiometricStore((s) => s.clearBiometricInvalidation);
  const hasSeenFirstUnlockCelebration = useBiometricStore((s) => s.hasSeenFirstUnlockCelebration);
  const markFirstUnlockCelebrationSeen = useBiometricStore((s) => s.markFirstUnlockCelebrationSeen);
  const enableBiometric              = useBiometricStore((s) => s.enableBiometric);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeColors   = THEME_COLORS[selectedTheme];

  const [view,          setView]          = useState<LockView>('loading');
  const [biometricName, setBiometricName] = useState('Fingerprint');
  const [authError,     setAuthError]     = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  // Message shown above the PIN screen during fallback / re-registration
  const [pinContext,    setPinContext]     = useState<{ title: string; subtitle: string } | null>(null);

  // Gentle pulse animation for the fingerprint badge
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.00, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // ─── Mount: resolve initial view ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const caps = await checkBiometricCapabilities();
      setBiometricName(getBiometricTypeName(caps.supportedTypes));

      // Was biometric already flagged as invalidated in a previous session?
      if (needsPinReAuth) {
        const pinExists = await isPinSet();
        if (pinExists) {
          setPinContext({
            title: 'Verify with PIN',
            subtitle:
              'Your fingerprints have changed. Enter your PIN once to restore biometric unlock.',
          });
          setView('pin_fallback');
        } else {
          // Edge-case: invalidated and no PIN — re-setup PIN
          setPinContext({
            title: 'Set a new PIN',
            subtitle:
              'Your fingerprints changed and no backup PIN is set. Create a PIN to continue.',
          });
          setView('pin_setup');
        }
        return;
      }

      // Normal start — check biometric availability
      if (!caps.isAvailable) {
        const pinExists = await isPinSet();
        if (pinExists) {
          setPinContext({
            title: 'Enter your PIN',
            subtitle: 'Fingerprint is unavailable on this device right now.',
          });
          setView('pin_fallback');
        } else {
          // No biometrics, no PIN — failsafe: let user in
          setUnlocked(true);
        }
        return;
      }

      setView('biometric');
      runBiometricAuth();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Biometric prompt ─────────────────────────────────────────────────────
  const runBiometricAuth = useCallback(async () => {
    if (authenticating) return;
    setAuthenticating(true);
    setAuthError('');

    const result = await authenticateWithBiometrics('Unlock Vocolens');
    setAuthenticating(false);

    if (result.success) {
      successHaptic();
      if (!hasSeenFirstUnlockCelebration) {
        setShowCelebration(true);
      } else {
        setUnlocked(true);
      }
      return;
    }

    if (result.invalidated) {
      // Biometric credential was invalidated (fingerprint added/removed).
      markBiometricInvalidated();
      const pinExists = await isPinSet();
      if (pinExists) {
        setPinContext({
          title: 'Verify with PIN',
          subtitle:
            'Your fingerprints have changed. Enter your PIN once to restore biometric unlock.',
        });
        setView('pin_fallback');
      } else {
        setPinContext({
          title: 'Set a backup PIN',
          subtitle:
            'Your fingerprints changed and you have no backup PIN. Please set one to continue.',
        });
        setView('pin_setup');
      }
      return;
    }

    if (result.cancelled) {
      setAuthError('Tap to try again.');
      return;
    }

    if (!result.available) {
      // Hardware gone / not enrolled unexpectedly
      const pinExists = await isPinSet();
      if (pinExists) {
        setPinContext({
          title: 'Enter your PIN',
          subtitle: 'Fingerprint is unavailable. Use your PIN to unlock.',
        });
        setView('pin_fallback');
      } else {
        setUnlocked(true);
      }
      return;
    }

    errorHaptic();
    setAuthError('Authentication failed. Tap to try again.');
  }, [authenticating, hasSeenFirstUnlockCelebration, markBiometricInvalidated, setUnlocked]);

  // ─── After PIN success during invalidation flow ───────────────────────────
  const handlePinFallbackSuccess = useCallback(async () => {
    // 1. Clear the persistent invalidation flag
    clearBiometricInvalidation();

    // 2. Try to re-enrol the new biometric state silently
    setView('reregistering');
    const result = await authenticateWithBiometrics(
      'Scan your fingerprint to restore biometric unlock',
    );

    if (result.success) {
      // Re-registration succeeded — re-enable biometric (marks isUnlocked too)
      enableBiometric();
      successHaptic();
      if (!hasSeenFirstUnlockCelebration) {
        setShowCelebration(true);
      } else {
        setUnlocked(true);
      }
    } else {
      // User cancelled or hardware issue — just unlock, biometric still enabled
      setUnlocked(true);
    }
  }, [
    clearBiometricInvalidation,
    enableBiometric,
    hasSeenFirstUnlockCelebration,
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
    markFirstUnlockCelebrationSeen();
    setUnlocked(true);
  }, [markFirstUnlockCelebrationSeen, setUnlocked]);

  // ─── Render helpers ───────────────────────────────────────────────────────
  const bgColors = themeColors.backgroundGradient;

  const renderBiometricView = () => (
    <View style={styles.content}>
      {/* Top: companion + greeting */}
      <Animated.View
        entering={FadeInDown.duration(500)}
        style={{ alignItems: 'center', gap: 16 }}
      >
        <EmotionalCompanion
          state="idle"
          size={90}
          themeColor={selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary}
        />
        <View style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Lock size={16} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            <Text style={styles.title}>Welcome back</Text>
          </View>
          <Text style={styles.subtitle}>
            Unlock with {biometricName} to continue
          </Text>
        </View>
      </Animated.View>

      {/* Middle: fingerprint badge */}
      <Animated.View
        entering={FadeInDown.delay(120).duration(500)}
        style={{ alignItems: 'center', gap: 18 }}
      >
        <Pressable
          onPress={runBiometricAuth}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
          accessibilityLabel={`Unlock with ${biometricName}`}
          accessibilityRole="button"
        >
          <Animated.View style={[styles.fingerprintBadge, pulseStyle]}>
            <Fingerprint size={64} color="#FFFFFF" strokeWidth={1.6} />
          </Animated.View>
        </Pressable>

        {authError ? (
          <Animated.Text entering={FadeIn.duration(200)} style={styles.errorText}>
            {authError}
          </Animated.Text>
        ) : (
          <Text style={styles.hintText}>
            {authenticating ? 'Waiting for you…' : `Tap the icon to use ${biometricName}`}
          </Text>
        )}
      </Animated.View>

      {/* Bottom: retry CTA + PIN fallback link */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        style={{ alignItems: 'center', width: '100%', gap: 16 }}
      >
        <Pressable
          onPress={runBiometricAuth}
          disabled={authenticating}
          style={({ pressed }) => [
            styles.cta,
            { opacity: pressed || authenticating ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.ctaText}>
            {authenticating ? 'Authenticating…' : `Unlock with ${biometricName}`}
          </Text>
        </Pressable>

        {/* Always offer PIN as an opt-in fallback */}
        <Pressable
          onPress={async () => {
            tapHaptic();
            const pinExists = await isPinSet();
            if (pinExists) {
              setPinContext({ title: 'Enter your PIN', subtitle: 'Use your 4-digit PIN to unlock Vocolens.' });
              setView('pin_fallback');
            } else {
              // No PIN set — use biometric only (shouldn't happen post-onboarding)
              setAuthError('No PIN set. Please use biometric to unlock.');
            }
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
        >
          <Text style={styles.pinLinkText}>Use PIN instead</Text>
        </Pressable>
      </Animated.View>
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
          {view === 'biometric'     && renderBiometricView()}
          {view === 'reregistering' && renderReregistering()}

          {view === 'pin_fallback' && pinContext && (
            <PinEntryScreen
              onSuccess={handlePinFallbackSuccess}
              onBack={undefined /* no back from lock screen */}
              title={pinContext.title}
              subtitle={pinContext.subtitle}
            />
          )}

          {view === 'pin_setup' && pinContext && (
            <PinSetupScreen
              onComplete={handlePinSetupComplete}
              title={pinContext.title}
              subtitle={pinContext.subtitle}
            />
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* One-time first-unlock celebration overlay */}
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
  fingerprintBadge: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,120,120,1)',
    textAlign: 'center',
  },
  hintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  cta: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  pinLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textDecorationLine: 'underline',
  },
});
