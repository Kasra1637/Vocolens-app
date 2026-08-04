// User Stats & Streaks Store with Persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats } from '../types';

export const USAGE_LIMIT_MINUTES = 300;

/**
 * Local mirror of the usage allowance — for DISPLAY ONLY.
 *
 * The 300-minute monthly cap is enforced by the backend (see
 * backend/src/worker.js), which measures the real audio duration Deepgram
 * reported. This copy exists so the UI can render a progress bar without a
 * round-trip; it is refreshed from GET /api/usage/status via
 * `setUsageFromServer`. Never treat it as authoritative — it lives in
 * AsyncStorage and can be edited or wiped by the user.
 *
 * What the mirrored figure counts: minutes the server has CHARGED, i.e. audio
 * that became a saved journal entry. Recordings that were transcribed and then
 * abandoned are held as server-side reservations and expire without ever being
 * charged, which is why a fresh install with no entries correctly shows the full
 * 300 minutes.
 */
interface UsageStats {
  totalMinutesUsed: number;      // lifetime total
  monthlyMinutesUsed: number;    // resets each calendar month
  lastResetMonth: string;        // "YYYY-MM" for monthly reset tracking
}

interface UserStatsStore {
  // State
  stats: UserStats;
  usage: UsageStats;
  lastUpdated: string | null;

  // Actions
  incrementEntries: () => void;
  addDuration: (seconds: number) => void;
  setUsageFromServer: (usage: {
    monthlyMinutesUsed: number;
    totalMinutesUsed?: number;
  }) => void;
  markUsageLimitReached: () => void;
  updateStreak: (entryDate: string) => void;
  resetStats: () => void;
  getStats: () => UserStats;
  getUsageMinutes: () => number;
  getRemainingMinutes: () => number;
  isAtLimit: () => boolean;
}

const DEFAULT_STATS: UserStats = {
  totalEntries: 0,
  totalDuration: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastEntryDate: null,
};

