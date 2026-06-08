// React Query Hooks for Journal Data
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useJournalStore from './state/journal-store';
import useUserStatsStore from './state/user-stats-store';
import useBadgesStore from './state/badges-store';
import {
  createJournalEntry,
  deleteJournalEntry,
  getFormattedEntries,
  analyzeTranscript,
  ReflectionOverride,
} from './journal-service';
import {
  generateInsights,
  generateDailyMoodSummaries,
  formatMoodDataForChart,
} from './analytics';
import {
  generateDeepInsights,
  EmotionalTrigger,
  MoodCycle,
  EmotionalShift,
  DeepInsight,
} from './emotional-intelligence';
import { getAIAnalysis } from './ai-emotional-intelligence';
import {
  JournalEntry,
  EmotionType,
  TopicCategory,
  InsightData,
} from './types';
// WeeklyReflectionResult was previously imported from the now-deleted
// openai-service.ts. Defined here as the single source of truth.
export interface WeeklyReflectionResult {
  narrativeSummary: string;
  emotionalJourney: string;
  keyThemes: string[];
  growthMoment: string;
  weekAhead: string;
  dominantEmotion: EmotionType;
  emotionalRange: string;
  entryCount: number;
  weekLabel: string;
}

// Query Keys
export const queryKeys = {
  entries: ['entries'] as const,
  entry: (id: string) => ['entries', id] as const,
  insights: (days: number) => ['insights', days] as const,
  moodTrend: (days: number) => ['moodTrend', days] as const,
  weeklyReflection: (weekStart: string) => ['weeklyReflection', weekStart] as const,
  stats: ['stats'] as const,
  badges: ['badges'] as const,
};

// Hook to get all entries with optional filters
export function useJournalEntries(filter?: {
  emotions?: EmotionType[];
  searchQuery?: string;
  sortOrder?: 'newest' | 'oldest';
}) {
  const entries = useJournalStore((s) => s.entries);

  return useQuery({
    queryKey: [...queryKeys.entries, filter],
    queryFn: () => getFormattedEntries(filter, filter?.sortOrder),
    initialData: () => getFormattedEntries(filter, filter?.sortOrder),
    staleTime: 0, // Always refetch when dependencies change
  });
}

// Hook to get a single entry
export function useJournalEntry(id: string) {
  const getEntry = useJournalStore((s) => s.getEntry);

  return useQuery({
    queryKey: queryKeys.entry(id),
    queryFn: () => getEntry(id),
    enabled: !!id,
  });
}

// Hook to create a new entry
export function useCreateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      audioUri,
      transcript,
      duration,
      conversationTopic,
      conversationPrompt,
      reflectionOverride,
    }: {
      audioUri?: string;
      transcript?: string;
      duration: number;
      conversationTopic?: TopicCategory;
      conversationPrompt?: string;
      reflectionOverride?: ReflectionOverride;
    }) => {
      return createJournalEntry(
        audioUri,
        duration,
        conversationTopic,
        conversationPrompt,
        transcript,
        reflectionOverride
      );
    },
    onSuccess: () => {
      // Invalidate local-compute queries only.
      // Do NOT invalidate AI-powered queries (deepInsights, priorityInsights,
      // emotionalTriggers, moodCycles, emotionalShifts, weeklyReflection) here
      // because each one triggers a new LLM API call — causing 4+ duplicate
      // billings per entry save. Those queries have their own 10-min staleTime
      // and will refetch naturally when the user visits the Insights tab.
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.badges });
      queryClient.invalidateQueries({ queryKey: ['moodTrend'] });
    },
  });
}

// Hook to delete an entry
export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      deleteJournalEntry(entryId);
      return entryId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.entries });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// Hook to analyze transcript (for real-time feedback)
export function useAnalyzeTranscript() {
  return useMutation({
    mutationFn: async (transcript: string) => {
      return analyzeTranscript(transcript);
    },
  });
}

