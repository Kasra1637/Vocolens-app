/**
 * Subscription Store
 *
 * Tracks whether the user has an active subscription.
 * Persisted to AsyncStorage so the app can gate access on subsequent launches.
 * Always re-verified against Adapty on app start.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionPlan = 'yearly' | 'quarterly' | 'monthly';

interface SubscriptionState {
  /** Locally cached subscription status (persisted). Always re-verified on launch. */
  hasSubscription: boolean;
  /** Which plan the user subscribed to, if any. */
  planType: SubscriptionPlan | null;

  setSubscription: (hasSubscription: boolean, planType?: SubscriptionPlan | null) => void;
  clearSubscription: () => void;
}

const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      hasSubscription: false,
      planType: null,

      setSubscription: (hasSubscription, planType = null) =>
        set({ hasSubscription, planType }),

      clearSubscription: () =>
        set({ hasSubscription: false, planType: null }),
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: any, version: number) => {
        // v0 → v1: ensure hasSubscription and planType exist with safe defaults.
        if (version < 1) {
          return {
            hasSubscription: persisted?.hasSubscription ?? false,
            planType: persisted?.planType ?? null,
          };
        }
        return persisted;
      },
    },
  ),
);

export default useSubscriptionStore;
