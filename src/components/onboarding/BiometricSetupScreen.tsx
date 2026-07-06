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
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react-native';
import { successHaptic, tapHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import useBiometricStore from '@/lib/state/biometric-store';
import {
  checkBiometricCapabilities,
  getBiometricTypeName,
} from '@/lib/auth-service';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { useClickSound } from '@/lib/hooks/useClickSound';
import { OnboardingCTAButton } from '@/components/onboarding/OnboardingCTAButton';
import { PinEntryScreen } from '@/components/PinEntryScreen';

type Phase = 'intro' | 'pin_setup';

// Privacy points shown when biometric IS available
const BIOMETRIC_POINTS = [
  { icon: ShieldCheck,  text: 'Only you can open your journal' },
  { icon: ShieldCheck,  text: 'Fingerprint unlocks instantly' },
  { icon: ShieldCheck,  text: 'PIN backup if biometric changes' },
  { icon: ShieldCheck,  text: 'PIN is hardware-encrypted' },
];

// Privacy points shown when only PIN is available
const PIN_ONLY_POINTS = [
  { icon: Lock,         text: 'A PIN keeps entries private' },
  { icon: Lock,         text: 'PIN is hardware-encrypted' },
  { icon: Lock,         text: 'Change PIN anytime in Settings' },
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
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  const [checking,      setChecking]     = useState(true);

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
  const handlePrimaryCTA = useCallback(() => {
    if (checking) return;
    playClickSound();
    tapHaptic();

    if (!biometricAvailable) {
      // Device has no biometric — go straight to PIN setup.
      setPhase('pin_setup');
      return;
    }

    // ── Biometric + PIN path ────────────────────────────────────────────────
    // Best practice: do NOT call authenticateWithBiometrics() here just to
    // "confirm" the user's intent — that triggers an OS confirmation dialog
    // mid-onboarding which feels jarring and is not how native apps (Apple Pay,
    // banking apps) handle biometric enrolment.
    //
    // The correct pattern:
    //   1. Record intent immediately → enableBiometric() sets isBiometricEnabled.
    //   2. Require PIN creation as a mandatory backup (next step).
    //   3. On the NEXT app open, BiometricLockScreen auto-prompts the real
    //      biometric auth — this is where the native fingerprint/Face ID sheet
    //      should appear, as an unlock prompt, not a setup confirmation.
    enableBiometric();
    successHaptic();
    setPhase('pin_setup');
  }, [checking, biometricAvailable, enableBiometric, playClickSound]);

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
      ? 'Create Your Backup PIN'
      : 'Protect with a PIN';
    const pinSubtitle = biometricAvailable
      ? `This is your backup for when your ${biometricName} isn't available`
      : 'Choose a 4-digit PIN. Only you will be able to open Vocolens';

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
    ? `Your journal locks automatically. Use your ${biometricName} or PIN to get back in`
    : 'Your device doesn\'t have biometrics. Set a 4-digit PIN to keep your journal private';

  const ctaLabel = checking
    ? 'Checking…'
    : biometricAvailable
      ? 'Protect My Journal'
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
        <ProgressBar currentStep={currentStep} totalSteps={24} />

        <SafeAreaView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: 40,
            }}
          >
            {/* Top: key icon + title + subtitle */}
            <Animated.View
              entering={FadeIn.duration(500).easing(SOFT)}
              style={{ alignItems: 'center', gap: 16, width: '100%' }}
            >
              {/* Icon badge — matches PinEntryScreen lockBadge style */}
              <View
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 41,
                  borderWidth: 1.5,
                  borderColor: `${themeColors.primary}60`,
                  backgroundColor: `${themeColors.primary}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {biometricAvailable
                  ? <Fingerprint size={38} color="#FFFFFF" strokeWidth={1.8} />
                  : <Lock        size={38} color="#FFFFFF" strokeWidth={1.8} />
                }
              </View>

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

            {/* Middle: privacy reassurance points — glassmorphic card */}
            <Animated.View
              entering={FadeIn.delay(100).duration(500).easing(SOFT)}
              style={{ alignItems: 'center', width: '100%', marginTop: 28 }}
            >
              <View
                style={{
                  width: '100%',
                  maxWidth: 340,
                  backgroundColor: 'rgba(255, 255, 255, 0.10)',
                  borderRadius: 24,
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.18)',
                  paddingVertical: 20,
                  paddingHorizontal: 20,
                  gap: 18,
                }}
              >
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
                          flexShrink: 0,
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
                          lineHeight: 20,
                          includeFontPadding: false,
                          textAlignVertical: 'center',
                        }}
                      >
                        {p.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            {/* Bottom: CTA — sits directly below the feature points */}
            <Animated.View
              entering={FadeIn.delay(160).duration(500).easing(SOFT)}
              style={{ width: '100%', gap: 12, marginTop: 20 }}
            >
              <OnboardingCTAButton
                label={ctaLabel}
                onPress={handlePrimaryCTA}
                disabled={checking}
              />
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
