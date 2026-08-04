/**
 * Usage Service — reads the server-authoritative monthly allowance, and tells
 * the server when a recording actually became a journal entry.
 *
 * The 300-minute cap is a cost-control mechanism, so the Worker owns it:
 *
 *   * The Worker measures the real audio duration reported by Deepgram inside
 *     POST /api/transcribe. The app never reports a duration — that is
 *     deliberate, since a modified client would simply report zero.
 *   * GET /api/usage/status is the single source of truth. The local Zustand
 *     store is a display mirror, refreshed from here, and is NOT trusted for
 *     enforcement.
 *
 * ── Minutes are charged on save, not on transcribe ──────────────────────────
 *
 * Transcribing and saving are separate steps, and users abandon the flow in
 * between: the transcript comes back empty, the reflection screen is backed out
 * of, analysis fails, or a transport error makes the app re-upload the same
 * audio. When /api/transcribe charged immediately, every one of those spent
 * minutes the user never got an entry for.
 *
 * So /api/transcribe now only *reserves* the duration and returns an opaque
 * `usageTicket`. This module holds that ticket against the recording's audio URI
 * and redeems it via POST /api/usage/commit once the entry has been persisted
 * (see `createJournalEntry`). Tickets that are never redeemed expire server-side,
 * so an abandoned recording costs the user nothing.
 *
 * Note what the client does and does not control: it decides *whether* a
 * reservation became an entry, never *how long* it was. The seconds stay
 * server-side, so this cannot be used to under-report usage — the worst a
 * modified client can do is decline to commit, which the Worker already bounds
 * by counting live reservations against the cap.
 */

import useUserStatsStore from '../state/user-stats-store';
import { getDeviceId } from '../device-id';
import { apiFetch } from './client';

export interface UsageStatus {
  /**
   * Minutes charged this period — i.e. audio that became a saved entry.
   * Excludes reservations still awaiting commit, which is why a user who has
   * recorded but saved nothing correctly sees the full allowance.
   */
  monthlyMinutesUsed: number;
  totalMinutesUsed: number;
  limitMinutes: number;
  remainingMinutes: number;
  /** Reserved-but-uncommitted minutes. Counts toward the cap, not the display. */
  pendingMinutes?: number;
  isAtLimit: boolean;
  /** Billing period, "YYYY-MM" (UTC). */
  period?: string;
  /** ISO timestamp at which the allowance resets. */
  resetsAt?: string;
}

/** Machine-readable error code the Worker returns once the cap is reached. */
export const LIMIT_REACHED_CODE = 'monthly_limit_reached';

/**
 * Fetches the authoritative balance and mirrors it into the local store.
 *
 * Unlike the previous implementation, this OVERWRITES the local value rather
 * than taking the higher of the two. Taking the maximum meant local state could
 * never be corrected downward — including at the start of a new month.
 */
export async function syncUsageFromBackend(): Promise<UsageStatus | null> {
  try {
    const deviceId = await getDeviceId();
    const response = await apiFetch('/api/usage/status', {
      headers: { 'X-Device-Id': deviceId },
    });

    if (!response.ok) {
      console.warn('[UsageService] Status fetch failed:', response.status);
      return null;
    }

    const data = (await response.json()) as UsageStatus;
    applyServerUsage(data);
    return data;
  } catch (err) {
    console.warn('[UsageService] Backend unreachable:', err);
    return null;
  }
}

/**
 * Mirrors a server usage payload into the local store.
 *
 * Also called with the `usage` object that POST /api/transcribe returns, so the
 * UI reflects the new balance immediately after a recording without a second
 * round-trip.
 */
export function applyServerUsage(usage: Partial<UsageStatus> | null | undefined): void {
  if (!usage || typeof usage.monthlyMinutesUsed !== 'number') return;
  useUserStatsStore.getState().setUsageFromServer({
    monthlyMinutesUsed: usage.monthlyMinutesUsed,
    totalMinutesUsed:
      typeof usage.totalMinutesUsed === 'number' ? usage.totalMinutesUsed : undefined,
  });
}

/**
 * Marks the local mirror as exhausted after the server returns 402.
 *
 * Ensures the UI blocks immediately even if the 402 body could not be parsed.
 */
export function applyLimitReached(usage?: Partial<UsageStatus> | null): void {
  if (usage && typeof usage.monthlyMinutesUsed === 'number') {
    applyServerUsage(usage);
    return;
  }
  useUserStatsStore.getState().markUsageLimitReached();
}

