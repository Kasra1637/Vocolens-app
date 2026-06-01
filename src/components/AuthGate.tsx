/**
 * Auth Gate Component
 *
 * Wraps the app and handles onboarding + subscription gating.
 * Flow:
 *  1. Onboarding not done → show OnboardingFlow (paywall is step 16)
 *  2. Onboarding done, no active subscription → show StandalonePaywall
 *  3. Biometric lock enabled but not unlocked this session → lock screen
 *  4. All good → show app, then re-schedule notifications in background
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
import { getCustomerInfo, isRevenueCatEnabled } from '@/lib/revenuecatClient';
import { NotificationService } from '@/lib/services/notification-service';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setLoading = useAuthStore((s) => s.setLoading);

  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const notificationPreferences = useOnboardingStore((s) => s.notificationPreferences);

  const isBiometricEnabled = useBiometricStore((s) => s.isBiometricEnabled);
  const isUnlocked = useBiometricStore((s) => s.isUnlocked);

  const hasSubscription = useSubscriptionStore((s) => s.hasSubscription);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);

  // Tracks whether we've finished verifying against RevenueCat
  const [subscriptionVerified, setSubscriptionVerified] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, [hasCompletedOnboarding]);

  const checkAuthStatus = async () => {
    if (!hasCompletedOnboarding) {
      setLoading(false);
      return;
    }

    // Verify subscription against RevenueCat on every app start
    let confirmedActive = hasSubscription; // fall back to persisted value
    if (isRevenueCatEnabled()) {
      const result = await getCustomerInfo();
      if (result.ok) {
        confirmedActive = Boolean(result.data.entitlements.active?.['premium']);
        if (confirmedActive) {
          setSubscription(true);
        } else {
          clearSubscription();
        }
      }
      // If RevenueCat call failed (network issue), fall back to persisted value
    }

    setSubscriptionVerified(true);
    setAuthenticated(true);
    setLoading(false);

    // Re-schedule daily notifications only when the subscription is confirmed
    // active AND the user set notification preferences during onboarding.
    if (confirmedActive && notificationPreferences?.time && notificationPreferences.days.length > 0) {
      NotificationService.rescheduleFromPreferences(
        notificationPreferences.time,
        notificationPreferences.days,
        true,
      );
    }
  };

  if (isLoading || (hasCompletedOnboarding && !subscriptionVerified && isRevenueCatEnabled())) {
    return (
      <View className="flex-1 items-center justify-center bg-purple-50">
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  // Step 1 — onboarding not done yet (paywall is embedded as step 16)
  if (!hasCompletedOnboarding) {
    return <OnboardingFlow />;
  }

  // Step 2 — onboarding done but no active subscription → show standalone paywall
  if (!hasSubscription) {
    return <StandalonePaywall />;
  }

  // Step 3 — biometric lock enabled but not unlocked this session → lock screen
  if (isBiometricEnabled && !isUnlocked) {
    return <BiometricLockScreen />;
  }

  return <>{children}</>;
}
