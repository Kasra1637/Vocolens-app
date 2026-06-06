/**
 * Auth Gate — RevenueCat v10
 *
 * Flow:
 *  1. Show splash on every launch
 *  2. Onboarding not done → OnboardingFlow (paywall embedded as step 23)
 *  3. Onboarding done, no active subscription → StandalonePaywall
 *  4. Lock enabled but not unlocked this session → BiometricLockScreen
 *  5. All good → show app
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/lib/state/auth-store';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useBiometricStore from '@/lib/state/biometric-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import { OnboardingFlow } from './onboarding';
import { BiometricLockScreen } from './BiometricLockScreen';
import { StandalonePaywall } from './StandalonePaywall';
import { FirstLaunchCelebration } from './FirstLaunchCelebration';
import { SplashScreen } from './onboarding/SplashScreen';
import {
  configureRevenueCat,
  getCustomerInfo,
  hasEntitlement,
  isRevenueCatEnabled,
  addCustomerInfoListener,
} from '@/lib/revenueCatClient';
import { NotificationService } from '@/lib/services/notification-service';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const isLoading        = useAuthStore((s) => s.isLoading);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setLoading       = useAuthStore((s) => s.setLoading);

  const hasCompletedOnboarding    = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const notificationPreferences   = useOnboardingStore((s) => s.notificationPreferences);
  const hasSeenWelcomeCelebration = useOnboardingStore((s) => s.hasSeenWelcomeCelebration);
  const markWelcomeCelebrationSeen = useOnboardingStore((s) => s.markWelcomeCelebrationSeen);

  const isBiometricEnabled = useBiometricStore((s) => s.isBiometricEnabled);
  const isPinEnabled       = useBiometricStore((s) => s.isPinEnabled);
  const isUnlocked         = useBiometricStore((s) => s.isUnlocked);

  const hasSubscription   = useSubscriptionStore((s) => s.hasSubscription);
  const setSubscription   = useSubscriptionStore((s) => s.setSubscription);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);

  const [showSplash,           setShowSplash]           = useState(true);
  const [subscriptionVerified, setSubscriptionVerified] = useState(false);

  // ── Configure SDK once on mount ────────────────────────────────────────────
  useEffect(() => {
    configureRevenueCat();
  }, []);

  // ── Verify subscription on launch ─────────────────────────────────────────
  useEffect(() => {
    checkAuthStatus();
  }, [hasCompletedOnboarding]);

  // ── Listen for real-time subscription changes (e.g. renewal, cancellation) ─
  useEffect(() => {
    const removeListener = addCustomerInfoListener((info) => {
      const active = hasEntitlement(info);
      if (active) setSubscription(true);
      else clearSubscription();
    });
    return removeListener;
  }, []);

  const checkAuthStatus = async () => {
    if (!hasCompletedOnboarding) {
      setLoading(false);
      return;
    }

    let confirmedActive = hasSubscription; // cached fallback

    if (isRevenueCatEnabled()) {
      const result = await getCustomerInfo();
      if (result.ok) {
        confirmedActive = hasEntitlement(result.data);
        if (confirmedActive) setSubscription(true);
        else clearSubscription();
      }
      // If SDK call failed (network), fall back to cached value
    }

    setSubscriptionVerified(true);
    setAuthenticated(true);
    setLoading(false);

    if (
      confirmedActive &&
      notificationPreferences?.time &&
      notificationPreferences.days.length > 0
    ) {
      NotificationService.rescheduleFromPreferences(
        notificationPreferences.time,
        notificationPreferences.days,
        true,
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading || (hasCompletedOnboarding && !subscriptionVerified && isRevenueCatEnabled())) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0E1A' }}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  // Splash on every launch
  if (showSplash) {
    return (
      <View style={{ flex: 1 }}>
        <SplashScreen onDone={() => setShowSplash(false)} />
      </View>
    );
  }

  // Onboarding
  if (!hasCompletedOnboarding) {
    return <OnboardingFlow />;
  }

  // No active subscription
  if (!hasSubscription) {
    return <StandalonePaywall />;
  }

  // Biometric / PIN lock
  if ((isBiometricEnabled || isPinEnabled) && !isUnlocked) {
    return <BiometricLockScreen />;
  }

  return (
    <>
      {children}
      {!hasSeenWelcomeCelebration && (
        <FirstLaunchCelebration onDone={markWelcomeCelebrationSeen} />
      )}
    </>
  );
}