// Hook to get user stats
export function useUserStats() {
  const stats = useUserStatsStore((s) => s.stats);

  return useQuery({
    queryKey: [...queryKeys.stats, stats],
    queryFn: () => stats,
    initialData: stats,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Hook to get insights
export function useInsights(days: number = 30) {
  const entries = useJournalStore((s) => s.entries);

  return useQuery({
    queryKey: [...queryKeys.insights(days), entries],
    queryFn: () => generateInsights(entries, days),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get mood trend data for charts
export function useMoodTrend(format: '7D' | '14D' | '30D') {
  const entries = useJournalStore((s) => s.entries);
  const days = format === '7D' ? 7 : format === '14D' ? 14 : 30;

  return useQuery({
    queryKey: [...queryKeys.moodTrend(days), entries, format],
    queryFn: () => {
      const summaries = generateDailyMoodSummaries(entries, days);
      return formatMoodDataForChart(summaries, format);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get all badges
export function useBadges(category?: string) {
  const getAllBadges = useBadgesStore((s) => s.getAllBadges);
  const getBadgesByCategory = useBadgesStore((s) => s.getBadgesByCategory);

  return useQuery({
    queryKey: [...queryKeys.badges, category],
    queryFn: () => {
      if (category && category !== 'all') {
        return getBadgesByCategory(category as any);
      }
      return getAllBadges();
    },
    initialData: () => {
      if (category && category !== 'all') {
        return getBadgesByCategory(category as any);
      }
      return getAllBadges();
    },
  });
}

// Hook to get badge stats
export function useBadgeStats() {
  const unlockedCount = useBadgesStore((s) => s.unlockedCount);
  const getAllBadges = useBadgesStore((s) => s.getAllBadges);

  return useQuery({
    queryKey: ['badgeStats', unlockedCount],
    queryFn: () => {
      const badges = getAllBadges();
      return {
        total: badges.length,
        unlocked: unlockedCount,
        nextBadge: badges.find((b) => !b.unlocked && b.progress > 0),
      };
    },
  });
}

// Hook for emotion-specific data
export function useEmotionData(emotion: EmotionType, days: number = 7) {
  const entries = useJournalStore((s) => s.entries);

  return useQuery({
    queryKey: ['emotionData', emotion, days],
    queryFn: () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentEntries = entries.filter(
        (e) => new Date(e.createdAt) >= cutoffDate && e.emotions.includes(emotion)
      );

      // Generate daily data
      const dailyData: { day: string; value: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        const dayEntries = recentEntries.filter((e) =>
          e.createdAt.startsWith(dateString)
        );

        const avgIntensity =
          dayEntries.length > 0
            ? Math.round(
                dayEntries.reduce((sum, e) => sum + e.emotionIntensity, 0) /
                  dayEntries.length
              )
            : 0;

        dailyData.push({ day: dayName, value: avgIntensity });
      }

      return dailyData;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================================================
// DEEP INSIGHTS & EMOTIONAL INTELLIGENCE HOOKS (AI-Powered)
// ============================================================================

// Hook to get comprehensive deep insights using GPT-3.5
export function useDeepInsights() {
  const entries = useJournalStore((s) => s.entries);
  // Use entry count + latest timestamp as cache key instead of the full array.
  // The full array reference changes on every store update (e.g. aiReflection save),
  // which would invalidate the cache every few seconds and cause duplicate LLM calls.
  const cacheKey = `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['deepInsights', cacheKey],
    queryFn: async () => {
      try {
        const aiAnalysis = await getAIAnalysis(entries);
        if (aiAnalysis.insights.length > 0) return aiAnalysis;
      } catch (error) {
        console.log('AI analysis unavailable, using local analysis');
      }
      return generateDeepInsights(entries);
    },
    staleTime: Infinity, // Never auto-refetch — cache key changes only when entry count changes
    enabled: entries.length >= 5,
  });
}

// Hook to get emotional triggers using AI
export function useEmotionalTriggers() {
  const entries = useJournalStore((s) => s.entries);
  const cacheKey = `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['emotionalTriggers', cacheKey],
    queryFn: async () => {
      try {
        const aiAnalysis = await getAIAnalysis(entries);
        if (aiAnalysis.triggers.length > 0) return aiAnalysis.triggers;
      } catch (error) {
        console.log('AI triggers unavailable, using local analysis');
      }
      return generateDeepInsights(entries).triggers;
    },
    staleTime: Infinity,
    enabled: entries.length >= 10,
  });
}

// Hook to get mood cycles using AI
export function useMoodCycles() {
  const entries = useJournalStore((s) => s.entries);
  const cacheKey = `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['moodCycles', cacheKey],
    queryFn: async () => {
      try {
        const aiAnalysis = await getAIAnalysis(entries);
        if (aiAnalysis.cycles.length > 0) return aiAnalysis.cycles;
      } catch (error) {
        console.log('AI cycles unavailable, using local analysis');
      }
      return generateDeepInsights(entries).cycles;
    },
    staleTime: Infinity,
    enabled: entries.length >= 14,
  });
}

// Hook to get emotional shifts using AI
export function useEmotionalShifts() {
  const entries = useJournalStore((s) => s.entries);
  const cacheKey = `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['emotionalShifts', cacheKey],
    queryFn: async () => {
      try {
        const aiAnalysis = await getAIAnalysis(entries);
        if (aiAnalysis.shifts.length > 0) return aiAnalysis.shifts;
      } catch (error) {
        console.log('AI shifts unavailable, using local analysis');
      }
      return generateDeepInsights(entries).shifts;
    },
    staleTime: Infinity,
    enabled: entries.length >= 7,
  });
}

// Hook to get priority insights for display using AI
export function usePriorityInsights() {
  const entries = useJournalStore((s) => s.entries);
  const cacheKey = `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['priorityInsights', cacheKey],
    queryFn: async () => {
      const sortByPriority = (arr: any[]) => arr.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      });
      try {
        const aiAnalysis = await getAIAnalysis(entries);
        if (aiAnalysis.insights.length > 0) return sortByPriority(aiAnalysis.insights);
      } catch (error) {
        console.log('AI insights unavailable, using local analysis');
      }
      return sortByPriority(generateDeepInsights(entries).insights);
    },
    staleTime: Infinity,
    enabled: entries.length >= 5,
  });
}

// ============================================================================
// TRIGGER DETECTION HOOKS
// ============================================================================

import { detectTriggers, TriggerAnalysisResult } from './trigger-detection';

// Hook to get detected emotional triggers
export function useTriggerDetection(timeWindow: '7D' | '14D' | '30D' = '30D') {
  const entries = useJournalStore((s) => s.entries);
  // Create a stable cache key based on entries count and latest entry timestamp
  // This avoids re-computation when entries array reference changes but content is same
  const cacheKey = `${entries.length}-${entries[0]?.createdAt ?? 'empty'}`;

  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ['triggerDetection', timeWindow, cacheKey],
    queryFn: () => detectTriggers(entries, timeWindow),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to get weekly reflection narrative digest
export function useWeeklyReflection(weekOffset: number = 0) {
  const entries = useJournalStore((s) => s.entries);

  // Calculate the week start (Sunday) for the given offset
  const weekStart = (() => {
    const now = new Date();
    // Monday-start week (consistent with StreakCalendar)
    // getDay() returns 0=Sun..6=Sat; convert to Mon-start: Mon=0..Sun=6
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek - weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
  })();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weekEntries = entries.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= weekStart && d <= weekEnd;
  });

  const weekLabel = (() => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = weekStart.toLocaleDateString('en-US', options);
    const endDate = new Date(weekEnd);
    endDate.setDate(endDate.getDate() - 1);
    const endStr = endDate.toLocaleDateString('en-US', options);
    return weekOffset === 0 ? `This Week (${startStr} – ${endStr})` : `${startStr} – ${endStr}`;
  })();

  const DEMO_REFLECTION: WeeklyReflectionResult & { isDemo: boolean } = {
    narrativeSummary: "This week you moved through a rich emotional landscape — from the quiet energy of early mornings to the weight of work pressures, and back again to moments of genuine lightness. You showed up for yourself even on the harder days, and that consistency tells a story of real resilience.",
    emotionalJourney: "Your week began with optimism and physical energy. Mid-week brought challenges that tested your patience, but by the end of the week you found your footing again through rest, creativity, and connection with people you care about.",
    keyThemes: ["resilience", "work-life balance", "self-care", "gratitude", "growth"],
    growthMoment: "You recognized when you needed to slow down and gave yourself permission to rest — that awareness is a genuine strength worth celebrating.",
    weekAhead: "Carry the self-compassion you practiced this week into the days ahead. Small, consistent acts of care for yourself will keep building the foundation you're creating.",
    dominantEmotion: 'happiness' as EmotionType,
    emotionalRange: "varied & expressive",
    entryCount: weekEntries.length,
    weekLabel,
    isDemo: true,
  };

  return useQuery({
    queryKey: [...queryKeys.weeklyReflection(weekStartStr), weekLabel],
    queryFn: async (): Promise<WeeklyReflectionResult & { isDemo?: boolean }> => {
      // Route through the Cloudflare Worker backend so all activity appears
      // in the OpenRouter dashboard under the server-side API key.
      const backendUrl = (
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        'https://vocolens-api.kasrammarvel.workers.dev'
      ).trim();

      try {
        const response = await fetch(`${backendUrl}/api/journal/weekly-reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entries: weekEntries.map((e) => ({
              transcript: e.transcript ?? '',
              primaryEmotion: e.primaryEmotion,
              emotionIntensity: e.emotionIntensity,
              topics: e.topics,
              createdAt: e.createdAt,
              title: e.title,
            })),
            weekLabel,
          }),
        });

        if (!response.ok) {
          console.log('[WeeklyReflection] Backend returned', response.status, '— using demo data');
          return DEMO_REFLECTION;
        }

        const json = await response.json() as {
          success?: boolean;
          data?: Partial<WeeklyReflectionResult>;
          error?: string;
        };

        if (!json.success || !json.data) {
          console.log('[WeeklyReflection] Backend error:', json.error, '— using demo data');
          return DEMO_REFLECTION;
        }

        const parsed = json.data;
        const validEmotions: EmotionType[] = [
          'happiness', 'sadness', 'anger', 'disgust',
          'fear', 'surprise', 'trust', 'anticipation',
        ];

        return {
          narrativeSummary: parsed.narrativeSummary || 'A week of meaningful reflection.',
          emotionalJourney: parsed.emotionalJourney || 'Your emotions told a story this week.',
          keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes.slice(0, 4) : [],
          growthMoment: parsed.growthMoment || 'You showed up for yourself this week.',
          weekAhead: parsed.weekAhead || "Carry this week's wisdom forward.",
          dominantEmotion:
            parsed.dominantEmotion && validEmotions.includes(parsed.dominantEmotion)
              ? parsed.dominantEmotion
              : ('trust' as EmotionType),
          emotionalRange: parsed.emotionalRange || 'A balanced week',
          entryCount: weekEntries.length,
          weekLabel,
          isDemo: false,
        };
      } catch (error) {
        console.log('[WeeklyReflection] Network error, using demo data:', error);
        return DEMO_REFLECTION;
      }
    },
    staleTime: Infinity, // Never auto-refetch — manual refetch only via pull-to-refresh
    enabled: weekEntries.length >= 1,
  });
}
