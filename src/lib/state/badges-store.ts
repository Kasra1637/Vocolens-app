// Badges & Achievements Store with Persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Badge, BadgeCategory, BadgeRarity } from '../types';

// Badge definitions
export const BADGE_DEFINITIONS: Omit<Badge, 'progress' | 'unlocked' | 'unlockDate'>[] = [
  // Streak badges
  {
    id: 'streak-3',
    title: '3-Day Streak',
    description: 'Journal for 3 consecutive days',
    category: 'streak',
    rarity: 'common',
    icon: 'flame',
    requirement: 'Journal 3 days in a row',
    tip: 'Set a daily reminder to build your habit!',
  },
  {
    id: 'streak-7',
    title: 'Week Warrior',
    description: 'Journal for 7 consecutive days',
    category: 'streak',
    rarity: 'rare',
    icon: 'zap',
    requirement: 'Journal 7 days in a row',
    tip: 'Try journaling at the same time each day.',
  },
  {
    id: 'streak-14',
    title: 'Two Week Champion',
    description: 'Journal for 14 consecutive days',
    category: 'streak',
    rarity: 'rare',
    icon: 'target',
    requirement: 'Journal 14 days in a row',
    tip: 'Two weeks is where habits really start to stick!',
  },
  {
    id: 'streak-30',
    title: 'Monthly Master',
    description: 'Journal for 30 consecutive days',
    category: 'streak',
    rarity: 'epic',
    icon: 'trophy',
    requirement: 'Journal 30 days in a row',
    tip: 'You\'re building a powerful habit!',
  },
  {
    id: 'streak-100',
    title: 'Centurion',
    description: 'Journal for 100 consecutive days',
    category: 'streak',
    rarity: 'legendary',
    icon: 'crown',
    requirement: 'Journal 100 days in a row',
    tip: 'You\'ve achieved something truly remarkable!',
  },

  // Entry count badges
  {
    id: 'entries-10',
    title: 'Getting Started',
    description: 'Create your first 10 journal entries',
    category: 'entries',
    rarity: 'common',
    icon: 'book-open',
    requirement: 'Create 10 entries',
    tip: 'Every entry is a step toward self-discovery.',
  },
  {
    id: 'entries-50',
    title: 'Prolific Writer',
    description: 'Create 50 journal entries',
    category: 'entries',
    rarity: 'rare',
    icon: 'pen-tool',
    requirement: 'Create 50 entries',
    tip: 'You\'re becoming a true journaling enthusiast!',
  },
  {
    id: 'entries-100',
    title: 'Century Club',
    description: 'Create 100 journal entries',
    category: 'entries',
    rarity: 'epic',
    icon: 'award',
    requirement: 'Create 100 entries',
    tip: 'Your dedication is inspiring!',
  },
  {
    id: 'entries-250',
    title: 'Dedicated Chronicler',
    description: 'Create 250 journal entries',
    category: 'entries',
    rarity: 'epic',
    icon: 'library',
    requirement: 'Create 250 entries',
    tip: 'You\'re building an incredible personal archive!',
  },
  {
    id: 'entries-500',
    title: 'Storyteller',
    description: 'Create 500 journal entries',
    category: 'entries',
    rarity: 'legendary',
    icon: 'book',
    requirement: 'Create 500 entries',
    tip: 'You\'ve created a library of self-reflection!',
  },

  // Time-based badges
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Record 10 entries before 8 AM',
    category: 'time',
    rarity: 'common',
    icon: 'sunrise',
    requirement: 'Record 10 morning entries (before 8 AM)',
    tip: 'Morning journaling sets a positive tone for the day.',
  },
  {
    id: 'night-owl',
    title: 'Night Owl',
    description: 'Record 10 entries after 10 PM',
    category: 'time',
    rarity: 'rare',
    icon: 'moon-star',
    requirement: 'Record 10 evening entries (after 10 PM)',
    tip: 'Evening reflection helps process the day.',
  },

  // Mood badges
  {
    id: 'emotional-explorer',
    title: 'Emotional Explorer',
    description: 'Experience and log all 8 core emotions',
    category: 'mood',
    rarity: 'common',
    icon: 'heart',
    requirement: 'Log all 8 core emotions',
    tip: 'Embrace the full spectrum of your feelings.',
  },
  {
    id: 'optimist',
    title: 'Optimist',
    description: 'Record 20 positive entries',
    category: 'mood',
    rarity: 'rare',
    icon: 'sun',
    requirement: 'Record 20 positive sentiment entries',
    tip: 'Focus on gratitude and positive moments.',
  },
  {
    id: 'mindful',
    title: 'Balanced Soul',
    description: 'Record 15 neutral sentiment entries',
    category: 'mood',
    rarity: 'rare',
    icon: 'scale',
    requirement: 'Record 15 neutral sentiment entries',
    tip: 'Finding balance is a sign of emotional maturity.',
  },

  // Consistency badges
  {
    id: 'weekly-ritual',
    title: 'Weekly Ritual',
    description: 'Journal every day for a full week',
    category: 'consistency',
    rarity: 'common',
    icon: 'calendar-check',
    requirement: 'Complete 7 consecutive days',
    tip: 'Consistency is the key to lasting change.',
  },

  // Special badges
  {
    id: 'first-entry',
    title: 'First Entry',
    description: 'Create your very first journal entry',
    category: 'special',
    rarity: 'common',
    icon: 'sparkles',
    requirement: 'Create your first entry',
    tip: 'Welcome to your journaling journey!',
  },
  {
    id: 'long-session',
    title: 'Deep Dive',
    description: 'Record an entry longer than 10 minutes',
    category: 'special',
    rarity: 'rare',
    icon: 'clock',
    requirement: 'Record a 10+ minute entry',
    tip: 'Sometimes we need more time to process.',
  },
];

