/**
 * Auth Gate — RevenueCat v10
 *
 * Flow:
 *  1. Show splash on every launch
 *  2. Onboarding not done → OnboardingFlow (paywall embedded as step 23)
 *  3. Onboarding done, no active subscription → StandalonePaywall
 *  4. Lock enabled but not unlocked this session → BiometricLockScreen
 *  5. All good → show app
 *
 * Security:
 *  - AppState listener re-locks the session when the app goes to background,
 *    ensuring the lock screen is presented again on foreground return.
 *  - The `isUnlocked` gate is evaluated synchronously from the store, so there
 *    is no render frame where children leak through during a state transition.
 *  - BackHandler in BiometricLockScreen / PinEntryScreen blocks Android back
 *    button dismissal of the lock screen.
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
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
  const setUnlocked        = useBiometricStore((s) => s.setUnlocked);

  const hasSubscription   = useSubscriptionStore((s) => s.hasSubscription);
  const setSubscription   = useSubscriptionStore((s) => s.setSubscription);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);

  const [showSplash,           setShowSplash]           = useState(true);
  const [subscriptionVerified, setSubscriptionVerified] = useState(false);

  // Track AppState to re-lock when returning from background
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Configure SDK once on mount ────────────────────────────────────────────
  useEffect(() => {
    configureRevenueCat();
  }, []);

  // ── SECURITY: Re-lock session when app goes to background ──────────────────
  // This prevents an attacker from using task-switcher manipulation or developer
  // tools to bypass the lock screen by killing/resuming the process. When the
  // app transitions from "active" to "background" (or "inactive" on iOS), we
  // revoke the unlocked state so re-authentication is required on return.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasActive = appStateRef.current === 'active';
      const isNowBackground = nextAppState === 'background' || nextAppState === 'inactive';

      if (wasActive && isNowBackground) {
        // Only re-lock if a lock method is configured. If neither biometric nor
        // PIN is enabled, there's nothing to re-lock.
        const store = useBiometricStore.getState();
        if (store.isBiometricEnabled || store.isPinEnabled) {
          setUnlocked(false);
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [setUnlocked]);

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

  // ── SECURITY GATE ──────────────────────────────────────────────────────────
  // This is the critical authentication boundary. The lock screen is rendered
  // whenever ANY lock method is enabled AND the session has not been explicitly
  // unlocked via successful biometric or PIN verification.
  //
  // Defence-in-depth: we read `isUnlocked` directly from the Zustand store
  // selector (synchronous, no async gap). The store's `partialize` config
  // ensures `isUnlocked` is NEVER persisted — it always starts as `false` on
  // app launch. Combined with the AppState listener above (which revokes
  // unlock on background), there is no window where a stale `true` can leak.
  //
  // The BiometricLockScreen and PinEntryScreen both block the Android hardware
  // back button, so navigation cannot dismiss them.
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
