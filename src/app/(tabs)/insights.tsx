import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
// Use legacy subpath — expo-file-system v55 top-level no longer exports
// writeAsStringAsync, causing the "deprecated" crash on the share button.
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Sun,
  Moon,
  SunHorizon,
  Cloud,
  Smiley,
  SmileySad,
  Warning,
  Lightning,
  Eye,
  ShieldWarning,
  Heart,
  Lightbulb,
  Shield,
  Target,
  ChatCircle,
  SmileyWink,
  SmileyMeh,
  SmileyAngry,
  SunDim,
  Handshake,
  Star,
  Heart as HeartFace,
  ShareNetwork,
} from "phosphor-react-native";
import { Trophy, TrendUp, Sparkle, Clock, Brain, ChartBar } from "phosphor-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  TAB_ENTER_1 as ENTER_1,
  TAB_ENTER_2 as ENTER_2,
  TAB_ENTER_3 as ENTER_3,
  TAB_ENTER_4 as ENTER_4,
  TAB_ENTER_5 as ENTER_5,
} from "@/lib/tabAnimations";
import { tapHaptic, selectionHaptic } from "@/lib/haptics";
import {
  BorderRadius,
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import useJournalStore from "@/lib/state/journal-store";
import useUserStatsStore from "@/lib/state/user-stats-store";
import {
  useUsageMinutes,
  useRemainingMinutes,
  USAGE_LIMIT_MINUTES,
} from "@/lib/state/user-stats-store";
import useBadgesStore from "@/lib/state/badges-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import {
  useMoodTrend,
  useInsights,
  useEmotionData,
  usePriorityInsights,
  useTriggerDetection,
} from "@/lib/hooks";
import { EmotionType } from "@/lib/types";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { hexToRgba } from "@/lib/glass";
import {
  TriggerInsightCard,
  TriggerEmptyState,
  TriggerSectionHeader,
} from "@/components/TriggerInsightCard";
import { WeeklyReflectionCard } from "@/components/WeeklyReflectionCard";
import { StreakCalendar } from "@/components/StreakCalendar";
import { MoodStoryTimeline } from "@/components/MoodStoryTimeline";
import ValenceArousalChart from "@/components/ValenceArousalChart";
import BodyHeatmapCard from "@/components/BodyHeatmapCard";
import { AnimatedStreakFlame } from "@/components/AnimatedStreakFlame";

// ── PDF Report Generator ───────────────────────────────────────────────────────