const DEFAULT_USAGE: UsageStats = {
  totalMinutesUsed: 0,
  monthlyMinutesUsed: 0,
  lastResetMonth: new Date().toISOString().slice(0, 7),
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * Whole-minute figures for the UI, derived from one another so that "X used" and
 * "Y left" always add up to the limit.
 *
 * Each screen used to floor `used` and `remaining` independently. Because the
 * server reports fractional minutes, that made the two disagree: 0.4 minutes of
 * real usage rendered as "0 / 300 min used" *and* "299 min remaining", so the
 * home screen appeared to withhold a minute the settings screen said was
 * unspent. Flooring once and subtracting removes the contradiction, and never
 * overstates what the user has spent.
 */
export function usageDisplayMinutes(usedMinutes: number): {
  used: number;
  remaining: number;
} {
  const clamped = Math.min(Math.max(usedMinutes, 0), USAGE_LIMIT_MINUTES);
  const used = Math.floor(clamped);
  return {
    used,
    // Only ever 0 when the allowance is genuinely exhausted — flooring `used`
    // must not make a user with seconds left believe they have none.
    remaining: clamped >= USAGE_LIMIT_MINUTES ? 0 : USAGE_LIMIT_MINUTES - used,
  };
}

const useUserStatsStore = create<UserStatsStore>()(
  persist(
    (set, get) => ({
      stats: DEFAULT_STATS,
      usage: DEFAULT_USAGE,
      lastUpdated: null,

      incrementEntries: () => {
        set((state) => ({
          stats: {
            ...state.stats,
            totalEntries: state.stats.totalEntries + 1,
          },
          lastUpdated: new Date().toISOString(),
        }));
      },

      addDuration: (seconds) => {
        set((state) => ({
          stats: {
            ...state.stats,
            totalDuration: state.stats.totalDuration + seconds,
          },
        }));
      },

      // NOTE: there is deliberately no `addUsageSeconds` here.
      //
      // A client-side incrementer existed for a while with no callers, left over
      // from when the app metered its own usage. Wiring it back up would double
      // count against the server's meter and, worse, would charge minutes at
      // recording time — the exact behaviour that made a user who had saved
      // nothing appear to have spent minutes. Usage only ever arrives here from
      // the server, via `setUsageFromServer`.

      /**
       * Overwrites the local usage mirror with the server's authoritative
       * figures.
       *
       * The backend owns the 300-minute cap; this store is only a cache for
       * rendering. This deliberately assigns rather than taking the maximum, so
       * the value can be corrected downward — e.g. at the start of a new
       * billing period, or when local storage has been tampered with.
       */
      setUsageFromServer: ({ monthlyMinutesUsed, totalMinutesUsed }) => {
        set((state) => {
          const prev = state.usage ?? DEFAULT_USAGE;
          return {
            usage: {
              monthlyMinutesUsed: Math.max(0, monthlyMinutesUsed),
              totalMinutesUsed: Math.max(
                0,
                totalMinutesUsed ?? prev.totalMinutesUsed,
              ),
              lastResetMonth: getCurrentMonth(),
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      },

      /** Pins the mirror to the cap after the server responds 402. */
      markUsageLimitReached: () => {
        set((state) => {
          const prev = state.usage ?? DEFAULT_USAGE;
          return {
            usage: {
              ...prev,
              monthlyMinutesUsed: Math.max(
                prev.monthlyMinutesUsed,
                USAGE_LIMIT_MINUTES,
              ),
              lastResetMonth: getCurrentMonth(),
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      },

      updateStreak: (entryDate) => {
        const { stats } = get();

        // Use local date strings (YYYY-MM-DD) consistently to avoid timezone issues.
        // new Date(isoString).toLocaleDateString('en-CA') → "YYYY-MM-DD" in local time.
        const toLocalDateStr = (iso: string) =>
          new Date(iso).toLocaleDateString('en-CA'); // "YYYY-MM-DD"

        const entryLocalDate = toLocalDateStr(entryDate);
        const lastLocalDate = stats.lastEntryDate
          ? toLocalDateStr(stats.lastEntryDate)
          : null;

        let newStreak = stats.currentStreak;

        if (!lastLocalDate) {
          // First ever entry
          newStreak = 1;
        } else if (entryLocalDate === lastLocalDate) {
          // Same calendar day — streak unchanged
          newStreak = stats.currentStreak;
        } else {
          // Compare calendar day difference using local date parts only
          const [ey, em, ed] = entryLocalDate.split('-').map(Number);
          const [ly, lm, ld] = lastLocalDate.split('-').map(Number);
          const entryMs = new Date(ey, em - 1, ed).getTime();
          const lastMs = new Date(ly, lm - 1, ld).getTime();
          const diffDays = Math.round((entryMs - lastMs) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak = stats.currentStreak + 1;
          } else if (diffDays > 1) {
            // Missed at least one day — reset streak
            newStreak = 1;
          }
          // diffDays < 0 shouldn't happen in normal flow, leave streak as-is
        }

        set((state) => ({
          stats: {
            ...state.stats,
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.stats.longestStreak),
            lastEntryDate: entryDate,
          },
        }));
      },

      resetStats: () => {
        set({ stats: DEFAULT_STATS, usage: DEFAULT_USAGE, lastUpdated: null });
      },

      getStats: () => get().stats,

      getUsageMinutes: () => get().usage?.monthlyMinutesUsed ?? 0,

      getRemainingMinutes: () => {
        const used = get().usage?.monthlyMinutesUsed ?? 0;
        return Math.max(0, USAGE_LIMIT_MINUTES - used);
      },

      isAtLimit: () => {
        const used = get().usage?.monthlyMinutesUsed ?? 0;
        return used >= USAGE_LIMIT_MINUTES;
      },
    }),
    {
      name: 'user-stats-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persisted: any, version: number) => {
        // v0/v1 → v2: dropped the legacy weeklyEntries / monthlyEntries
        //   counters. Those were incremented per entry but never reset on a new
        //   week/month, so their persisted values were meaningless lifetime
        //   totals. Both counts are now derived from entry timestamps.
        //
        // v2 → v3: dropped averageMood and topEmotions for the same reason —
        //   both were running values that could not be trusted:
        //     * averageMood divided by an already-incremented entry count, so it
        //       under-weighted each new entry and drifted toward its seed of 50.
        //     * topEmotions stored 5 bare names with no counts, and re-tallied
        //       that list against itself, so real frequency history was lost.
        //   Neither was ever decremented when an entry was deleted either. Both
        //   are now computed from the entries via analytics.ts.
        if (version < 3) {
          const stats: UserStats = {
            totalEntries: persisted?.stats?.totalEntries ?? 0,
            totalDuration: persisted?.stats?.totalDuration ?? 0,
            currentStreak: persisted?.stats?.currentStreak ?? 0,
            longestStreak: persisted?.stats?.longestStreak ?? 0,
            lastEntryDate: persisted?.stats?.lastEntryDate ?? null,
          };
          const usage: UsageStats = {
            totalMinutesUsed: persisted?.usage?.totalMinutesUsed ?? 0,
            monthlyMinutesUsed: persisted?.usage?.monthlyMinutesUsed ?? 0,
            lastResetMonth: persisted?.usage?.lastResetMonth ?? getCurrentMonth(),
          };
          return { stats, usage, lastUpdated: persisted?.lastUpdated ?? null };
        }
        return persisted;
      },
    }
  )
);

export default useUserStatsStore;

// Selector hooks
export const useCurrentStreak = () => useUserStatsStore((s) => s.stats.currentStreak);
export const useTotalEntries = () => useUserStatsStore((s) => s.stats.totalEntries);

export const useLongestStreak = () => useUserStatsStore((s) => s.stats.longestStreak);
export const useUsageMinutes = () => useUserStatsStore((s) => s.usage?.monthlyMinutesUsed ?? 0);
export const useRemainingMinutes = () => useUserStatsStore((s) => Math.max(0, USAGE_LIMIT_MINUTES - (s.usage?.monthlyMinutesUsed ?? 0)));
export const useIsAtLimit = () => useUserStatsStore((s) => (s.usage?.monthlyMinutesUsed ?? 0) >= USAGE_LIMIT_MINUTES);
