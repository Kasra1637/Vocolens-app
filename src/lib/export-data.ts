/**
 * Export Data Utility
 * Exports all app data (journal entries, stats, badges, settings) as a CSV file.
 */

// expo-file-system v55: legacy subpath retains `cacheDirectory`, `EncodingType`,
// and `writeAsStringAsync`. The new top-level export has migrated to a
// File/Paths handle-based API and these symbols are undefined there.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import useJournalStore from './state/journal-store';
import useBadgesStore, { BADGE_DEFINITIONS } from './state/badges-store';
import useUserStatsStore from './state/user-stats-store';
import useSettingsStore from './state/settings-store';
import useOnboardingStore from './state/onboarding-store';
import { useEmotionCorrectionStore } from './state/emotion-correction-store';

function escapeCsv(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvSection(title: string, headers: string[], rows: string[][]): string {
  const lines: string[] = [];
  lines.push(`--- ${title} ---`);
  lines.push(headers.map(escapeCsv).join(','));
  rows.forEach((row) => lines.push(row.map(escapeCsv).join(',')));
  lines.push(''); // blank separator
  return lines.join('\n');
}

export async function exportAllDataAsCsv(): Promise<void> {
  // ── Journal Entries ───────────────────────────────────────────────
  const entries = useJournalStore.getState().entries;
  const entriesSection = buildCsvSection(
    'JOURNAL ENTRIES',
    ['ID', 'Title', 'Date', 'Emotions', 'Primary Emotion', 'Valence', 'Arousal', 'Duration (s)', 'Topics', 'Transcript'],
    entries.map((e) => [
      e.id,
      e.title,
      e.createdAt,
      (e.emotions || []).join('; '),
      String(e.primaryEmotion ?? ''),
      String(e.valence ?? ''),
      String(e.arousal ?? ''),
      String(e.duration ?? ''),
      (e.topics || []).join('; '),
      e.transcript,
    ]),
  );

  // ── User Stats ────────────────────────────────────────────────────
  const { stats, usage } = useUserStatsStore.getState();
  const statsSection = buildCsvSection(
    'USER STATS',
    ['Metric', 'Value'],
    [
      ['Total Entries', String(stats.totalEntries)],
      ['Total Duration (s)', String(stats.totalDuration)],
      ['Current Streak', String(stats.currentStreak)],
      ['Longest Streak', String(stats.longestStreak)],
      ['Last Entry Date', stats.lastEntryDate ?? 'N/A'],
      ['Weekly Entries', String(stats.weeklyEntries)],
      ['Monthly Entries', String(stats.monthlyEntries)],
      ['Average Mood', String(stats.averageMood)],
      ['Top Emotions', (stats.topEmotions || []).join('; ')],
      ['Monthly Minutes Used', String(usage?.monthlyMinutesUsed ?? 0)],
      ['Total Minutes Used', String(usage?.totalMinutesUsed ?? 0)],
    ],
  );

  // ── Badges ────────────────────────────────────────────────────────
  const badgeStates = useBadgesStore.getState().badgeStates;
  const badgesSection = buildCsvSection(
    'BADGES',
    ['Badge ID', 'Title', 'Category', 'Rarity', 'Progress', 'Unlocked', 'Unlock Date'],
    BADGE_DEFINITIONS.map((def) => {
      const state = badgeStates[def.id];
      return [
        def.id,
        def.title,
        def.category,
        def.rarity,
        String(state?.progress ?? 0),
        state?.unlocked ? 'Yes' : 'No',
        state?.unlockDate ?? '',
      ];
    }),
  );

  // ── Settings ──────────────────────────────────────────────────────
  const settings = useSettingsStore.getState();
  const onboarding = useOnboardingStore.getState();
  const settingsSection = buildCsvSection(
    'SETTINGS',
    ['Setting', 'Value'],
    [
      ['Notifications Enabled', String(settings.notificationsEnabled)],
      ['Daily Reminder Time', settings.dailyReminderTime],
      ['Dark Mode', String(settings.isDarkMode)],
      ['Emotion Reflection Mode', settings.emotionReflectionMode],
      ['Theme', onboarding.selectedTheme],
      ['Transcription Language', onboarding.selectedTranscriptionLanguage],
    ],
  );

  // ── Emotion Corrections ───────────────────────────────────────────
  const { corrections, userBias } = useEmotionCorrectionStore.getState();
  const correctionsSection = buildCsvSection(
    'EMOTION CORRECTIONS',
    ['ID', 'Entry ID', 'Timestamp', 'AI Emotion', 'User Emotion', 'AI Valence', 'User Valence', 'AI Arousal', 'User Arousal', 'Mode'],
    corrections.map((c) => [
      c.id,
      c.entryId,
      c.timestamp,
      c.aiEmotion,
      c.userEmotion,
      String(c.aiValence),
      String(c.userValence),
      String(c.aiArousal),
      String(c.userArousal),
      c.correctionMode,
    ]),
  );

  const correctionSummarySection = buildCsvSection(
    'CORRECTION SUMMARY',
    ['Metric', 'Value'],
    [
      ['Total Corrections', String(userBias.totalCorrections)],
      ['Total Confirmations', String(userBias.totalConfirmations)],
      ['Confirmation Rate', userBias.totalCorrections > 0 ? `${Math.round((userBias.totalConfirmations / userBias.totalCorrections) * 100)}%` : '100%'],
    ],
  );

  // ── Combine all sections ──────────────────────────────────────────
  const csvContent = [
    `Vocolens Data Export - ${new Date().toISOString().split('T')[0]}`,
    '',
    entriesSection,
    statsSection,
    badgesSection,
    settingsSection,
    correctionsSection,
    correctionSummarySection,
  ].join('\n');

  // ── Write & share ─────────────────────────────────────────────────
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `vocolens-export-${dateStr}.csv`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Your Vocolens Data',
      UTI: 'public.comma-separated-values-text',
    });
  }
}
