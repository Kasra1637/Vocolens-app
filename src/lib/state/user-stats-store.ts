// User Stats & Streaks Store with Persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserStats, EmotionType } from '../types';

export const USAGE_LIMIT_MINUTES = 300;

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
  addUsageSeconds: (seconds: number) => void;
  updateStreak: (entryDate: string) => void;
  updateMoodStats: (mood: number, emotions: EmotionType[]) => void;
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
  weeklyEntries: 0,
  monthlyEntries: 0,
  averageMood: 50,
  topEmotions: [],
};

const DEFAULT_USAGE: UsageStats = {
  totalMinutesUsed: 0,
  monthlyMinutesUsed: 0,
  lastResetMonth: new Date().toISOString().slice(0, 7),
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
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
            weeklyEntries: state.stats.weeklyEntries + 1,
            monthlyEntries: state.stats.monthlyEntries + 1,
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

      addUsageSeconds: (seconds) => {
        const minutes = seconds / 60;
        const currentMonth = getCurrentMonth();
        set((state) => {
          const prevUsage = state.usage ?? DEFAULT_USAGE;
          // Reset monthly counter if we have crossed into a new calendar month
          const isNewMonth = prevUsage.lastResetMonth !== currentMonth;
          const prevMonthly = isNewMonth ? 0 : prevUsage.monthlyMinutesUsed;
          return {
            usage: {
              totalMinutesUsed: prevUsage.totalMinutesUsed + minutes,
              monthlyMinutesUsed: prevMonthly + minutes,
              lastResetMonth: currentMonth,
            },
            lastUpdated: new Date().toISOString(),
          };
        });
      },

      updateStreak: (entryDate) => {
        const { stats } = get();
        const today = new Date(entryDate).toDateString();
        const lastEntry = stats.lastEntryDate
          ? new Date(stats.lastEntryDate).toDateString()
          : null;

        let newStreak = stats.currentStreak;

        console.log('[UserStatsStore] updateStreak called');
        console.log('[UserStatsStore] Entry date:', entryDate);
        console.log('[UserStatsStore] Today:', today);
        console.log('[UserStatsStore] Last entry:', lastEntry);
        console.log('[UserStatsStore] Current streak:', stats.currentStreak);

        if (!lastEntry) {
          newStreak = 1;
          console.log('[UserStatsStore] First entry ever, streak = 1');
        } else if (today === lastEntry) {
          newStreak = stats.currentStreak;
          console.log('[UserStatsStore] Same day entry, streak unchanged:', newStreak);
        } else {
          const lastDate = new Date(stats.lastEntryDate!);
          const currentDate = new Date(entryDate);
          const diffTime = currentDate.getTime() - lastDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          console.log('[UserStatsStore] Days difference:', diffDays);

          if (diffDays === 1) {
            newStreak = stats.currentStreak + 1;
            console.log('[UserStatsStore] Consecutive day! New streak:', newStreak);
          } else if (diffDays > 1) {
            newStreak = 1;
            console.log('[UserStatsStore] Streak broken, resetting to 1');
          }
        }

        console.log('[UserStatsStore] Final new streak:', newStreak);
        console.log('[UserStatsStore] Longest streak:', Math.max(newStreak, stats.longestStreak));

        set((state) => ({
          stats: {
            ...state.stats,
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, state.stats.longestStreak),
            lastEntryDate: entryDate,
          },
        }));
      },

      updateMoodStats: (mood, emotions) => {
        const { stats } = get();
        const totalMoodPoints =
          stats.averageMood * stats.totalEntries + mood;
        const newAverageMood = Math.round(
          totalMoodPoints / (stats.totalEntries + 1)
        );

        const emotionCounts = new Map<EmotionType, number>();
        stats.topEmotions.forEach((e) => {
          emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1);
        });
        emotions.forEach((e) => {
          emotionCounts.set(e, (emotionCounts.get(e) || 0) + 1);
        });

        const sortedEmotions = Array.from(emotionCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([emotion]) => emotion);

        set((state) => ({
          stats: {
            ...state.stats,
            averageMood: newAverageMood,
            topEmotions: sortedEmotions,
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
      version: 0,
      migrate: (persisted) => persisted as any,
    }
  )
);

export default useUserStatsStore;

// Selector hooks
export const useCurrentStreak = () => useUserStatsStore((s) => s.stats.currentStreak);
export const useTotalEntries = () => useUserStatsStore((s) => s.stats.totalEntries);
export const useAverageMood = () => useUserStatsStore((s) => s.stats.averageMood);
export const useLongestStreak = () => useUserStatsStore((s) => s.stats.longestStreak);
export const useUsageMinutes = () => useUserStatsStore((s) => s.usage?.monthlyMinutesUsed ?? 0);
export const useRemainingMinutes = () => useUserStatsStore((s) => Math.max(0, USAGE_LIMIT_MINUTES - (s.usage?.monthlyMinutesUsed ?? 0)));
export const useIsAtLimit = () => useUserStatsStore((s) => (s.usage?.monthlyMinutesUsed ?? 0) >= USAGE_LIMIT_MINUTES);
