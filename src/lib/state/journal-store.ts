// Journal Entries Store with Persistence
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  JournalEntry,
  EmotionType,
  generateId,
} from '../types';

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
      version: 0,
      migrate: (persisted) => persisted as any,
      partialize: (state) => ({ entries: state.entries }),
    }
  )
);

export default useJournalStore;

// Selector hooks for optimized re-renders
export const useEntries = () => useJournalStore((s) => s.entries);
export const useEntriesCount = () => useJournalStore((s) => s.entries.length);
export const useJournalLoading = () => useJournalStore((s) => s.isLoading);
export const useJournalError = () => useJournalStore((s) => s.error);
