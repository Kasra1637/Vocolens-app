// Analytics & Insights Computation Utilities
import {
  JournalEntry,
  DailyMoodSummary,
  InsightData,
  EmotionType,
} from './types';

// Get entries from the last N days
export function getEntriesInRange(
  entries: JournalEntry[],
  days: number
): JournalEntry[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  cutoffDate.setHours(0, 0, 0, 0);

  return entries.filter(
    (entry) => new Date(entry.createdAt) >= cutoffDate
  );
}

// Generate daily mood summaries
export function generateDailyMoodSummaries(
  entries: JournalEntry[],
  days: number
): DailyMoodSummary[] {
  const summaries: DailyMoodSummary[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const dayEntries = entries.filter(
      (entry) => entry.createdAt.startsWith(dateString)
    );

    if (dayEntries.length === 0) {
      // No entries for this day
      summaries.push({
        date: dateString,
        averageMood: 0,
        dominantEmotion: 'happiness',
        entryCount: 0,
        totalDuration: 0,
        emotions: [],
      });
    } else {
      // Calculate average mood from emotion intensity
      const totalMood = dayEntries.reduce((sum, entry) => {
        return sum + entry.emotionIntensity;
      }, 0);
      const averageMood = Math.round(totalMood / dayEntries.length);

      // Count emotions
      const emotionCounts = new Map<EmotionType, { count: number; totalIntensity: number }>();
      dayEntries.forEach((entry) => {
        entry.emotions.forEach((emotion) => {
          const current = emotionCounts.get(emotion) || { count: 0, totalIntensity: 0 };
          emotionCounts.set(emotion, {
            count: current.count + 1,
            totalIntensity: current.totalIntensity + entry.emotionIntensity,
          });
        });
      });

      // Find dominant emotion
      let dominantEmotion: EmotionType = 'happiness';
      let maxCount = 0;
      emotionCounts.forEach((value, emotion) => {
        if (value.count > maxCount) {
          maxCount = value.count;
          dominantEmotion = emotion;
        }
      });

      // Build emotions array
      const emotions = Array.from(emotionCounts.entries()).map(([emotion, data]) => ({
        emotion,
        intensity: Math.round(data.totalIntensity / data.count),
        count: data.count,
      }));

      summaries.push({
        date: dateString,
        averageMood,
        dominantEmotion,
        entryCount: dayEntries.length,
        totalDuration: dayEntries.reduce((sum, e) => sum + e.duration, 0),
        emotions,
      });
    }
  }

  return summaries;
}

// Calculate emotion distribution
export function calculateEmotionDistribution(
  entries: JournalEntry[]
): Record<EmotionType, number> {
  const distribution: Record<string, number> = {};
  let totalEmotions = 0;

  entries.forEach((entry) => {
    entry.emotions.forEach((emotion) => {
      distribution[emotion] = (distribution[emotion] || 0) + 1;
      totalEmotions++;
    });
  });

  // Convert to percentages
  const percentages: Record<string, number> = {};
  Object.keys(distribution).forEach((emotion) => {
    percentages[emotion] = Math.round((distribution[emotion] / totalEmotions) * 100);
  });

  return percentages as Record<EmotionType, number>;
}