interface BadgeState {
  id: string;
  progress: number;
  unlocked: boolean;
  unlockDate?: string;
}

interface BadgesStore {
  // State
  badgeStates: Record<string, BadgeState>;
  unlockedCount: number;
  /** Badge IDs waiting to be shown as a celebration modal */
  pendingCelebrations: string[];
  /** Persistent referral code generated once per install */
  referralCode: string;

  // Actions
  initializeBadges: () => void;
  updateBadgeProgress: (badgeId: string, progress: number) => void;
  unlockBadge: (badgeId: string) => void;
  checkAndUpdateBadges: (stats: {
    streak: number;
    totalEntries: number;
    positiveEntries: number;
    neutralEntries: number;
    morningEntries: number;
    eveningEntries: number;
    uniqueEmotions: string[];
    longestSessionSeconds: number;
  }) => string[]; // Returns newly unlocked badge IDs
  getBadgeWithState: (badgeId: string) => Badge | null;
  getAllBadges: () => Badge[];
  getBadgesByCategory: (category: BadgeCategory) => Badge[];
  resetBadges: () => void;
  /** Push a badge ID onto the celebration queue */
  queueCelebration: (badgeId: string) => void;
  /** Pop and return the next badge ID to celebrate, or null if queue is empty */
  dequeueCelebration: () => string | null;
}

