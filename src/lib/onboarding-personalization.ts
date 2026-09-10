/**
 * Onboarding confirmation-screen personalization helper.
 *
 * Inserts the user's first name (collected at onboarding step 5,
 * NameCollectionScreen — before any of the 5 confirmation/insight screens
 * that use this) as a vocative into a piece of copy, the same way
 * notification-service.ts's personalizeTitle() does for push notifications.
 * Pulled out into its own module so both call sites share one
 * implementation instead of drifting.
 *
 * Returns the text unchanged if no name is available (skipped name step,
 * store read failure, etc.) — the generic copy is always a safe fallback.
 */

/**
 * Reads the first name the user gave during onboarding, first-word-only
 * (mirrors the convention used for the Insights greeting and for push
 * notification titles) so a user who typed a full name is still addressed
 * by just their first name.
 */
export function getOnboardingFirstName(): string | null {
  try {
    // Lazy require to avoid pulling the onboarding store into bundles that
    // don't need it and to sidestep any import-order edge cases.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const useOnboardingStore = require('@/lib/state/onboarding-store').default;
    const userName = useOnboardingStore.getState().userName as string | null;
    if (!userName) return null;
    const first = userName.trim().split(/\s+/)[0];
    return first || null;
  } catch {
    return null;
  }
}

/**
 * Inserts ", {name}" as a vocative directly before any trailing punctuation,
 * so the result reads as grammatically correct regardless of whether the
 * base text is a statement ("You'll start to see your triggers coming." ->
 * "You'll start to see your triggers coming, Kasra."), ends mid-clause with
 * a comma already ("...instead of being blindsided" -> unaffected, no
 * trailing punctuation to anchor to — see below), or has no terminal
 * punctuation at all ("Great choice" -> "Great choice, Kasra"). Returns the
 * text unchanged if no name is available.
 */
export function personalizeInsightText(text: string, name: string | null): string {
  if (!name) return text;
  const trailingPunctuation = text.match(/([.!?]+)\s*$/);
  if (trailingPunctuation) {
    const punctuation = trailingPunctuation[1];
    const base = text.slice(0, text.length - punctuation.length).replace(/\s+$/, '');
    return `${base}, ${name}${punctuation}`;
  }
  return `${text}, ${name}`;
}
