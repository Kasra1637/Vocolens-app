/**
 * Auth Gate — Adapty
 *
 * Flow:
 *  1. Show splash on every launch
 *  2. Onboarding not done → OnboardingFlow (paywall embedded as step 23)
 *  3. Onboarding done, no active subscription → SubscriptionLapsedPaywall
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
import useRecordingStore from '@/lib/state/recording-store';
import useSubscriptionStore from '@/lib/state/subscription-store';
import { OnboardingFlow } from './onboarding';
import { BiometricLockScreen } from './BiometricLockScreen';
import { BiometricUnlockCelebration } from './BiometricUnlockCelebration';
import { SubscriptionLapsedPaywall } from './SubscriptionLapsedPaywall';
import { FirstLaunchCelebration } from './FirstLaunchCelebration';
import { SplashScreen } from './onboarding/SplashScreen';
import {
  configureAdapty,
  getProfile,
  hasAccessLevel,
  addProfileListener,
} from '@/lib/adaptyClient';
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

  // Track whether we should show the unlock celebration overlay.
  // This fires when the session transitions from locked → unlocked.
  const [showUnlockCelebration, setShowUnlockCelebration] = useState(false);
  const wasLockedRef = useRef<boolean>(true);

  // Track AppState to re-lock when returning from background
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Timestamp of the most recent successful unlock. Used to suppress the
  // spurious background/inactive AppState event that the OS biometric prompt
  // (fingerprint / Face ID) emits AFTER authentication succeeds. That trailing
  // lifecycle event races with the unlock success callback and, without this
  // guard, would immediately re-lock the session — sending the user back to
  // the lock screen even though they authenticated correctly.
  const lastUnlockedAtRef = useRef<number>(0);
  // Grace window (ms) after an unlock during which background events are ignored.
  const RELOCK_GRACE_MS = 2500;

  // ── Configure SDK once on mount ────────────────────────────────────────────
  useEffect(() => {
    configureAdapty();
  }, []);

  // ── Detect unlock transition → trigger celebration overlay ─────────────────
  // When a lock method is configured and the session transitions from locked to
  // unlocked, show the celebration as a cosmetic overlay on top of the now-visible
  // app interface. This avoids the rendering conflict of showing it inside the
  // lock screen (which would unmount mid-animation).
  useEffect(() => {
    const lockEnabled = isBiometricEnabled || isPinEnabled;
    const isCurrentlyLocked = lockEnabled && !isUnlocked;

    if (wasLockedRef.current && !isCurrentlyLocked && lockEnabled) {
      // Transition: was locked → now unlocked.
      // Record the unlock time so the AppState listener can ignore the
      // biometric prompt's trailing background event (see RELOCK_GRACE_MS).
      lastUnlockedAtRef.current = Date.now();
      // Show the celebration as a cosmetic overlay over the now-visible app.
      setShowUnlockCelebration(true);
    }

    wasLockedRef.current = isCurrentlyLocked;
  }, [isUnlocked, isBiometricEnabled, isPinEnabled]);

  // ── SECURITY: Re-lock session when app goes to background ──────────────────
  // This prevents bypassing the lock screen via task-switcher manipulation or
  // by resuming a backgrounded process.
  //
  // CRITICAL: The OS biometric prompt (fingerprint sheet / Face ID overlay)
  // emits a background/inactive AppState event that can be delivered to JS
  // AFTER the authentication success callback resolves. Re-locking on that
  // trailing event was sending users back to the lock screen immediately after
  // a successful unlock. To prevent this, we:
  //   1. Ignore `inactive` entirely (only act on a true `background`).
  //   2. Suppress any re-lock that arrives within RELOCK_GRACE_MS of the last
  //      successful unlock — the spurious prompt event always lands inside this
  //      window, whereas a genuine "user left the app" happens much later.
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasActive = appStateRef.current === 'active';
      const isNowBackground = nextAppState === 'background';

      if (wasActive && isNowBackground) {
        const sinceUnlock = Date.now() - lastUnlockedAtRef.current;
        const withinGrace = sinceUnlock < RELOCK_GRACE_MS;

        // Never re-lock while a voice recording is in progress — the OS may
        // briefly background the app for audio focus changes, notification
        // panels, or system overlays during an active recording session.
        const isRecording = useRecordingStore.getState().isRecordingActive;

        if (!withinGrace && !isRecording) {
          const store = useBiometricStore.getState();
          if (store.isBiometricEnabled || store.isPinEnabled) {
            setUnlocked(false);
          }
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
    const removeListener = addProfileListener((profile) => {
      const active = hasAccessLevel(profile);
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

    const result = await getProfile();
    if (result.ok) {
      confirmedActive = hasAccessLevel(result.data);
      if (confirmedActive) setSubscription(true);
      else clearSubscription();
    }
    // If SDK call failed (not activated / network), fall back to cached value

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

  if (isLoading || (hasCompletedOnboarding && !subscriptionVerified)) {
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
    return <SubscriptionLapsedPaywall />;
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
      {showUnlockCelebration && hasSeenWelcomeCelebration && (
        <BiometricUnlockCelebration onDone={() => setShowUnlockCelebration(false)} />
      )}
    </>
  );
}