const useBadgesStore = create<BadgesStore>()(
  persist(
    (set, get) => ({
      badgeStates: {},
      unlockedCount: 0,
      pendingCelebrations: [],
      // Generate a unique referral code once per install (8 alphanumeric chars)
      referralCode: Math.random().toString(36).substr(2, 8).toUpperCase(),

      initializeBadges: () => {
        const currentStates = get().badgeStates;
        const newStates: Record<string, BadgeState> = {};

        BADGE_DEFINITIONS.forEach((badge) => {
          if (!currentStates[badge.id]) {
            newStates[badge.id] = {
              id: badge.id,
              progress: 0,
              unlocked: false,
            };
          } else {
            newStates[badge.id] = currentStates[badge.id];
          }
        });

        set({ badgeStates: newStates });
      },

      updateBadgeProgress: (badgeId, progress) => {
        set((state) => ({
          badgeStates: {
            ...state.badgeStates,
            [badgeId]: {
              ...state.badgeStates[badgeId],
              progress: Math.min(100, progress),
            },
          },
        }));
      },

      unlockBadge: (badgeId) => {
        const state = get().badgeStates[badgeId];
        if (state && !state.unlocked) {
          set((s) => ({
            badgeStates: {
              ...s.badgeStates,
              [badgeId]: {
                ...s.badgeStates[badgeId],
                progress: 100,
                unlocked: true,
                unlockDate: new Date().toISOString(),
              },
            },
            unlockedCount: s.unlockedCount + 1,
          }));
        }
      },

      checkAndUpdateBadges: (stats) => {
        const { updateBadgeProgress, unlockBadge, badgeStates } = get();
        const newlyUnlocked: string[] = [];

        // Check streak badges
        const streakChecks = [
          { id: 'streak-3', target: 3 },
          { id: 'streak-7', target: 7 },
          { id: 'streak-14', target: 14 },
          { id: 'streak-30', target: 30 },
          { id: 'streak-100', target: 100 },
        ];

        streakChecks.forEach(({ id, target }) => {
          const progress = Math.min(100, (stats.streak / target) * 100);
          updateBadgeProgress(id, progress);
          if (stats.streak >= target && !badgeStates[id]?.unlocked) {
            unlockBadge(id);
            newlyUnlocked.push(id);
          }
        });

        // Check entry count badges
        const entryChecks = [
          { id: 'entries-10', target: 10 },
          { id: 'entries-50', target: 50 },
          { id: 'entries-100', target: 100 },
          { id: 'entries-250', target: 250 },
          { id: 'entries-500', target: 500 },
        ];

        entryChecks.forEach(({ id, target }) => {
          const progress = Math.min(100, (stats.totalEntries / target) * 100);
          updateBadgeProgress(id, progress);
          if (stats.totalEntries >= target && !badgeStates[id]?.unlocked) {
            unlockBadge(id);
            newlyUnlocked.push(id);
          }
        });

        // Check first entry
        if (stats.totalEntries >= 1 && !badgeStates['first-entry']?.unlocked) {
          unlockBadge('first-entry');
          newlyUnlocked.push('first-entry');
        }

        // Check morning/evening badges
        const morningProgress = Math.min(100, (stats.morningEntries / 10) * 100);
        updateBadgeProgress('early-bird', morningProgress);
        if (stats.morningEntries >= 10 && !badgeStates['early-bird']?.unlocked) {
          unlockBadge('early-bird');
          newlyUnlocked.push('early-bird');
        }

        const eveningProgress = Math.min(100, (stats.eveningEntries / 10) * 100);
        updateBadgeProgress('night-owl', eveningProgress);
        if (stats.eveningEntries >= 10 && !badgeStates['night-owl']?.unlocked) {
          unlockBadge('night-owl');
          newlyUnlocked.push('night-owl');
        }

        // Check optimist badge (20 positive entries)
        const optimistProgress = Math.min(100, (stats.positiveEntries / 20) * 100);
        updateBadgeProgress('optimist', optimistProgress);
        if (stats.positiveEntries >= 20 && !badgeStates['optimist']?.unlocked) {
          unlockBadge('optimist');
          newlyUnlocked.push('optimist');
        }

        // Check balanced soul badge (15 neutral entries)
        const balancedProgress = Math.min(100, (stats.neutralEntries / 15) * 100);
        updateBadgeProgress('mindful', balancedProgress);
        if (stats.neutralEntries >= 15 && !badgeStates['mindful']?.unlocked) {
          unlockBadge('mindful');
          newlyUnlocked.push('mindful');
        }

        // Check emotional explorer
        const emotionProgress = Math.min(100, (stats.uniqueEmotions.length / 8) * 100);
        updateBadgeProgress('emotional-explorer', emotionProgress);
        if (stats.uniqueEmotions.length >= 8 && !badgeStates['emotional-explorer']?.unlocked) {
          unlockBadge('emotional-explorer');
          newlyUnlocked.push('emotional-explorer');
        }

        // Check weekly ritual badge (7-day streak)
        const weeklyProgress = Math.min(100, (stats.streak / 7) * 100);
        updateBadgeProgress('weekly-ritual', weeklyProgress);
        if (stats.streak >= 7 && !badgeStates['weekly-ritual']?.unlocked) {
          unlockBadge('weekly-ritual');
          newlyUnlocked.push('weekly-ritual');
        }

        // Check long session badge
        if (stats.longestSessionSeconds >= 600 && !badgeStates['long-session']?.unlocked) {
          unlockBadge('long-session');
          updateBadgeProgress('long-session', 100);
          newlyUnlocked.push('long-session');
        }

        return newlyUnlocked;
      },

      getBadgeWithState: (badgeId) => {
        const definition = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
        const state = get().badgeStates[badgeId];

        if (!definition) return null;

        return {
          ...definition,
          progress: state?.progress || 0,
          unlocked: state?.unlocked || false,
          unlockDate: state?.unlockDate,
        };
      },

      getAllBadges: () => {
        const { badgeStates } = get();
        return BADGE_DEFINITIONS.map((definition) => ({
          ...definition,
          progress: badgeStates[definition.id]?.progress || 0,
          unlocked: badgeStates[definition.id]?.unlocked || false,
          unlockDate: badgeStates[definition.id]?.unlockDate,
        }));
      },

      getBadgesByCategory: (category) => {
        return get()
          .getAllBadges()
          .filter((badge) => badge.category === category);
      },

      resetBadges: () => {
        set({ badgeStates: {}, unlockedCount: 0 });
      },

      queueCelebration: (badgeId) => {
        set((s) => ({ pendingCelebrations: [...s.pendingCelebrations, badgeId] }));
      },

      dequeueCelebration: () => {
        const queue = get().pendingCelebrations;
        if (queue.length === 0) return null;
        set({ pendingCelebrations: queue.slice(1) });
        return queue[0];
      },
    }),
    {
      name: 'badges-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 0,
      migrate: (persisted) => persisted as any,
      partialize: (state) => ({
        badgeStates: state.badgeStates,
        unlockedCount: state.unlockedCount,
        pendingCelebrations: state.pendingCelebrations,
        referralCode: state.referralCode,
      }),
    }
  )
);

export default useBadgesStore;

// Selector hooks
export const useUnlockedBadgesCount = () => useBadgesStore((s) => s.unlockedCount);
export const useBadgeProgress = (badgeId: string) =>
  useBadgesStore((s) => s.badgeStates[badgeId]?.progress || 0);
