/**
 * Biometric Setup Screen  (Onboarding step 21)
 *
 * Offers the user to protect their journal with their Fingerprint / Face ID,
 * OR with a PIN when the device has no biometric hardware / biometric is turned off.
 *
 * Flows:
 *
 * A) Device HAS biometric available
 *    "Enable Fingerprint + PIN" →
 *      1. OS biometric prompt → on success, enableBiometric() called.
 *      2. Routes to PinSetupScreen (backup PIN).
 *      3. PIN saved → enablePin() → setHasCompletedOnboarding(true).
 *    "Maybe later" → onboarding completes with no lock.
 *
 * B) Device has NO biometric (hardware absent or turned off in settings)
 *    Screen shows "Set up a PIN" as the primary CTA instead.
 *    "Set up a PIN" → routes directly to PinSetupScreen.
 *    PIN saved → enablePin() → setHasCompletedOnboarding(true).
 *    "Maybe later" → onboarding completes with no lock.
 *
 * This ensures every user on every device always has the opportunity to set
 * up some form of app lock, and the PIN-only path is never skipped silently.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  Easing,
} from 'react-native-reanimated';
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { Fingerprint, Lock, Eye, KeyRound } from 'lucide-react-native';
import { successHaptic, tapHaptic, errorHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import useBiometricStore from '@/lib/state/biometric-store';
import {
  checkBiometricCapabilities,
  authenticateWithBiometrics,
  getBiometricTypeName,
} from '@/lib/auth-service';
import { EmotionalCompanion } from '@/components/EmotionalCompanion';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useClickSound } from '@/lib/hooks/useClickSound';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';
import { PinEntryScreen } from '@/components/PinEntryScreen';

type Phase = 'intro' | 'pin_setup';

// Privacy points shown when biometric IS available
const BIOMETRIC_POINTS = [
  { icon: Lock,         text: 'Only you can open your journal' },
  { icon: Eye,          text: 'No passwords to remember — just your fingerprint' },
  { icon: ShieldCheck,  text: 'PIN backup keeps you in if biometric changes' },
];

// Privacy points shown when only PIN is available
const PIN_ONLY_POINTS = [
  { icon: Lock,         text: 'Only you can open your journal' },
  { icon: KeyRound,     text: 'A 4-digit PIN keeps your entries private' },
  { icon: ShieldCheck,  text: 'You can always change your PIN in Settings' },
];

export function BiometricSetupScreen() {
  const selectedTheme             = useOnboardingStore((s) => s.selectedTheme);
  const currentStep               = useOnboardingStore((s) => s.currentStep);
  const setHasCompletedOnboarding = useOnboardingStore((s) => s.setHasCompletedOnboarding);
  const enableBiometric           = useBiometricStore((s) => s.enableBiometric);
  const enablePin                 = useBiometricStore((s) => s.enablePin);
  const themeColors               = THEME_COLORS[selectedTheme];
  const playClickSound            = useClickSound();

  const [phase,         setPhase]        = useState<Phase>('intro');
  const [biometricName, setBiometricName] = useState('Fingerprint');
  // True = device has biometric hardware AND fingerprints enrolled
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  // Stays true until the capability check resolves so we don't flash the wrong UI
  const [checking,      setChecking]     = useState(true);
  const [busy,          setBusy]         = useState(false);
  const [authError,     setAuthError]    = useState('');

  useEffect(() => {
    (async () => {
      const caps = await checkBiometricCapabilities();
      setBiometricName(getBiometricTypeName(caps.supportedTypes));
      setBiometricAvailable(caps.isAvailable);
      setChecking(false);
    })();
  }, []);

  const finishOnboarding = useCallback(() => {
    setTimeout(() => setHasCompletedOnboarding(true), 1300);
  }, [setHasCompletedOnboarding]);

  // ── Primary CTA ────────────────────────────────────────────────────────────
  const handlePrimaryCTA = useCallback(async () => {
    if (busy || checking) return;
    playClickSound();
    tapHaptic();

    if (!biometricAvailable) {
      // ── PIN-only path ──────────────────────────────────────────────────────
      // Device has no biometric; go straight to PIN setup.
      setPhase('pin_setup');
      return;
    }

    // ── Biometric + PIN path ───────────────────────────────────────────────
    setBusy(true);
    const result = await authenticateWithBiometrics('Confirm to enable app lock');
    setBusy(false);

    if (result.success) {
      enableBiometric();
      successHaptic();
      setPhase('pin_setup');
      return;
    }

    if (result.cancelled) {
      // User dismissed the OS prompt — stay on this screen so they can retry
      return;
    }

    errorHaptic();
    if (!result.available) {
      // Hardware disappeared mid-flow (very rare) — treat as PIN-only
      setBiometricAvailable(false);
      setPhase('pin_setup');
    } else {
      setAuthError("Couldn't verify your fingerprint. Please try again.");
    }
  }, [busy, checking, biometricAvailable, enableBiometric, playClickSound]);

  // ── Called by PinEntryScreen once PIN is saved ───────────────────────────
  const handlePinSaved = useCallback(() => {
    // Mark PIN as enabled in the store and finish onboarding immediately —
    // no intermediate "You're all set!" screen.
    enablePin();
    finishOnboarding();
  }, [enablePin, finishOnboarding]);

  // ─── Render ────────────────────────────────────────────────────────────────
  if (phase === 'pin_setup') {
    const pinTitle    = biometricAvailable
      ? 'Set a backup PIN'
      : 'Protect with a PIN';
    const pinSubtitle = biometricAvailable
      ? `If your ${biometricName} ever changes, you'll use this PIN to restore access.`
      : 'Choose a 4-digit PIN. Only you will be able to open Vocolens.';

    return (
      <PinEntryScreen
        mode="setup"
        onComplete={handlePinSaved}
        title={pinTitle}
        subtitle={pinSubtitle}
      />
    );
  }

  // ── Derive display strings ─────────────────────────────────────────────────
  const screenTitle = biometricAvailable
    ? 'Protect your journal'
    : 'Secure your journal';

  const screenSubtitle = biometricAvailable
    ? `Use ${biometricName} so only you can open Vocolens. We'll also set a backup PIN.`
    : 'Your device doesn\'t have biometrics. Set a 4-digit PIN to keep your journal private.';

  const ctaLabel = checking
    ? 'Checking…'
    : busy
      ? 'Waiting…'
      : biometricAvailable
        ? `Enable ${biometricName} + PIN`
        : 'Set up a PIN';

  const privacyPoints = biometricAvailable ? BIOMETRIC_POINTS : PIN_ONLY_POINTS;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={23} />

        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 40,
            }}
          >
            {/* Top: character + text */}
            <Animated.View
              entering={FadeIn.duration(500).easing(SOFT)}
              style={{ alignItems: 'center', gap: 16 }}
            >
              <EmotionalCompanion
                state="processing"
                size={80}
                themeColor={selectedTheme === 'darkMode' ? '#9370DB' : themeColors.primary}
              />
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text
                  style={{
                    fontFamily: 'Fraunces_700Bold',
                    fontSize: 30,
                    color: '#FFFFFF',
                    textAlign: 'center',
                    opacity: 0.92,
                    letterSpacing: 0.2,
                    lineHeight: 38,
                  }}
                >
                  {screenTitle}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.80)',
                    textAlign: 'center',
                    lineHeight: 22,
                    maxWidth: '90%',
                  }}
                >
                  {screenSubtitle}
                </Text>
              </View>
            </Animated.View>

            {/* Middle: icon badge + privacy reassurance points */}
            <Animated.View
              entering={FadeIn.delay(100).duration(500).easing(SOFT)}
              style={{ alignItems: 'center', gap: 24, width: '100%' }}
            >
              {/* Icon — fingerprint when available, key when PIN-only */}
              <View
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: 55,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255,255,255,0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {biometricAvailable
                  ? <Fingerprint size={56} color="#FFFFFF" strokeWidth={1.6} />
                  : <KeyRound    size={52} color="#FFFFFF" strokeWidth={1.6} />
                }
              </View>

              {/* Privacy reassurance points */}
              <View style={{ gap: 12, width: '100%', maxWidth: 340 }}>
                {privacyPoints.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <View
                      key={i}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={18} color="#FFFFFF" strokeWidth={2} />
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: 'Inter_400Regular',
                          fontSize: 14,
                          color: 'rgba(255,255,255,0.85)',
                          lineHeight: 19,
                        }}
                      >
                        {p.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Bottom: CTA */}
            <Animated.View
              entering={FadeIn.delay(160).duration(500).easing(SOFT)}
              style={{ width: '100%', gap: 12 }}
            >
              {authError ? (
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 13,
                    color: 'rgba(255,180,180,0.95)',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  {authError}
                </Text>
              ) : null}

              <OnboardingCTAButton
                label={ctaLabel}
                onPress={handlePrimaryCTA}
                disabled={busy || checking}
              />
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