async function generateInsightsPDF({
  userName,
  stats,
  entries,
  primaryColor,
  priorityInsights,
  triggerData,
}: {
  userName: string;
  stats: any;
  entries: any[];
  primaryColor: string;
  priorityInsights: any;
  triggerData: any;
}) {
  const now = new Date();
  const reportDate = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const reportTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  // ── Compute emotion frequencies ──────────────────────────────────────────
  const emotionCounts: Record<string, number> = {};
  entries.forEach((e) => {
    (e.emotions || []).forEach((em: string) => {
      emotionCounts[em] = (emotionCounts[em] || 0) + 1;
    });
  });
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ── Compute valence/arousal averages ─────────────────────────────────────
  const avgValence = entries.length
    ? Math.round(entries.reduce((s, e) => s + (e.valence ?? 0), 0) / entries.length)
    : 0;
  const avgArousal = entries.length
    ? Math.round(entries.reduce((s, e) => s + (e.arousal ?? 0), 0) / entries.length)
    : 0;
  const valenceLabel =
    avgValence > 20 ? "Mostly Pleasant" :
    avgValence < -20 ? "Mostly Unpleasant" : "Neutral / Mixed";
  const arousalLabel =
    avgArousal > 60 ? "High Energy" :
    avgArousal < 40 ? "Calm / Low Energy" : "Moderate Energy";

  // ── Time of day breakdown ─────────────────────────────────────────────────
  const timeSlots: Record<string, number> = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
  entries.forEach((e) => {
    const h = new Date(e.createdAt).getHours();
    if (h >= 5 && h < 12) timeSlots.Morning++;
    else if (h >= 12 && h < 17) timeSlots.Afternoon++;
    else if (h >= 17 && h < 21) timeSlots.Evening++;
    else timeSlots.Night++;
  });

  // ── Distress overview ────────────────────────────────────────────────────
  const highDistress = entries.filter((e) => e.distressLevel === "high").length;
  const groundingUsed = entries.filter((e) => e.groundingUsed).length;

  // ── Recent entries (last 5) ───────────────────────────────────────────────
  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // ── AI insights ──────────────────────────────────────────────────────────
  const insights = (priorityInsights || []).slice(0, 3);

  // ── Triggers ─────────────────────────────────────────────────────────────
  const triggers = triggerData?.triggers?.slice(0, 4) || [];

  const col = primaryColor;

  const recentRows = recentEntries.map((e) => {
    const d = new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dur = Math.round(e.duration / 60);
    return `
    <tr>
      <td>${d}</td>
      <td style="text-transform:capitalize">${e.primaryEmotion || "—"}</td>
      <td>${dur} min</td>
      <td style="font-size:12px;color:#555">${(e.title || "").slice(0, 60)}${(e.title || "").length > 60 ? "…" : ""}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Vocolens Insights — ${userName}</title>
  <style>
    @media print {
      body { padding: 20px; font-size: 12px; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      h2 { page-break-after: avoid; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a2e; background: #f8f9ff;
      padding: 32px; font-size: 14px; line-height: 1.65;
      max-width: 820px; margin: 0 auto;
    }
    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, ${col} 0%, ${col}cc 100%);
      border-radius: 20px; padding: 28px 32px;
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 28px; color: #fff;
    }
    .header-title { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .header-sub { font-size: 13px; opacity: 0.85; }
    .header-meta { text-align: right; font-size: 12px; opacity: 0.8; line-height: 1.8; }
    .header-logo { font-size: 20px; font-weight: 800; margin-bottom: 2px; }
    /* ── Section ── */
    .section {
      background: #fff; border-radius: 16px;
      padding: 24px; margin-bottom: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      border: 1px solid #eef0f8;
    }
    h2 {
      font-size: 15px; font-weight: 700; color: ${col};
      margin-bottom: 16px; padding-bottom: 8px;
      border-bottom: 2px solid ${col}22;
      display: flex; align-items: center; gap: 8px;
    }
    h2 .icon { font-size: 16px; }
    /* ── Stat grid ── */
    .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
    .stat-card {
      background: ${col}0d; border: 1.5px solid ${col}30;
      border-radius: 12px; padding: 16px; text-align: center;
    }
    .stat-val { font-size: 26px; font-weight: 800; color: ${col}; }
    .stat-lbl { font-size: 10px; color: #888; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    /* ── Mood chips ── */
    .chip-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .chip {
      background: ${col}0d; border: 1.5px solid ${col}30;
      border-radius: 10px; padding: 10px 16px; font-size: 13px; flex: 1; min-width: 160px;
    }
    .chip strong { color: ${col}; }
    .chip .sub { color: #999; font-size: 11px; }
    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { background: ${col}; }
    th { color: #fff; padding: 10px 14px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
    td { padding: 9px 14px; border-bottom: 1px solid #f0f0f8; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafbff; }
    .bar-bg { background: #eef; border-radius: 4px; height: 7px; width: 100%; overflow: hidden; }
    .bar-fill { background: ${col}; border-radius: 4px; height: 7px; }
    /* ── Insight cards ── */
    .insight {
      border-left: 3px solid ${col}; padding: 12px 16px;
      margin-bottom: 12px; background: #fafbff;
      border-radius: 0 12px 12px 0;
    }
    .insight:last-child { margin-bottom: 0; }
    .insight-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #1a1a2e; }
    .insight-body { font-size: 13px; color: #555; line-height: 1.55; }
    /* ── Triggers ── */
    .trigger-list { list-style: none; padding: 0; }
    .trigger-list li {
      padding: 9px 0; border-bottom: 1px solid #f0f0f8;
      font-size: 13px; display: flex; align-items: center; gap: 8px;
    }
    .trigger-list li:last-child { border-bottom: none; }
    .trigger-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: ${col}; flex-shrink: 0;
    }
    /* ── Alert banner ── */
    .alert {
      background: #fff8e1; border: 1.5px solid #ffcc02;
      border-radius: 10px; padding: 12px 16px;
      font-size: 13px; margin-top: 12px; color: #7a5c00;
    }
    /* ── Footer ── */
    .footer {
      margin-top: 28px; padding-top: 16px;
      border-top: 1px solid #e8eaf0;
      font-size: 11px; color: #aaa; text-align: center; line-height: 1.8;
    }
    .print-hint {
      background: ${col}0d; border: 1px dashed ${col}55;
      border-radius: 10px; padding: 10px 16px;
      font-size: 12px; color: ${col}; text-align: center;
      margin-bottom: 20px; font-weight: 600;
    }
  </style>
</head>
<body>

  <div class="print-hint no-print">
    💡 To save as PDF: tap the share icon in your browser → "Print" → Save as PDF
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-title">Vocolens Insights Report</div>
      <div class="header-sub">Prepared for <strong>${userName}</strong></div>
      <div class="header-sub" style="margin-top:4px;opacity:0.7;font-size:11px">
        Confidential · For personal health tracking &amp; professional consultation
      </div>
    </div>
    <div class="header-meta">
      <div class="header-logo">Vocolens</div>
      <div>${reportDate}</div>
      <div>${reportTime}</div>
    </div>
  </div>

  <!-- Overview -->
  <div class="section">
    <h2><span class="icon">📊</span> Overview</h2>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-val">${stats.totalEntries}</div><div class="stat-lbl">Total Entries</div></div>
      <div class="stat-card"><div class="stat-val">${stats.currentStreak}</div><div class="stat-lbl">Current Streak (days)</div></div>
      <div class="stat-card"><div class="stat-val">${stats.longestStreak}</div><div class="stat-lbl">Best Streak (days)</div></div>
      <div class="stat-card"><div class="stat-val">${stats.weeklyEntries}</div><div class="stat-lbl">This Week</div></div>
      <div class="stat-card"><div class="stat-val">${stats.monthlyEntries}</div><div class="stat-lbl">This Month</div></div>
      <div class="stat-card"><div class="stat-val">${Math.round(stats.totalDuration / 60)}</div><div class="stat-lbl">Total Minutes</div></div>
    </div>
  </div>

  <!-- Emotional Tone -->
  <div class="section">
    <h2><span class="icon">🎭</span> Emotional Tone</h2>
    <div class="chip-row">
      <div class="chip">Valence: <strong>${valenceLabel}</strong><br><span class="sub">avg ${avgValence > 0 ? "+" : ""}${avgValence} (−100 unpleasant → +100 pleasant)</span></div>
      <div class="chip">Energy: <strong>${arousalLabel}</strong><br><span class="sub">avg arousal ${avgArousal}/100</span></div>
      <div class="chip">Avg Mood: <strong>${stats.averageMood}/100</strong><br><span class="sub">overall emotional intensity</span></div>
    </div>
    ${highDistress > 0 ? `<div class="alert">⚠️ High distress recorded in <strong>${highDistress}</strong> ${highDistress === 1 ? "entry" : "entries"}${groundingUsed > 0 ? ` · Grounding exercises used <strong>${groundingUsed}</strong> times` : ""}</div>` : ""}
  </div>

  ${topEmotions.length > 0 ? `
  <!-- Top Emotions -->
  <div class="section">
    <h2><span class="icon">💜</span> Top Emotions</h2>
    <table>
      <thead><tr><th>Emotion</th><th>Frequency</th><th style="width:35%">Prevalence</th></tr></thead>
      <tbody>
        ${topEmotions.map(([name, count]) => `
        <tr>
          <td style="text-transform:capitalize;font-weight:600">${name}</td>
          <td>${count} ${count === 1 ? "entry" : "entries"}</td>
          <td><div class="bar-bg"><div class="bar-fill" style="width:${Math.round((count / entries.length) * 100)}%"></div></div></td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- Time of Day -->
  <div class="section">
    <h2><span class="icon">🕐</span> Journaling by Time of Day</h2>
    <table>
      <thead><tr><th>Time of Day</th><th>Entries</th></tr></thead>
      <tbody>
        ${Object.entries(timeSlots).map(([slot, count]) => `
        <tr><td style="font-weight:600">${slot}</td><td>${count} ${count === 1 ? "entry" : "entries"}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  ${insights.length > 0 ? `
  <!-- AI Insights -->
  <div class="section page-break">
    <h2><span class="icon">💡</span> AI-Generated Insights</h2>
    ${insights.map((ins: any) => `
    <div class="insight">
      <div class="insight-title">${ins.emoji || "💡"} ${ins.title || ""}</div>
      <div class="insight-body">${ins.message || ""}</div>
    </div>`).join("")}
  </div>` : ""}

  ${triggers.length > 0 ? `
  <!-- Patterns & Triggers -->
  <div class="section">
    <h2><span class="icon">🔍</span> Identified Patterns &amp; Triggers</h2>
    <ul class="trigger-list">
      ${triggers.map((t: any) => `
      <li><span class="trigger-dot"></span><strong>${t.trigger || t.topic || t.id || "Pattern"}</strong> — ${t.frequency || t.count || ""} occurrences · ${t.type || ""}</li>`).join("")}
    </ul>
  </div>` : ""}

  ${recentEntries.length > 0 ? `
  <!-- Recent Entries -->
  <div class="section">
    <h2><span class="icon">📝</span> Recent Journal Entries</h2>
    <table>
      <thead><tr><th>Date</th><th>Primary Emotion</th><th>Duration</th><th>Title</th></tr></thead>
      <tbody>${recentRows}</tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    Generated by <strong>Vocolens</strong> on ${reportDate} at ${reportTime}<br>
    This report is confidential and intended for personal health tracking and professional consultation only.<br>
    To save as PDF: open in browser → File → Print → Save as PDF
  </div>

</body>
</html>`;

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("File system not available on this device.");
  }
  const fileUri = `${cacheDir}vocolens-insights-${Date.now()}.html`;
  await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });
  return fileUri;
}

// Core emotions with icons and emojis - 8 Plutchik emotions
// Row 1: Happiness, Sadness, Anger, Anticipation
// Row 2: Fear, Surprise, Disgust, Trust
const CORE_EMOTIONS = [
  {
    id: "happiness" as EmotionType,
    label: "Happiness",
    icon: Smiley,
    color: "#FFD93D",
    emoji: "😊",
    faceIcon: SmileyWink,
  },
  {
    id: "sadness" as EmotionType,
    label: "Sadness",
    icon: SmileySad,
    color: "#6B8DD6",
    emoji: "😢",
    faceIcon: SmileySad,
  },
  {
    id: "anger" as EmotionType,
    label: "Anger",
    icon: Lightning,
    color: "#FF6B6B",
    emoji: "😤",
    faceIcon: SmileyAngry,
  },
  {
    id: "anticipation" as EmotionType,
    label: "Anticipation",
    icon: SunDim,
    color: "#FFB74D",
    emoji: "🤩",
    faceIcon: Star,
  },
  {
    id: "fear" as EmotionType,
    label: "Fear",
    icon: Warning,
    color: "#9575CD",
    emoji: "😰",
    faceIcon: SmileyMeh,
  },
  {
    id: "surprise" as EmotionType,
    label: "Surprise",
    icon: Lightning,
    color: "#FF8A65",
    emoji: "😮",
    faceIcon: Star,
  },
  {
    id: "disgust" as EmotionType,
    label: "Disgust",
    icon: ShieldWarning,
    color: "#7CB342",
    emoji: "🤢",
    faceIcon: SmileyMeh,
  },
  {
    id: "trust" as EmotionType,
    label: "Trust",
    icon: Handshake,
    color: "#4DB6AC",
    emoji: "🤝",
    faceIcon: HeartFace,
  },
] as const;

type TimeRange = "7D" | "14D" | "30D";
type ViewMode = "overall" | "emotion";

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();

  // Get theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  return (
    <ThemeProvider Colors={Colors} Gradients={Gradients} Shadows={Shadows}>
      <InsightsContent insets={insets} />
    </ThemeProvider>
  );
}

