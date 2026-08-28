/**
 * Subscription Store
 *
 * Locally cached subscription status, gated on re-verification against Adapty.
 *
 * Why the cache has an expiry
 * ---------------------------
 * The app is local-first, so there is no server-side entitlement record to
 * consult. That means this cache is the gate — and a bare persisted boolean has
 * two problems:
 *
 *   1. It never expires, so a value written once (by a lapsed subscriber, or by
 *      editing AsyncStorage on a rooted device) grants premium forever.
 *   2. It is trusted even when Adapty has since reported the subscription gone.
 *
 * The fix that does NOT require sending anything to a server: stamp the cache
 * with the time it was last confirmed by Adapty, and treat it as valid only
 * within a grace window. Inside the window the user keeps working offline (which
 * is essential for a journalling app). Past it, we require a fresh check.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionPlan = 'yearly' | 'quarterly' | 'monthly';

/**
 * How long an unverified cached entitlement stays trusted.
 *
 * Generous on purpose: a journal must keep working on a plane or with no
 * signal. Long enough not to punish honest offline users, short enough that a
 * tampered or lapsed flag doesn't grant indefinite free access.
 */
export const ENTITLEMENT_GRACE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface SubscriptionState {
  /** Locally cached subscription status (persisted). Re-verified on launch. */
  hasSubscription: boolean;
  /** Which plan the user subscribed to, if any. */
  planType: SubscriptionPlan | null;
  /** Epoch ms when Adapty last confirmed this entitlement. 0 = never. */
  lastVerifiedAt: number;
  /**
   * True once the user has ever held a confirmed subscription. Unlike
   * `hasSubscription` / `planType` / `lastVerifiedAt`, this is NEVER reset by
   * `clearSubscription()` — it is a one-way flag that distinguishes a
   * genuinely lapsed/expired subscriber (this stays true) from someone who
   * has never subscribed at all (this stays false). Used to decide whether a
   * user with no active subscription should see the win-back
   * "SubscriptionLapsedPaywall" or a first-time "PaywallScreen" offer.
   */
  hasEverSubscribed: boolean;

  setSubscription: (hasSubscription: boolean, planType?: SubscriptionPlan | null) => void;
  clearSubscription: () => void;
  /** Records a successful Adapty confirmation, refreshing the grace window. */
  markVerified: () => void;
  /**
   * True when the cached entitlement may still be trusted — i.e. it is set AND
   * was confirmed within the grace window. Use this for gating rather than
   * reading `hasSubscription` directly.
   */
  isEntitlementValid: () => boolean;
}

const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      hasSubscription: false,
      planType: null,
      lastVerifiedAt: 0,
      hasEverSubscribed: false,

      // Any write of a positive entitlement is, by definition, a fresh
      // confirmation — it comes either from a completed purchase, a successful
      // restore, or an Adapty profile check.
      setSubscription: (hasSubscription, planType = null) =>
        set({
          hasSubscription,
          planType,
          lastVerifiedAt: hasSubscription ? Date.now() : 0,
          // One-way: once true (a real entitlement was confirmed), it never
          // flips back, regardless of later expiry/cancellation.
          hasEverSubscribed: hasSubscription ? true : get().hasEverSubscribed,
        }),

      clearSubscription: () =>
        set({ hasSubscription: false, planType: null, lastVerifiedAt: 0 }),

      markVerified: () => set({ lastVerifiedAt: Date.now() }),

      isEntitlementValid: () => {
        const { hasSubscription, lastVerifiedAt } = get();
        if (!hasSubscription) return false;
        // Treat a missing/zero timestamp as stale: it means the flag was written
        // by an older build or injected directly into storage.
        if (!lastVerifiedAt) return false;
        return Date.now() - lastVerifiedAt < ENTITLEMENT_GRACE_MS;
      },
    }),
    {
      name: 'subscription-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted: any, version: number) => {
        const source = (persisted ?? {}) as Record<string, unknown>;
        // v0/v1 → v2: add lastVerifiedAt. Existing subscribers are given a fresh
        // window rather than being logged out by the upgrade; the next launch
        // re-verifies against Adapty anyway.
        if (version < 2) {
          const hasSubscription = Boolean(source.hasSubscription ?? false);
          return {
            hasSubscription,
            planType: (source.planType as SubscriptionPlan | null) ?? null,
            lastVerifiedAt: hasSubscription ? Date.now() : 0,
            // Unknown history at this point — see v2 → v3 step below, which
            // also runs for anyone migrating straight from v0/v1.
            hasEverSubscribed: Boolean(source.planType) || hasSubscription,
          };
        }
        if (version < 3) {
          // v2 → v3: backfill the one-way flag. We can't know true history
          // from a v2 record, but a non-null planType or a non-zero
          // lastVerifiedAt is strong evidence the user held a subscription
          // at some point — safer to assume "has subscribed" than to
          // misroute a real lapsed subscriber to onboarding.
          return {
            hasSubscription: Boolean(source.hasSubscription ?? false),
            planType: (source.planType as SubscriptionPlan | null) ?? null,
            lastVerifiedAt: Number(source.lastVerifiedAt) || 0,
            hasEverSubscribed:
              Boolean(source.hasSubscription) ||
              Boolean(source.planType) ||
              Boolean(Number(source.lastVerifiedAt)),
          };
        }
        return {
          hasSubscription: Boolean(source.hasSubscription ?? false),
          planType: (source.planType as SubscriptionPlan | null) ?? null,
          lastVerifiedAt: Number(source.lastVerifiedAt) || 0,
          hasEverSubscribed: Boolean(source.hasEverSubscribed ?? false),
        };
      },
    },
  ),
);

export default useSubscriptionStore;
