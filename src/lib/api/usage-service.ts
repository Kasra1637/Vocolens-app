/**
 * Usage Service — reads the server-authoritative monthly allowance.
 *
 * The 300-minute cap is a cost-control mechanism, so the Worker owns it:
 *
 *   * The Worker meters the real audio duration reported by Deepgram inside
 *     POST /api/transcribe. The app does not report usage and cannot influence
 *     the counter — that is deliberate, since a modified client would simply
 *     report zero.
 *   * GET /api/usage/status is the single source of truth. The local Zustand
 *     store is a display mirror, refreshed from here, and is NOT trusted for
 *     enforcement.
 *
 * Because of that, this module intentionally has no "record usage" function.
 * An earlier version POSTed a client-measured duration to /api/usage/record;
 * that endpoint no longer exists, and re-adding it would double-count against
 * the server-side meter.
 */

import useUserStatsStore from '../state/user-stats-store';
import { getDeviceId } from '../device-id';
import { apiFetch } from './client';

export interface UsageStatus {
  monthlyMinutesUsed: number;
  totalMinutesUsed: number;
  limitMinutes: number;
  remainingMinutes: number;
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
