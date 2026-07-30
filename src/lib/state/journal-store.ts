// Journal Entries Store with Persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  JournalEntry,
  EmotionType,
  generateId,
} from '../types';

// ── Current-period helpers ──────────────────────────────────────────
// "This week"/"this month" counts are derived from entry timestamps rather
// than stored as incrementing counters, so they always reflect the *current*
// calendar period without needing any rollover/reset bookkeeping.
// All boundaries are computed in local time to match what the user sees.

/**
 * Start of the current week (Monday 00:00 local time), consistent with
 * StreakCalendar and useWeeklyReflection.
 */
export function getStartOfWeek(ref: Date = new Date()): Date {
  // getDay() returns 0=Sun..6=Sat; convert to Mon-start: Mon=0..Sun=6
  const dayOfWeek = (ref.getDay() + 6) % 7;
  const start = new Date(ref);
  start.setDate(ref.getDate() - dayOfWeek);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Start of the current calendar month (1st, 00:00 local time). */
export function getStartOfMonth(ref: Date = new Date()): Date {
  return new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
}

/** Number of entries created at or after `since`. Ignores unparseable dates. */
export function countEntriesSince(entries: JournalEntry[], since: Date): number {
  const sinceMs = since.getTime();
  return entries.reduce((count, entry) => {
    const ms = new Date(entry.createdAt).getTime();
    return !Number.isNaN(ms) && ms >= sinceMs ? count + 1 : count;
  }, 0);
}

interface JournalStore {
  // State
  entries: JournalEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => JournalEntry;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;
  getEntry: (id: string) => JournalEntry | undefined;
  getEntriesByDate: (date: string) => JournalEntry[];
  getEntriesByDateRange: (startDate: string, endDate: string) => JournalEntry[];
  getEntriesByEmotion: (emotion: EmotionType) => JournalEntry[];
  searchEntries: (query: string) => JournalEntry[];
  getEntriesThisWeekCount: () => number;
  getEntriesThisMonthCount: () => number;
  clearAllEntries: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],
      isLoading: false,
      error: null,

      addEntry: (entryData) => {
        const now = new Date().toISOString();
        const newEntry: JournalEntry = {
          ...entryData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          entries: [newEntry, ...state.entries],
          error: null,
        }));

        return newEntry;
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, ...updates, updatedAt: new Date().toISOString() }
              : entry
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }));
      },

      getEntry: (id) => {
        return get().entries.find((entry) => entry.id === id);
      },

      getEntriesByDate: (date) => {
        return get().entries.filter((entry) =>
          entry.createdAt.startsWith(date)
        );
      },

      getEntriesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        return get().entries.filter((entry) => {
          const entryDate = new Date(entry.createdAt).getTime();
          return entryDate >= start && entryDate <= end;
        });
      },

      getEntriesByEmotion: (emotion) => {
        return get().entries.filter((entry) =>
          entry.emotions.includes(emotion)
        );
      },

      searchEntries: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().entries.filter(
          (entry) =>
            entry.transcript.toLowerCase().includes(lowerQuery) ||
            entry.title.toLowerCase().includes(lowerQuery) ||
            entry.topics.some((topic: string) =>
              topic.toLowerCase().includes(lowerQuery)
            )
        );
      },

      getEntriesThisWeekCount: () => {
        return countEntriesSince(get().entries, getStartOfWeek());
      },

      getEntriesThisMonthCount: () => {
        return countEntriesSince(get().entries, getStartOfMonth());
      },

      clearAllEntries: () => {
        set({ entries: [] });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },
    }),
    {
      name: 'journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted: any, version: number) => {
        // v0 → v1: ensure entries array exists and is valid so stale
        // AsyncStorage data doesn't break the app after OTA updates.
        if (version < 1) {
          const entries = Array.isArray(persisted?.entries) ? persisted.entries : [];
          return { entries };
        }
        return persisted;
      },
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);

export default useJournalStore;

// Selector hooks for optimized re-renders
export const useEntries = () => useJournalStore((s) => s.entries);
export const useEntriesCount = () => useJournalStore((s) => s.entries.length);
export const useEntriesThisWeekCount = () =>
  useJournalStore((s) => countEntriesSince(s.entries, getStartOfWeek()));
export const useEntriesThisMonthCount = () =>
  useJournalStore((s) => countEntriesSince(s.entries, getStartOfMonth()));
export const useJournalLoading = () => useJournalStore((s) => s.isLoading);
export const useJournalError = () => useJournalStore((s) => s.error);