// Get top topics from entries
export function getTopTopics(entries: JournalEntry[], limit: number = 5): string[] {
  const topicCounts = new Map<string, number>();

  entries.forEach((entry) => {
    entry.topics.forEach((topic) => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
  });

  return Array.from(topicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([topic]) => topic);
}

// Get top emotions from entries, with their true occurrence counts
//
// Counts every emotion across every entry, so the ranking reflects real
// lifetime frequency. This replaces the `topEmotions` field that used to live on
// UserStats: that field stored only 5 bare emotion names with no counts, and its
// update step re-tallied the stored list itself — where each name appears
// exactly once — so an emotion's history collapsed to "present or absent". Any
// emotion pushed out of the top 5 restarted from zero if it reappeared.
export function getTopEmotions(
  entries: JournalEntry[],
  limit: number = 5
): { emotion: EmotionType; count: number }[] {
  const emotionCounts = new Map<EmotionType, number>();

  entries.forEach((entry) => {
    (entry.emotions || []).forEach((emotion) => {
      emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
    });
  });

  return Array.from(emotionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([emotion, count]) => ({ emotion, count }));
}

// Calculate lifetime average mood (mean emotion intensity, 0-100)
//
// Derived from the entries rather than maintained as a running average. The
// previous incremental version read `totalEntries` *after* it had already been
// incremented for the new entry, so it effectively divided by n+1 instead of n:
// every update under-weighted the newest entry and dragged the result toward the
// seeded default of 50. With ten entries all scoring 80 it reported 77, and a
// first entry of 80 showed as 65.
export function calculateAverageMood(entries: JournalEntry[]): number {
  if (entries.length === 0) return DEFAULT_AVERAGE_MOOD;
  const total = entries.reduce((sum, entry) => sum + (entry.emotionIntensity ?? 0), 0);
  return Math.round(total / entries.length);
}

/** Neutral midpoint, used when there are no entries to average. */
export const DEFAULT_AVERAGE_MOOD = 50;

// Calculate average session length
export function calculateAverageSessionLength(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);
  return Math.round(totalDuration / entries.length);
}

// Determine best time of day for journaling
export function getBestTimeOfDay(entries: JournalEntry[]): string {
  const timeSlots = {
    morning: 0, // 5-12
    afternoon: 0, // 12-17
    evening: 0, // 17-21
    night: 0, // 21-5
  };

  entries.forEach((entry) => {
    const hour = new Date(entry.createdAt).getHours();
    if (hour >= 5 && hour < 12) timeSlots.morning++;
    else if (hour >= 12 && hour < 17) timeSlots.afternoon++;
    else if (hour >= 17 && hour < 21) timeSlots.evening++;
    else timeSlots.night++;
  });

  const best = Object.entries(timeSlots).reduce((a, b) =>
    b[1] > a[1] ? b : a
  );

  return best[0].charAt(0).toUpperCase() + best[0].slice(1);
}

// Calculate mood patterns by weekday
export function getMoodPatternsByWeekday(
  entries: JournalEntry[]
): { weekday: string; averageMood: number }[] {
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekdayData: { [key: number]: { total: number; count: number } } = {};

  // Initialize
  for (let i = 0; i < 7; i++) {
    weekdayData[i] = { total: 0, count: 0 };
  }

  entries.forEach((entry) => {
    const day = new Date(entry.createdAt).getDay();
    weekdayData[day].total += entry.emotionIntensity;
    weekdayData[day].count++;
  });

  return weekdays.map((weekday, index) => ({
    weekday,
    averageMood:
      weekdayData[index].count > 0
        ? Math.round(weekdayData[index].total / weekdayData[index].count)
        : 0,
  }));
}

// Generate complete insights data
export function generateInsights(
  entries: JournalEntry[],
  days: number = 30
): InsightData {
  const recentEntries = getEntriesInRange(entries, days);

  return {
    weeklyMoodTrend: generateDailyMoodSummaries(entries, Math.min(days, 30)),
    emotionDistribution: calculateEmotionDistribution(recentEntries),
    topTopics: getTopTopics(recentEntries),
    averageSessionLength: calculateAverageSessionLength(recentEntries),
    bestTimeOfDay: getBestTimeOfDay(recentEntries),
    moodPatterns: getMoodPatternsByWeekday(recentEntries),
  };
}

// Count entries by time of day - Updated to match badge requirements
export function countEntriesByTimeOfDay(entries: JournalEntry[]): {
  morning: number;
  evening: number;
} {
  let morning = 0;
  let evening = 0;

  entries.forEach((entry) => {
    const hour = new Date(entry.createdAt).getHours();
    // Morning: before 8 AM (0-7)
    if (hour < 8) morning++;
    // Evening: after 10 PM (22-23)
    if (hour >= 22) evening++;
  });

  return { morning, evening };
}

// Count positive entries (based on positive emotions)
export function countPositiveEntries(entries: JournalEntry[]): number {
  const positiveEmotions: EmotionType[] = ['happiness', 'trust', 'anticipation', 'surprise'];
  return entries.filter((entry) =>
    entry.emotions.some(emotion => positiveEmotions.includes(emotion))
  ).length;
}