function InsightsContent({
  insets,
}: {
  insets: { top: number; bottom: number; left: number; right: number };
}) {
  const [triggerTimeWindow, setTriggerTimeWindow] = useState<
    "7D" | "14D" | "30D"
  >("30D");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showDeeper, setShowDeeper] = useState(false);

  // Get theme from context
  const { Colors, Gradients, Shadows } = useTheme();
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const isFocused = useIsFocused();

  // Get real data from stores
  const entries = useJournalStore((s) => s.entries);
  const stats = useUserStatsStore((s) => s.stats);
  const usageMinutes = useUsageMinutes();
  const remainingMinutes = useRemainingMinutes();
  const getAllBadges = useBadgesStore((s) => s.getAllBadges);

  // Get mood trend data using React Query
  const { data: insightsData } = useInsights(30);
  const { data: priorityInsights, isLoading: insightsLoading } =
    usePriorityInsights();
  const { data: triggerData } = useTriggerDetection(triggerTimeWindow);

  // Animation key for triggering re-animations
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (isFocused) {
      setAnimationKey((prev) => prev + 1);
    }
  }, [isFocused]);

  // Find next badge to unlock
  const nextBadge = useMemo(() => {
    const badges = getAllBadges();
    const inProgress = badges.find((b) => !b.unlocked && b.progress > 0);
    if (inProgress) {
      return {
        name: inProgress.title,
        progress: inProgress.progress / 100,
      };
    }
    const locked = badges.find((b) => !b.unlocked);
    if (locked) {
      return {
        name: locked.title,
        progress: 0,
      };
    }
    return {
      name: "All badges unlocked!",
      progress: 1,
    };
  }, [getAllBadges]);

  // Generate sentiment timeline data from entries — unused, kept for topThemes dep
  const getSentimentData = useCallback(() => {
    return [];
  }, [entries]);

  // Get emotional themes from trigger detection (maps topics to actual emotions)
  const topThemes = useMemo(() => {
    // Use trigger data which correctly maps topics to emotions
    if (triggerData?.triggers && triggerData.triggers.length > 0) {
      return triggerData.triggers.slice(0, 7).map((t) => ({
        label: `${t.trigger.charAt(0).toUpperCase() + t.trigger.slice(1)} (${t.type})`,
        count: t.frequency,
        emotion: t.associatedEmotions[0],
        moodType: t.type,
      }));
    }
    // Fallback to insights topics if trigger data not available
    if (!insightsData?.topTopics) return [];
    return insightsData.topTopics.slice(0, 7).map((topic, i) => ({
      label: topic.charAt(0).toUpperCase() + topic.slice(1),
      count: Math.max(1, 10 - i * 2),
    }));
  }, [triggerData, insightsData]);

  // Get time of day patterns with actual computed moods
  const timeOfDayPatterns = useMemo(() => {
    const patterns: Record<
      string,
      {
        totalIntensity: number;
        entries: number;
        dominantEmotion: Record<string, number>;
      }
    > = {
      Morning: { totalIntensity: 0, entries: 0, dominantEmotion: {} },
      Afternoon: { totalIntensity: 0, entries: 0, dominantEmotion: {} },
      Evening: { totalIntensity: 0, entries: 0, dominantEmotion: {} },
      Night: { totalIntensity: 0, entries: 0, dominantEmotion: {} },
    };

    entries.forEach((entry) => {
      const hour = new Date(entry.createdAt).getHours();
      let period: string;
      if (hour >= 5 && hour < 12) period = "Morning";
      else if (hour >= 12 && hour < 17) period = "Afternoon";
      else if (hour >= 17 && hour < 21) period = "Evening";
      else period = "Night";

      patterns[period].entries++;
      patterns[period].totalIntensity += entry.emotionIntensity;
      // Track dominant emotion
      const emotion = entry.primaryEmotion;
      if (emotion) {
        patterns[period].dominantEmotion[emotion] =
          (patterns[period].dominantEmotion[emotion] || 0) + 1;
      }
    });

    // Helper to get mood label based on average intensity and dominant emotion
    const getMoodLabel = (
      period: string,
      avgIntensity: number,
      dominantEmotions: Record<string, number>,
    ): string => {
      if (Object.keys(dominantEmotions).length === 0) {
        // Default labels when no data
        const defaults: Record<string, string> = {
          Morning: "Energized",
          Afternoon: "Focused",
          Evening: "Reflective",
          Night: "Calm",
        };
        return defaults[period] || "Neutral";
      }

      // Find the most common emotion for this time period
      const topEmotion = Object.entries(dominantEmotions).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];

      // Map emotions to mood labels based on intensity
      const emotionMoodMap: Record<string, { high: string; low: string }> = {
        happiness: { high: "Joyful", low: "Content" },
        sadness: { high: "Melancholic", low: "Pensive" },
        anger: { high: "Frustrated", low: "Irritated" },
        fear: { high: "Anxious", low: "Uneasy" },
        surprise: { high: "Amazed", low: "Curious" },
        disgust: { high: "Disturbed", low: "Uncomfortable" },
        trust: { high: "Confident", low: "Secure" },
        anticipation: { high: "Excited", low: "Hopeful" },
      };

      const moodConfig = emotionMoodMap[topEmotion];
      if (moodConfig) {
        return avgIntensity >= 60 ? moodConfig.high : moodConfig.low;
      }
      return avgIntensity >= 60 ? "Energized" : "Calm";
    };

    return [
      {
        period: "Morning",
        icon: Sun,
        entries: patterns.Morning.entries,
        mood: getMoodLabel(
          "Morning",
          patterns.Morning.entries > 0
            ? patterns.Morning.totalIntensity / patterns.Morning.entries
            : 0,
          patterns.Morning.dominantEmotion,
        ),
        avgIntensity:
          patterns.Morning.entries > 0
            ? Math.round(
                patterns.Morning.totalIntensity / patterns.Morning.entries,
              )
            : null,
      },
      {
        period: "Afternoon",
        icon: Sunset,
        entries: patterns.Afternoon.entries,
        mood: getMoodLabel(
          "Afternoon",
          patterns.Afternoon.entries > 0
            ? patterns.Afternoon.totalIntensity / patterns.Afternoon.entries
            : 0,
          patterns.Afternoon.dominantEmotion,
        ),
        avgIntensity:
          patterns.Afternoon.entries > 0
            ? Math.round(
                patterns.Afternoon.totalIntensity / patterns.Afternoon.entries,
              )
            : null,
      },
      {
        period: "Evening",
        icon: Moon,
        entries: patterns.Evening.entries,
        mood: getMoodLabel(
          "Evening",
          patterns.Evening.entries > 0
            ? patterns.Evening.totalIntensity / patterns.Evening.entries
            : 0,
          patterns.Evening.dominantEmotion,
        ),
        avgIntensity:
          patterns.Evening.entries > 0
            ? Math.round(
                patterns.Evening.totalIntensity / patterns.Evening.entries,
              )
            : null,
      },
      {
        period: "Night",
        icon: CloudMoon,
        entries: patterns.Night.entries,
        mood: getMoodLabel(
          "Night",
          patterns.Night.entries > 0
            ? patterns.Night.totalIntensity / patterns.Night.entries
            : 0,
          patterns.Night.dominantEmotion,
        ),
        avgIntensity:
          patterns.Night.entries > 0
            ? Math.round(patterns.Night.totalIntensity / patterns.Night.entries)
            : null,
      },
    ];
  }, [entries]);

  const userName = useOnboardingStore((s) => s.userName);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [shareToast, setShareToast] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  if (!fontsLoaded) {
    return (
      <View className="flex-1" style={{ backgroundColor: Gradients.background[1] }}>
        <LinearGradient
          colors={Gradients.background}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>
    );
  }

  const user = {
    name: userName ? userName.split(" ")[0] : "Friend",
    streak: stats.currentStreak,
    nextBadge,
    usageMinutes,
    remainingMinutes,
  };

  const handleSharePDF = () => {
    tapHaptic();
    setShareModalVisible(true);
  };

  const confirmSharePDF = async () => {
    setShareModalVisible(false);
    try {
      setIsGeneratingPDF(true);
      const uri = await generateInsightsPDF({
        userName: user.name,
        stats,
        entries,
        primaryColor: Colors.primary,
        priorityInsights,
        triggerData,
      });
      if (!uri) {
        setIsGeneratingPDF(false);
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "text/html",
        dialogTitle: "Share Vocolens Insights Report",
        UTI: "public.html",
      });
    } catch (err: any) {
      // silent
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Gradients.background[2] }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        key={`insights-${animationKey}`}
      >
        {/* Welcome Section */}
        <Animated.View entering={ENTER_1}>
          <WelcomeSection user={user} totalEntries={stats.totalEntries} />
        </Animated.View>

        {/* Journal Streak Calendar */}
        <Animated.View entering={ENTER_2}>
          <View className="mb-6">
            <StreakCalendar
              entries={entries}
              primaryColor={Colors.primary}
              currentStreak={stats.currentStreak}
            />
          </View>
        </Animated.View>

        {/* Weekly Reflection Summary */}
        {entries.length >= 1 && (
          <Animated.View entering={ENTER_2}>
            <WeeklyReflectionCard primaryColor={Colors.primary} />
          </Animated.View>
        )}

        {/* Mood Story Timeline — always shown; handles its own empty state */}
        <Animated.View entering={ENTER_3}>
          <MoodStoryTimeline entries={entries} primaryColor={Colors.primary} />
        </Animated.View>

        {/* ── "Explore deeper" collapsible — reduces cognitive load ── */}
        {!showDeeper && (
          <Pressable
            onPress={() => { tapHaptic(); setShowDeeper(true); }}
            style={{
              marginBottom: 20,
              paddingVertical: 14,
              borderRadius: 16,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.15)",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
                color: "#FFFFFF",
              }}
            >
              Explore deeper ↓
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: "rgba(255,255,255,0.5)",
                marginTop: 4,
              }}
            >
              Emotional landscape, body map, triggers & more
            </Text>
          </Pressable>
        )}

        {showDeeper && (
          <>

        {/* Valence-Arousal Emotional Landscape */}
        <Animated.View
          entering={ENTER_3}
          className="overflow-hidden mb-6"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.20)",
            borderRadius: 24,
          }}
        >
          <ValenceArousalChart
            entries={entries}
            primaryColor={Colors.primary}
          />
        </Animated.View>

        {/* Body Sensation Heatmap — always shown; handles its own empty state */}
        <Animated.View entering={ENTER_3} className="mb-6">
          <BodyHeatmapCard
            entries={entries}
            primaryColor={Colors.primary}
          />
        </Animated.View>

        {/* Deep Insights */}
        {entries.length >= 5 &&
          priorityInsights &&
          priorityInsights.length > 0 && (
            <Animated.View entering={ENTER_4}>
              <DeepInsightsSection insights={priorityInsights} />
            </Animated.View>
          )}

        {/* Trigger Detection Section */}
        <Animated.View entering={ENTER_4}>
          <View
            className="mb-6"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              borderRadius: BorderRadius.xxlarge,
              overflow: "hidden",
              ...Shadows.medium,
            }}
          >
            <View className="p-5">
              <TriggerSectionHeader
                timeWindow={triggerTimeWindow}
                onTimeWindowChange={setTriggerTimeWindow}
              />

              {triggerData?.hasEnoughData && triggerData.triggers.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {triggerData.triggers.map((trigger, index) => (
                    <TriggerInsightCard
                      key={trigger.id}
                      trigger={trigger}
                      index={index}
                    />
                  ))}
                </View>
              ) : (
                <TriggerEmptyState
                  currentEntries={triggerData?.currentEntries || 0}
                  minRequired={triggerData?.minEntriesRequired || 5}
                />
              )}
            </View>
          </View>
        </Animated.View>

        {/* Emotional Themes */}
        {topThemes.length > 0 && (
          <Animated.View entering={ENTER_5}>
            <EmotionalThemes themes={topThemes} />
          </Animated.View>
        )}

        {/* Time of Day Patterns */}
        <Animated.View entering={ENTER_5}>
          <TimeOfDayPatterns patterns={timeOfDayPatterns} />
        </Animated.View>

          </>
        )}
      </ScrollView>

      {/* Share button — rendered AFTER ScrollView so it sits on top and receives touches */}
      <Pressable
        onPress={handleSharePDF}
        disabled={isGeneratingPDF || shareToast}
        style={{
          position: "absolute",
          top: insets.top + 10,
          right: 20,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: hexToRgba(Colors.primary, 0.18),
          borderWidth: 1.5,
          borderColor: hexToRgba(Colors.primary, 0.40),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isGeneratingPDF ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <ShareNetwork size={17} color="#FFFFFF" weight="duotone" />
        )}
      </Pressable>

      {/* Therapist share toast notification */}
      {shareToast && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={{
            position: "absolute",
            bottom: insets.bottom + 40,
            left: 24,
            right: 24,
            backgroundColor: "rgba(30,28,48,0.97)",
            borderRadius: 18,
            borderWidth: 1.5,
            borderColor: hexToRgba(Colors.primary, 0.55),
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <Text style={{ fontSize: 28 }}>🩺</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 14,
                color: "#FFFFFF",
                marginBottom: 3,
              }}
            >
              Share with your therapist
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 18,
              }}
            >
              A full insights report is being prepared — you can send it directly to your therapist or save it as a PDF.
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Share Insights Modal */}
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.70)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View
            style={{
              backgroundColor: Gradients.background[1],
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 380,
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              overflow: "hidden",
            }}
          >
            {/* Icon */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: hexToRgba(Colors.primary, 0.18),
                  borderWidth: 1.5,
                  borderColor: hexToRgba(Colors.primary, 0.35),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShareNetwork size={24} color="#FFFFFF" weight="duotone" />
              </View>
            </View>

            {/* Title */}
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                color: "#FFFFFF",
                fontSize: 20,
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              Share insights report
            </Text>

            {/* Description */}
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255, 255, 255, 0.70)",
                fontSize: 14,
                textAlign: "center",
                lineHeight: 21,
                marginBottom: 24,
              }}
            >
              Generate a personalized emotional wellness report to share with your doctor, counselor, or therapist.
            </Text>

            {/* Share button */}
            <Pressable
              onPress={confirmSharePDF}
              style={{
                borderRadius: 18,
                borderWidth: 2,
                borderColor: "#FFFFFF",
                overflow: "hidden",
                marginBottom: 12,
              }}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 15,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Inter_700Bold",
                    fontSize: 16,
                  }}
                >
                  Share report
                </Text>
              </LinearGradient>
            </Pressable>

            {/* Cancel button */}
            <Pressable
              onPress={() => setShareModalVisible(false)}
              style={{
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  color: "rgba(255, 255, 255, 0.45)",
                  fontSize: 14,
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface WelcomeSectionProps {
  user: {
    name: string;
    streak: number;
    nextBadge: {
      name: string;
      progress: number;
    };
    usageMinutes: number;
    remainingMinutes: number;
  };
  totalEntries: number;
}

function WelcomeSection({ user, totalEntries }: WelcomeSectionProps) {
  const { Colors, Gradients, Shadows } = useTheme();
  const progressWidth = useSharedValue(0);
  const usageWidth = useSharedValue(0);

  const usagePct = Math.min(1, user.usageMinutes / USAGE_LIMIT_MINUTES);
  const isNearLimit = usagePct >= 0.8 && usagePct < 1;
  const isAtLimit = usagePct >= 1;
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return `Good morning, ${user.name}!`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${user.name}!`;
    if (hour >= 17 && hour < 21) return `Good evening, ${user.name}!`;
    return `Hey, ${user.name}!`;
  }, [user.name]);

  // Dynamic subline that rotates every app open — never the same twice in a row
  const [subline, setSubline] = React.useState("");

  React.useEffect(() => {
    const SUBLINES = [
      "Here's what your voice revealed about you.",
      "Your emotions have been speaking. Let's listen.",
      "Patterns are forming. Take a look.",
      "You're building self-awareness, one entry at a time.",
      "What did your feelings tell you this week?",
    ];
    const STORAGE_KEY = "insights_subline_last_index";

    (async () => {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        const lastStr = await AsyncStorage.getItem(STORAGE_KEY);
        const last = lastStr !== null ? parseInt(lastStr, 10) : -1;
        let next: number;
        do {
          next = Math.floor(Math.random() * SUBLINES.length);
        } while (next === last && SUBLINES.length > 1);
        await AsyncStorage.setItem(STORAGE_KEY, next.toString());
        setSubline(SUBLINES[next]);
      } catch {
        setSubline(SUBLINES[0]);
      }
    })();
  }, []);

  React.useEffect(() => {
    progressWidth.value = withSpring(user.nextBadge.progress * 100, {
      damping: 15,
      stiffness: 100,
    });
  }, [user.nextBadge.progress, progressWidth]);

  React.useEffect(() => {
    usageWidth.value = withDelay(
      200,
      withSpring(usagePct * 100, {
        damping: 15,
        stiffness: 80,
      }),
    );
  }, [usagePct, usageWidth]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const usageBarStyle = useAnimatedStyle(() => ({
    width: `${usageWidth.value}%`,
  }));

  const usageBarColor = isAtLimit
    ? "#FF5050"
    : isNearLimit
      ? "#FFB830"
      : Colors.primary;

  return (
    <View className="mb-6">
      {/* Emotional Companion */}
      <View className="flex-row items-center mb-6" style={{ justifyContent: 'center' }}>
        <EmotionalCompanion
          state="idle"
          size={120}
          themeColor={Colors.primary}
        />
      </View>

      <View>
        <Text
          style={{
            fontFamily: "Fraunces_700Bold",
            color: "#FFFFFF",
            fontSize: 30,
            textAlign: "center",
            lineHeight: 38,
            opacity: 0.92,
            letterSpacing: 0.2,
            marginBottom: 6,
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            color: "rgba(255, 255, 255, 0.65)",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
          className="mb-5"
        >
          {subline}
        </Text>
      </View>

      {/* Streak & Badge Card */}
      <View
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.12)",
          borderWidth: 2,
          borderColor: "rgba(255, 255, 255, 0.20)",
          borderRadius: BorderRadius.xxlarge,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        }}
      >
        <View className="p-5">
          {/* Streak */}
          <View className="flex-row items-center mb-4">
            <View style={{ marginRight: 12 }}>
              <AnimatedStreakFlame
                streak={user.streak}
                size={22}
                badgeSize={40}
                badgeRadius={12}
                badgeColor="rgba(255, 255, 255, 0.15)"
                glowColor="rgba(255, 255, 255, 0.5)"
              />
            </View>
            <View>
              <Text
                style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                className="text-xl"
              >
                {user.streak} {user.streak === 1 ? "day" : "days"} streak
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                className="text-sm"
              >
                {user.streak === 0
                  ? "Record today to start!"
                  : user.streak < 3
                    ? "Next: 3-day streak"
                    : user.streak < 7
                      ? "Next: 7-day streak"
                      : user.streak < 14
                        ? "Next: 14-day streak"
                        : user.streak < 30
                          ? "Next: 30-day streak"
                          : user.streak < 100
                            ? "Next: 100-day streak"
                            : "Amazing streak!"}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: hexToRgba(Colors.primary, 0.15),
              marginVertical: 12,
            }}
          />

          {/* Next Badge */}
          <View className="flex-row items-center">
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>
              <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <Trophy size={24} color="#FFFFFF" weight="duotone" />
            </View>
            <View className="flex-1">
              <Text
                style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                className="text-base mb-2"
              >
                Next: {user.nextBadge.name}
              </Text>
              {/* Progress Bar */}
              <View
                style={{
                  height: 8,
                  borderRadius: BorderRadius.round,
                  backgroundColor: hexToRgba(Colors.primary, 0.15),
                  overflow: "hidden",
                }}
              >
                <Animated.View
                  style={[progressStyle, { height: "100%", borderRadius: BorderRadius.round, backgroundColor: "#FFFFFF" }]}
                />
              </View>
            </View>
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: hexToRgba(Colors.primary, 0.15),
              marginVertical: 12,
            }}
          />

          {/* Monthly Usage */}
          <View className="flex-row items-center">
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>
              <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <Clock size={24} color="#FFFFFF" weight="duotone" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    color: "#FFFFFF",
                    fontSize: 14,
                  }}
                >
                  Monthly minutes
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    color: isAtLimit
                      ? "#FF8080"
                      : isNearLimit
                        ? "#FFD080"
                        : "rgba(255,255,255,0.9)",
                    fontSize: 14,
                  }}
                >
                  {Math.floor(user.usageMinutes)}{" "}
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                    }}
                  >
                    / {USAGE_LIMIT_MINUTES} min
                  </Text>
                </Text>
              </View>
              {/* Animated usage bar */}
              <View
                style={{
                  height: 8,
                  borderRadius: BorderRadius.round,
                  backgroundColor: hexToRgba(Colors.primary, 0.15),
                  overflow: "hidden",
                }}
              >
                <Animated.View
                  style={[
                    usageBarStyle,
                    {
                      height: "100%",
                      borderRadius: BorderRadius.round,
                      backgroundColor: "#FFFFFF",
                    },
                  ]}
                />
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: isAtLimit
                    ? "rgba(255,160,160,0.9)"
                    : "rgba(255,255,255,0.7)",
                  fontSize: 10,
                  marginTop: 5,
                }}
              >
                {isAtLimit
                  ? "Limit reached · Resets next month"
                  : `${Math.floor(user.remainingMinutes)} min remaining this month`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

interface EmotionSelectorProps {
  selectedEmotion: EmotionType | null;
  onEmotionSelect: (emotionId: EmotionType) => void;
}

function EmotionSelector({
  selectedEmotion,
  onEmotionSelect,
}: EmotionSelectorProps) {
  const { Colors } = useTheme();
  return (
    <View className="mb-4" style={{ backgroundColor: "transparent" }}>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          color: "#FFFFFF",
          fontSize: 12,
          marginBottom: 10,
        }}
      >
        Select emotion
      </Text>
      <View
        style={{
          borderRadius: BorderRadius.medium,
          overflow: "hidden",
          backgroundColor: "transparent",
        }}
      >
        <View
          className="flex-row flex-wrap"
          style={{
            gap: 8,
            padding: 12,
            backgroundColor: "transparent",
            borderWidth: 0,
            borderColor: "transparent",
          }}
        >
          {CORE_EMOTIONS.map((emotion) => {
            const FaceIcon = emotion.faceIcon;
            const isSelected = selectedEmotion === emotion.id;

            return (
              <Pressable
                key={emotion.id}
                onPress={() => {
                  selectionHaptic();
                  onEmotionSelect(emotion.id);
                }}
                style={{
                  flex: 1,
                  minWidth: "23%",
                  maxWidth: "24%",
                  backgroundColor: "transparent",
                }}
              >
                <View
                  style={{
                    backgroundColor: "transparent",
                    borderRadius: BorderRadius.medium,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: "transparent",
                    padding: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    aspectRatio: 1,
                  }}
                >
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                      backgroundColor: "transparent",
                    }}
                  >
                    <FaceIcon size={20} color="#FFFFFF" weight="duotone" />
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 8,
                        color: "#FFFFFF",
                        marginTop: 2,
                        textAlign: "center",
                      }}
                      numberOfLines={2}
                    >
                      {emotion.label}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface SentimentTimelineProps {
  viewMode: ViewMode;
  onModeSwitch: (mode: ViewMode) => void;
  selectedEmotion: EmotionType | null;
  onEmotionSelect: (emotionId: EmotionType) => void;
}

function SentimentTimeline({
  viewMode,
  onModeSwitch,
  selectedEmotion,
  onEmotionSelect,
}: SentimentTimelineProps) {
  const { Colors, Gradients, Shadows } = useTheme();
  const entries = useJournalStore((s) => s.entries);
  const selectedEmotionData = selectedEmotion
    ? CORE_EMOTIONS.find((e) => e.id === selectedEmotion)
    : null;

  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 1,
        borderColor: hexToRgba(Colors.primary, 0.15),
        borderRadius: BorderRadius.xxlarge,
        overflow: "hidden",
        ...Shadows.medium,
      }}
    >
      <View className="p-5">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10 }}>
              <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <TrendUp size={24} color="#FFFFFF" weight="duotone" />
            </View>
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
              className="text-lg"
            >
              {viewMode === "overall"
                ? "Sentiment timeline"
                : `${selectedEmotionData?.label || "Emotion"} focus`}
            </Text>
          </View>
        </View>

        {/* Mode Switch */}
        <View
          className="flex-row mb-4 p-1"
          style={{
            borderRadius: BorderRadius.large,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Pressable
            onPress={() => onModeSwitch("overall")}
            className="flex-1 py-2 items-center"
            style={{
              borderRadius: BorderRadius.medium,
            }}
          >
            {viewMode === "overall" ? (
              <LinearGradient
                colors={Gradients.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: BorderRadius.medium,
                }}
              />
            ) : null}
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                color: "#FFFFFF",
                fontSize: 14,
              }}
            >
              Overall mood
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onModeSwitch("emotion")}
            className="flex-1 py-2 items-center"
            style={{
              borderRadius: BorderRadius.medium,
            }}
          >
            {viewMode === "emotion" ? (
              <LinearGradient
                colors={Gradients.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: BorderRadius.medium,
                }}
              />
            ) : null}
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                color: "#FFFFFF",
                fontSize: 14,
              }}
            >
              Emotion focus
            </Text>
          </Pressable>
        </View>

        {/* Emotion Selector - only show when in emotion mode */}
        {viewMode === "emotion" && (
          <View>
            <EmotionSelector
              selectedEmotion={selectedEmotion}
              onEmotionSelect={onEmotionSelect}
            />
          </View>
        )}

        {/* Overall Mood Mode - Show dominant emotion for each timeframe */}
        {viewMode === "overall" && (
          <View>
            <OverallMoodDisplay />
          </View>
        )}

        {/* Emotion Focus Mode - Show selected emotion intensity across timeframes */}
        {viewMode === "emotion" && selectedEmotion && (
          <View>
            <EmotionIntensityDisplay emotion={selectedEmotion} />
          </View>
        )}

        {/* Emotion Focus Empty State */}
        {viewMode === "emotion" && !selectedEmotion && (
          <View
            style={{
              paddingVertical: 32,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
              }}
            >
              Select an emotion to view its intensity over time
            </Text>
          </View>
        )}

        {/* Overall Empty State */}
        {entries.length === 0 && viewMode === "overall" && (
          <View
            style={{
              paddingVertical: 32,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChartBar
              size={40}
              color="rgba(255, 255, 255, 0.5)"
              weight="duotone"
            />
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255, 255, 255, 0.8)",
                textAlign: "center",
                marginTop: 12,
              }}
            >
              Start journaling to see your sentiment trends
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// Overall Mood Display - Shows dominant emotion for each timeframe
function OverallMoodDisplay() {
  const { Colors } = useTheme();
  const entries = useJournalStore((s) => s.entries);

  // Calculate dominant emotion for a given timeframe
  const getDominantEmotion = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentEntries = entries.filter(
      (e) => new Date(e.createdAt) >= cutoffDate,
    );

    if (recentEntries.length === 0) return null;

    // Count emotion occurrences
    const emotionCounts: Record<string, number> = {};
    recentEntries.forEach((entry) => {
      entry.emotions.forEach((emotion) => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    // Find dominant emotion
    let maxCount = 0;
    let dominantEmotion: EmotionType | null = null;
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion as EmotionType;
      }
    });

    if (!dominantEmotion) return null;

    // Calculate intensity (percentage of entries with this emotion)
    const intensity = Math.round((maxCount / recentEntries.length) * 100);

    return {
      emotion: dominantEmotion,
      intensity,
      count: maxCount,
      totalEntries: recentEntries.length,
    };
  };

  const sevenDayData = getDominantEmotion(7);
  const fourteenDayData = getDominantEmotion(14);
  const thirtyDayData = getDominantEmotion(30);

  const timeframes = [
    { label: "7 Days", data: sevenDayData },
    { label: "14 Days", data: fourteenDayData },
    { label: "30 Days", data: thirtyDayData },
  ];

  return (
    <View style={{ paddingVertical: 16 }}>
      {timeframes.map((timeframe, index) => {
        const emotionData = timeframe.data
          ? CORE_EMOTIONS.find((e) => e.id === timeframe.data!.emotion)
          : null;

        return (
          <View
            key={timeframe.label}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              borderRadius: BorderRadius.large,
              padding: 16,
              overflow: "hidden",
              marginBottom: index < 2 ? 12 : 0,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 14,
                    color: "#FFFFFF",
                    marginBottom: 4,
                  }}
                >
                  {timeframe.label}
                </Text>
                {emotionData ? (
                  <>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 18,
                        color: "#FFFFFF",
                        marginBottom: 6,
                      }}
                    >
                      {emotionData.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: "rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      Appeared in {timeframe.data!.count} of{" "}
                      {timeframe.data!.totalEntries} entries
                    </Text>
                  </>
                ) : (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 14,
                      color: "rgba(255, 255, 255, 0.8)",
                    }}
                  >
                    No data available
                  </Text>
                )}
              </View>

              {emotionData && (
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 32,
                      backgroundColor: hexToRgba(Colors.primary, 0.15),
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 3,
                      borderColor: hexToRgba(Colors.primary, 0.25),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 18,
                        color: "#FFFFFF",
                      }}
                    >
                      {timeframe.data!.intensity}%
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 10,
                      color: "rgba(255, 255, 255, 0.8)",
                      marginTop: 4,
                    }}
                  >
                    Intensity
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Emotion Intensity Display - Shows selected emotion's intensity across timeframes
// Uses emotionScores (0-100 per-emotion from OpenRouter) when available,
// falls back to counting emotion occurrences.
function EmotionIntensityDisplay({ emotion }: { emotion: EmotionType }) {
  const { Colors } = useTheme();
  const entries = useJournalStore((s) => s.entries);

  // Calculate emotion intensity for a given timeframe
  const getEmotionIntensity = (days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentEntries = entries.filter(
      (e) => new Date(e.createdAt) >= cutoffDate,
    );

    if (recentEntries.length === 0) return null;

    // Prefer emotionScores (precise 0-100 scores from OpenRouter) when available
    const scoredEntries = recentEntries.filter((e) => e.emotionScores);
    if (scoredEntries.length > 0) {
      const avgScore = Math.round(
        scoredEntries.reduce(
          (sum, e) => sum + (e.emotionScores![emotion] ?? 0),
          0,
        ) / scoredEntries.length,
      );
      return {
        intensity: avgScore,
        count: scoredEntries.filter(
          (e) => (e.emotionScores![emotion] ?? 0) >= 30,
        ).length,
        totalEntries: recentEntries.length,
        usedScores: true,
      };
    }

    // Fallback: count how many entries contain this emotion
    const entriesWithEmotion = recentEntries.filter((entry) =>
      entry.emotions.includes(emotion),
    ).length;

    const intensity = Math.round(
      (entriesWithEmotion / recentEntries.length) * 100,
    );

    return {
      intensity,
      count: entriesWithEmotion,
      totalEntries: recentEntries.length,
      usedScores: false,
    };
  };

  const sevenDayData = getEmotionIntensity(7);
  const fourteenDayData = getEmotionIntensity(14);
  const thirtyDayData = getEmotionIntensity(30);

  const emotionData = CORE_EMOTIONS.find((e) => e.id === emotion);
  if (!emotionData) return null;

  const timeframes = [
    { label: "7 Days", data: sevenDayData },
    { label: "14 Days", data: fourteenDayData },
    { label: "30 Days", data: thirtyDayData },
  ];

  return (
    <View style={{ paddingVertical: 16 }}>
      {timeframes.map((timeframe, index) => (
        <View
          key={timeframe.label}
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.20)",
            borderRadius: BorderRadius.large,
            padding: 16,
            overflow: "hidden",
            marginBottom: index < 2 ? 12 : 0,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 14,
                  color: "#FFFFFF",
                  marginBottom: 8,
                }}
              >
                {timeframe.label}
              </Text>
              {timeframe.data ? (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 12,
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  {timeframe.data.usedScores
                    ? `Avg score across ${timeframe.data.totalEntries} entries`
                    : `Found in ${timeframe.data.count} of ${timeframe.data.totalEntries} entries`}
                </Text>
              ) : (
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                >
                  No data available
                </Text>
              )}
            </View>

            {timeframe.data && (
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: hexToRgba(Colors.primary, 0.15),
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: hexToRgba(Colors.primary, 0.25),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 18,
                      color: "#FFFFFF",
                    }}
                  >
                    {timeframe.data.intensity}
                    {timeframe.data.usedScores ? "" : "%"}
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 10,
                    color: "rgba(255, 255, 255, 0.8)",
                    marginTop: 4,
                  }}
                >
                  {timeframe.data.usedScores ? "Score" : "Intensity"}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

interface EmotionalThemesProps {
  themes: { label: string; count: number }[];
}

function EmotionalThemes({ themes }: EmotionalThemesProps) {
  const { Colors, Shadows } = useTheme();
  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.20)",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <View className="p-5">
        <View className="flex-row items-center mb-4">
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>
            <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
            <Sparkle size={24} color="#FFFFFF" weight="duotone" />
          </View>
          <View>
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
            >
              Emotional themes
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Recurring topics in your journal
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {themes.map((theme, index) => (
            <View key={theme.label}>
              <ThemeChip
                label={theme.label}
                count={theme.count}
                index={index}
              />
            </View>
          ))}
        </View>

        {/* Actionable takeaway — one concrete sentence for the dominant theme */}
        {themes.length > 0 && (
          <View
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
                lineHeight: 18,
              }}
            >
              💡 "{themes[0].label}" appeared {themes[0].count} time{themes[0].count !== 1 ? "s" : ""} — next time it comes up, pause and name the feeling before reacting.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

interface ThemeChipProps {
  label: string;
  count: number;
  index: number;
}

function ThemeChip({ label, count, index }: ThemeChipProps) {
  const { Colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    tapHaptic();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const purpleShades = [
    Colors.purple200,
    Colors.purple300,
    Colors.purple100,
    Colors.purple200,
    Colors.purple300,
  ];

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.20)",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: BorderRadius.large,
            flexDirection: "row",
            alignItems: "center",
          },
          animatedStyle,
        ]}
      >
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 14,
            color: "#FFFFFF",
          }}
        >
          {label}
        </Text>
        <View
          style={{
            marginLeft: 8,
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: BorderRadius.round,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 12,
              color: "#FFFFFF",
            }}
          >
            {count}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

interface TimeOfDayPatternsProps {
  patterns: {
    period: string;
    icon: typeof Sun;
    mood: string;
    entries: number;
  }[];
}

function TimeOfDayPatterns({ patterns }: TimeOfDayPatternsProps) {
  const { Colors, Shadows } = useTheme();
  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.20)",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <View className="p-5">
        <View className="flex-row items-center mb-4">
          <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>
            <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
            <Clock size={24} color="#FFFFFF" weight="duotone" />
          </View>
          <View>
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
            >
              Time of day
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              When your emotions peak and settle
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {patterns.map((pattern, index) => (
            <View key={pattern.period} style={{ width: "47%" }}>
              <TimeOfDayCard pattern={pattern} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

interface TimeOfDayCardProps {
  pattern: { period: string; icon: typeof Sun; mood: string; entries: number };
}

function TimeOfDayCard({ pattern }: TimeOfDayCardProps) {
  const { Colors } = useTheme();
  const scale = useSharedValue(1);
  const Icon = pattern.icon;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
    tapHaptic();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const iconColors: Record<string, string> = {
    Morning: Colors.accent,
    Afternoon: Colors.primary,
    Evening: Colors.primary,
    Night: Colors.gradientStart,
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.20)",
            borderRadius: BorderRadius.large,
            padding: 16,
          },
          animatedStyle,
        ]}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <Icon size={24} color="#FFFFFF" weight="duotone" />
        </View>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 16,
            color: "#FFFFFF",
            marginBottom: 4,
          }}
        >
          {pattern.period}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 14,
            color: "rgba(255, 255, 255, 0.8)",
            marginBottom: 8,
          }}
        >
          {pattern.mood}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_500Medium",
            fontSize: 12,
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          {pattern.entries} {pattern.entries === 1 ? "entry" : "entries"}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface DeepInsightsSectionProps {
  insights: Array<{
    category:
      | "self_awareness"
      | "growth"
      | "warning"
      | "strength"
      | "recommendation";
    title: string;
    message: string;
    evidence: string[];
    priority: "high" | "medium" | "low";
    emoji: string;
  }>;
}

function DeepInsightsSection({ insights }: DeepInsightsSectionProps) {
  const { Colors, Shadows } = useTheme();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "self_awareness":
        return Eye;
      case "growth":
        return Eye;
      case "warning":
        return AlertTriangle;
      case "strength":
        return Shield;
      case "recommendation":
        return Lightbulb;
      default:
        return Eye;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "self_awareness":
        return "#A88AFF";
      case "growth":
        return "#7BD97B";
      case "warning":
        return "#FFB347";
      case "strength":
        return "#8E6BFF";
      case "recommendation":
        return "#FFA8D5";
      default:
        return Colors.primary;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "Key insight";
      case "medium":
        return "Notable";
      case "low":
        return "Observation";
      default:
        return "";
    }
  };

  // Show only 1 insight by default to reduce cognitive load.
  // Users can expand to see more.
  const [expanded, setExpanded] = useState(false);
  const visibleInsights = expanded ? insights.slice(0, 5) : insights.slice(0, 1);
  const hasMore = insights.length > 1;

  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.20)",
        borderRadius: BorderRadius.xxlarge,
        overflow: "hidden",
      }}
    >
      <View className="p-5">
        {/* Header */}
        <View style={{ marginBottom: 16 }}>
          <View className="flex-row items-center mb-2">
            <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 12 }}>
              <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
              <Brain size={24} color="#FFFFFF" weight="duotone" />
            </View>
            <View>
              <Text
                style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 18 }}
              >
                Deep insights
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                AI-powered patterns and growth signals
              </Text>
            </View>
          </View>
        </View>

        {/* Insight Cards */}
        {visibleInsights.map((insight, index) => {
          return (
            <View key={`${insight.category}-${index}`} className="mb-4">
              <Pressable onPress={() => tapHaptic()}>
                <View
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderRadius: BorderRadius.xxlarge,
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                    overflow: "hidden",
                  }}
                >
                  {/* Subtle gradient accent */}
                  <LinearGradient
                    colors={[
                      hexToRgba(Colors.primary, 0.06),
                      hexToRgba(Colors.primary, 0.01),
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                    }}
                  />

                  <View style={{ padding: 18 }}>
                    {/* Title */}
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 16,
                        color: "#FFFFFF",
                        marginBottom: 8,
                      }}
                    >
                      {insight.title}
                    </Text>

                    {/* Priority Badge */}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: hexToRgba(Colors.primary, 0.15),
                        alignSelf: "flex-start",
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 9,
                          color: "#FFFFFF",
                          letterSpacing: 0.5,
                        }}
                      >
                        {getPriorityLabel(insight.priority)}
                      </Text>
                    </View>

                    {/* Message */}
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 14,
                        color: "rgba(255, 255, 255, 0.95)",
                        lineHeight: 22,
                        marginBottom: 16,
                      }}
                    >
                      {insight.message}
                    </Text>

                    {/* Evidence */}
                    {insight.evidence.length > 0 && (
                      <View
                        style={{
                          paddingTop: 14,
                          borderTopWidth: 1,
                          borderTopColor: hexToRgba(Colors.primary, 0.18),
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 11,
                            color: "rgba(255, 255, 255, 0.7)",
                            marginBottom: 8,
                          }}
                        >
                          Evidence
                        </Text>
                        {insight.evidence.slice(0, 2).map((evidence, i) => (
                          <View
                            key={i}
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-start",
                              marginBottom: i === 0 ? 6 : 0,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.7)",
                                marginRight: 6,
                                marginTop: 2,
                              }}
                            >
                              •
                            </Text>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.8)",
                                flex: 1,
                                lineHeight: 16,
                              }}
                            >
                              {evidence}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        })}

        {/* Expand / Collapse toggle */}
        {hasMore && (
          <Pressable
            onPress={() => { tapHaptic(); setExpanded((v) => !v); }}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.15)",
              borderRadius: BorderRadius.large,
              padding: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                color: "#FFFFFF",
              }}
            >
              {expanded ? "Show less" : `See ${insights.length - 1} more insight${insights.length - 1 !== 1 ? "s" : ""}`}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
