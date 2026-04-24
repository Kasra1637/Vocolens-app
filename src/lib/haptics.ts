/**
 * Centralized haptics utility following iOS HIG best practices.
 *
 * All calls are wrapped in try/catch so they silently no-op on web
 * or any platform where expo-haptics is unavailable.
 */
import * as Haptics from 'expo-haptics';

/** Subtle tap: navigation links, info buttons, passive actions. */
export const tapHaptic = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
};

/** Selection: choosing an option, picking an item from a list. */
export const selectHaptic = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
};

/** Confirm/submit: primary CTAs, saving data, completing a step. */
export const confirmHaptic = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
};

/** Heavy: start/stop recording, long-press, destructive confirmations. */
export const heavyHaptic = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch {}
};

/** Tab bar switch — light so it stays subtle on frequent use. */
export const tabSwitchHaptic = () => {
  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
};

/** Success: completed action, unlocked milestone, valid PIN. */
export const successHaptic = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
};

/** Error: failed action, incorrect PIN, invalid input. */
export const errorHaptic = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
};

/** Warning: approaching a limit, non-critical alert. */
export const warningHaptic = () => {
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
};

/** Scroll pickers, segmented controls, drag snapping. */
export const selectionHaptic = () => {
  try { Haptics.selectionAsync(); } catch {}
};

/** Milestone / major achievement — success pulse + medium follow-up. */
export const celebrationHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }, 120);
  } catch {}
};