// ─── Reservation tickets ─────────────────────────────────────────────────────

/**
 * Outstanding reservations, keyed by the recording's audio URI.
 *
 * Keyed by audio URI rather than held in a single variable because transcription
 * and saving happen on different screens (home → reflection), and because a
 * re-transcribed recording must supersede its own earlier reservation rather
 * than leave two tickets both eligible to be charged.
 *
 * In-memory only, deliberately: a ticket that doesn't survive an app restart is
 * a ticket the user is never charged for, which is the safe direction to fail.
 */
const pendingTickets = new Map<string, string>();

/**
 * Cap on tracked reservations. Bounds memory if a user records repeatedly
 * without saving; the evicted ticket is simply never charged, and the server
 * expires it.
 */
const MAX_TRACKED_TICKETS = 8;

/**
 * Associates a reservation with the recording it belongs to.
 *
 * Re-transcribing the same file replaces the previous ticket, so the abandoned
 * first attempt expires uncharged instead of being billed alongside the retry.
 */
export function rememberUsageTicket(
  audioUri: string | null | undefined,
  ticket: string | null | undefined,
): void {
  if (!audioUri || !ticket) return;

  pendingTickets.delete(audioUri);
  pendingTickets.set(audioUri, ticket);

  while (pendingTickets.size > MAX_TRACKED_TICKETS) {
    const oldest = pendingTickets.keys().next();
    if (oldest.done) break;
    pendingTickets.delete(oldest.value);
  }
}

/** Removes and returns the reservation for a recording, if any. */
function takeUsageTicket(audioUri: string | null | undefined): string | null {
  if (!audioUri) return null;
  const ticket = pendingTickets.get(audioUri) ?? null;
  if (ticket) pendingTickets.delete(audioUri);
  return ticket;
}

/**
 * Charges the recording's reserved minutes now that its entry has been saved.
 *
 * Call this only AFTER the entry has been persisted — that ordering is the whole
 * point. Safe to call with no outstanding reservation (a text-only entry, or an
 * entry whose transcript came from a previous app session): it just refreshes
 * the mirror.
 *
 * Never throws. A journal entry the user already saved must not fail, or appear
 * to fail, because a usage counter could not be updated; a failed commit lets
 * the reservation expire, which under-counts in the user's favour.
 */
export async function commitUsageForAudio(
  audioUri: string | null | undefined,
): Promise<void> {
  const ticket = takeUsageTicket(audioUri);
  if (!ticket) {
    await syncUsageFromBackend().catch(() => {});
    return;
  }

  try {
    const response = await apiFetch('/api/usage/commit', {
      method: 'POST',
      body: JSON.stringify({ ticket }),
    });

    if (!response.ok) {
      console.warn('[UsageService] Commit failed:', response.status);
      await syncUsageFromBackend().catch(() => {});
      return;
    }

    const data = (await response.json()) as Partial<UsageStatus>;
    applyServerUsage(data);
  } catch (err) {
    console.warn('[UsageService] Commit request failed:', err);
    await syncUsageFromBackend().catch(() => {});
  }
}


/**
 * Thrown when the Worker refuses a request because the monthly allowance is
 * exhausted (HTTP 402).
 *
 * Callers must treat this as terminal and NOT retry — the answer will not
 * change until the allowance resets.
 */
export class UsageLimitError extends Error {
  readonly code = LIMIT_REACHED_CODE;
  readonly usage?: Partial<UsageStatus>;

  constructor(message: string, usage?: Partial<UsageStatus>) {
    super(message);
    this.name = 'UsageLimitError';
    this.usage = usage;
  }
}

/**
 * Converts a 402 response into a `UsageLimitError`, updating the local mirror
 * so the UI blocks immediately. Returns null if the response isn't a 402.
 */
export async function usageLimitErrorFrom(
  response: Response,
): Promise<UsageLimitError | null> {
  if (response.status !== 402) return null;

  let body: { message?: string; usage?: Partial<UsageStatus> } | null = null;
  try {
    body = await response.json();
  } catch {
    // Body wasn't JSON — still treat it as a limit response.
  }

  applyLimitReached(body?.usage);
  return new UsageLimitError(
    body?.message ??
      "You've reached your monthly voice minutes. Your allowance resets on the 1st.",
    body?.usage,
  );
}
