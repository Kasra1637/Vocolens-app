/**
 * Subscription Store
 *
 * Tracks whether the user has an active subscription.
 * Persisted to AsyncStorage so the app can gate access on subsequent launches.
 * Always re-verified against RevenueCat on app start.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionPlan = 'yearly' | 'monthly';

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
    },
  ),
);

export default useSubscriptionStore;
