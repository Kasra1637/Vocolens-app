/**
 * useAuthGuard — Defence-in-depth navigation guard
 *
 * This hook provides a secondary check that the user is authenticated before
 * any screen content renders. It should be used in top-level tab/screen layouts
 * as a fallback in case AuthGate's unmounting behaviour is somehow bypassed
 * (e.g. via deep link race conditions, developer tools, or framework bugs).
 *
 * Behaviour:
 *  - Returns `{ isLocked: true }` if any lock method is enabled but the session
 *    is not unlocked. The consuming component should render nothing (or a blank
 *    overlay) when `isLocked` is true.
 *  - Returns `{ isLocked: false }` when the user has successfully authenticated
 *    or no lock is configured.
 *
 * This does NOT replace AuthGate — it is a supplementary guard. AuthGate remains
 * the primary gatekeeper. This hook catches edge cases where React's reconciler
 * might retain a mounted screen tree briefly during a state transition.
 */

import useBiometricStore from '@/lib/state/biometric-store';

export function useAuthGuard(): { isLocked: boolean } {
  const isBiometricEnabled = useBiometricStore((s) => s.isBiometricEnabled);
  const isPinEnabled       = useBiometricStore((s) => s.isPinEnabled);
  const isUnlocked         = useBiometricStore((s) => s.isUnlocked);

  const lockEnabled = isBiometricEnabled || isPinEnabled;
  const isLocked = lockEnabled && !isUnlocked;

  return { isLocked };
}