// Count neutral entries (entries with emotionIntensity between 40-60)
export function countNeutralEntries(entries: JournalEntry[]): number {
  return entries.filter((entry) =>
    entry.emotionIntensity >= 40 && entry.emotionIntensity <= 60
  ).length;
}

// Get unique emotions from all entries
export function getUniqueEmotions(entries: JournalEntry[]): EmotionType[] {
  const emotions = new Set<EmotionType>();
  entries.forEach((entry) => {
    entry.emotions.forEach((emotion) => emotions.add(emotion));
  });
  return Array.from(emotions);
}

// Get longest session duration
export function getLongestSessionDuration(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  return Math.max(...entries.map((entry) => entry.duration));
}

// Get total recording duration in seconds across all entries
export function getTotalDurationSeconds(entries: JournalEntry[]): number {
  return entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
}

// Get unique topic count across all entries
export function getUniqueTopicCount(entries: JournalEntry[]): number {
  const topics = new Set<string>();
  entries.forEach((entry) => {
    entry.topics?.forEach((topic) => {
      if (topic && topic.trim().length > 0) topics.add(topic.trim().toLowerCase());
    });
  });
  return topics.size;
}

// Get max emotion intensity across all entries
export function getMaxEmotionIntensity(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  return Math.max(...entries.map((e) => e.emotionIntensity || 0));
}

// Count positive entries using valence (positive valence > 20)
export function countPositiveEntriesByValence(entries: JournalEntry[]): number {
  return entries.filter((entry) => {
    if (entry.valence !== undefined) return entry.valence > 20;
    // Fallback: primary emotion is a positive emotion
    const positiveEmotions: EmotionType[] = ['happiness', 'trust', 'anticipation', 'surprise'];
    return entry.primaryEmotion !== undefined && positiveEmotions.includes(entry.primaryEmotion as EmotionType);
  }).length;
}

// Count neutral entries using valence (-20 to +20) or mid-range intensity fallback
export function countNeutralEntriesByValence(entries: JournalEntry[]): number {
  return entries.filter((entry) => {
    if (entry.valence !== undefined) return entry.valence >= -20 && entry.valence <= 20;
    // Fallback: emotionIntensity between 35-65
    return entry.emotionIntensity >= 35 && entry.emotionIntensity <= 65;
  }).length;
}

// Count how many complete calendar weeks have at least N entries each
// A "week" is Mon–Sun local time
export function countWeeksWithMinEntries(entries: JournalEntry[], minPerWeek: number = 7): number {
  if (entries.length === 0) return 0;

  // Group entries by ISO week key (YYYY-Www)
  const weekCounts: Record<string, Set<string>> = {};
  entries.forEach((entry) => {
    const d = new Date(entry.createdAt);
    // Get Monday of the entry's week
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekKey = monday.toISOString().split('T')[0];

    if (!weekCounts[weekKey]) weekCounts[weekKey] = new Set();
    // Use date string as key to count distinct days
    weekCounts[weekKey].add(d.toLocaleDateString('en-CA')); // YYYY-MM-DD
  });

  return Object.values(weekCounts).filter((days) => days.size >= minPerWeek).length;
}

// Format mood data for charts
export function formatMoodDataForChart(
  summaries: DailyMoodSummary[],
  format: '7D' | '14D' | '30D'
): { day: string; value: number; emotion: string; emoji: string }[] {
  const EMOTION_EMOJIS: Record<string, string> = {
    happiness: '😊',
    sadness: '😢',
    anger: '😤',
    disgust: '🤢',
    fear: '😰',
    surprise: '😮',
    trust: '🤝',
    anticipation: '🤩',
  };

  const days = format === '7D' ? 7 : format === '14D' ? 14 : 30;
  const recentSummaries = summaries.slice(-days);

  return recentSummaries.map((summary) => {
    const date = new Date(summary.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    return {
      day: dayName,
      value: summary.averageMood || 50,
      emotion: summary.dominantEmotion,
      emoji: EMOTION_EMOJIS[summary.dominantEmotion] || '😊',
    };
  });
}
