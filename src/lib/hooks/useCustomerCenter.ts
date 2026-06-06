/**
 * useCustomerCenter
 *
 * Presents the RevenueCat Customer Center (subscription management UI)
 * from any screen. Call openCustomerCenter() from a button press.
 *
 * The Customer Center lets users:
 *  - Cancel, change, or manage their subscription
 *  - Request refunds (iOS)
 *  - Contact support
 *  - Restore purchases
 *
 * Requires react-native-purchases-ui ≥ 8.7.0 (installed as v10.2.2)
 */

import { useCallback, useState } from "react";
import useSubscriptionStore from "@/lib/state/subscription-store";
import { hasEntitlement, getCustomerInfo } from "@/lib/revenueCatClient";

// Lazy-load RevenueCatUI so Expo Go doesn't crash
let RevenueCatUI: typeof import("react-native-purchases-ui").default | null = null;
try {
  RevenueCatUI = require("react-native-purchases-ui").default;
} catch {
  // not available (Expo Go / web)
}

export function useCustomerCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const setSubscription   = useSubscriptionStore((s) => s.setSubscription);
  const clearSubscription = useSubscriptionStore((s) => s.clearSubscription);

  const openCustomerCenter = useCallback(async () => {
    if (!RevenueCatUI) {
      console.log("[CustomerCenter] RevenueCatUI not available");
      return;
    }

    setIsOpen(true);
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: async ({ customerInfo }) => {
            if (hasEntitlement(customerInfo)) setSubscription(true);
          },
          onRestoreFailed: ({ error }) => {
            console.log("[CustomerCenter] restore failed:", error?.message);
          },
          onShowingManageSubscriptions: () => {
            console.log("[CustomerCenter] showing manage subscriptions");
          },
        },
      });
    } catch (e: any) {
      console.log("[CustomerCenter] presentCustomerCenter error:", e?.message);
    } finally {
      setIsOpen(false);
      // Re-sync subscription state after user dismisses Customer Center
      const result = await getCustomerInfo();
      if (result.ok) {
        if (hasEntitlement(result.data)) setSubscription(true);
        else clearSubscription();
      }
    }
  }, []);

  return { openCustomerCenter, isOpen };
}
