import React, { useState, useCallback, useMemo, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
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
  Award,
  TrendingUp,
  Sun,
  Moon,
  Sunset,
  CloudMoon,
  Smile,
  Frown,
  AlertTriangle,
  Zap,
  Eye,
  ShieldAlert,
  Heart,
  Sparkles,
  BarChart3,
  Lightbulb,
  TrendingDown,
  Shield,
  Target,
  MessageCircle,
  Laugh,
  Meh,
  Angry,
  Sunrise,
  Handshake,
  Star,
  Zap as Shock,
  Heart as HeartFace,
  Clock,
} from "lucide-react-native";
import Animated, {
  FadeOut,
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

// Welcome-screen entrance animation — gentle fade-in with SOFT easing
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);
const ENTER_1 = FadeIn.duration(900).delay(100).easing(SOFT);
const ENTER_2 = FadeIn.duration(900).delay(250).easing(SOFT);
const ENTER_3 = FadeIn.duration(900).delay(400).easing(SOFT);
const ENTER_4 = FadeIn.duration(900).delay(550).easing(SOFT);
const ENTER_5 = FadeIn.duration(900).delay(700).easing(SOFT);
import { selectHaptic, tapHaptic, selectionHaptic } from "@/lib/haptics";
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
import { populateDummyData } from "@/lib/populate-dummy-data";
import { EmotionalCompanion } from "@/components/EmotionalCompanion";
import { hexToRgba, GlassLayers } from "@/lib/glass";
import {
  TriggerInsightCard,
  TriggerEmptyState,
  TriggerSectionHeader,
} from "@/components/TriggerInsightCard";
import { WeeklyReflectionCard } from "@/components/WeeklyReflectionCard";
import { StreakCalendar } from "@/components/StreakCalendar";
import { MoodStoryTimeline } from "@/components/MoodStoryTimeline";
import ValenceArousalChart from "@/components/ValenceArousalChart";
import { AnimatedStreakFlame } from "@/components/AnimatedStreakFlame";

// Core emotions with icons and emojis - 8 Plutchik emotions
// Row 1: Happiness, Sadness, Anger, Anticipation
// Row 2: Fear, Surprise, Disgust, Trust
const CORE_EMOTIONS = [
  {
    id: "happiness" as EmotionType,
    label: "Happiness",
    icon: Smile,
    color: "#FFD93D",
    emoji: "😊",
    faceIcon: Laugh,
  },
  {
    id: "sadness" as EmotionType,
    label: "Sadness",
    icon: Frown,
    color: "#6B8DD6",
    emoji: "😢",
    faceIcon: Frown,
  },
  {
    id: "anger" as EmotionType,
    label: "Anger",
    icon: Zap,
    color: "#FF6B6B",
    emoji: "😤",
    faceIcon: Angry,
  },
  {
    id: "anticipation" as EmotionType,
    label: "Anticipation",
    icon: Sunrise,
    color: "#FFB74D",
    emoji: "🤩",
    faceIcon: Star,
  },
  {
    id: "fear" as EmotionType,
    label: "Fear",
    icon: AlertTriangle,
    color: "#9575CD",
    emoji: "😰",
    faceIcon: Meh,
  },
  {
    id: "surprise" as EmotionType,
    label: "Surprise",
    icon: Shock,
    color: "#FF8A65",
    emoji: "😮",
    faceIcon: Star,
  },
  {
    id: "disgust" as EmotionType,
    label: "Disgust",
    icon: ShieldAlert,
    color: "#7CB342",
    emoji: "🤢",
    faceIcon: Meh,
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

  if (!fontsLoaded) {
    return (
      <View className="flex-1" style={{ backgroundColor: Colors.background }}>
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

  const handlePopulateDummyData = () => {
    selectHaptic();
    populateDummyData();
    // Force a small delay to let stores update
    setTimeout(() => {
      // The UI will auto-update via React Query
    }, 100);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
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
        {/* Demo Data Button - Remove in production */}
        {entries.length === 0 && (
          <Animated.View entering={ENTER_1} className="mb-4">
            <Pressable
              onPress={handlePopulateDummyData}
              style={{
                backgroundColor: Colors.surface,
                borderRadius: BorderRadius.large,
                padding: 16,
                ...Shadows.medium,
                borderWidth: 2,
                borderColor: Colors.primary,
                borderStyle: "dashed",
              }}
            >
              <View className="flex-row items-center justify-center">
                <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  Load Demo Data
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Populate with sample journal entries to preview features
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Welcome Section */}
        <Animated.View entering={ENTER_1}>
          <WelcomeSection user={user} totalEntries={stats.totalEntries} />
        </Animated.View>

        {/* Weekly Reflection Summary */}
        {entries.length >= 1 && (
          <Animated.View entering={ENTER_2}>
            <WeeklyReflectionCard primaryColor={Colors.primary} />
          </Animated.View>
        )}

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

        {/* Mood Story Timeline */}
        <Animated.View entering={ENTER_3}>
          <MoodStoryTimeline entries={entries} primaryColor={Colors.primary} />
        </Animated.View>

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

        {/* Where You Feel Things — Body Frequency Card */}
        {entries.length >= 3 &&
          (() => {
            const freq: Record<
              string,
              { count: number; totalIntensity: number }
            > = {};
            entries.forEach((e) => {
              if (e.bodySensation && e.bodySensation !== "none") {
                if (!freq[e.bodySensation])
                  freq[e.bodySensation] = { count: 0, totalIntensity: 0 };
                freq[e.bodySensation].count++;
                freq[e.bodySensation].totalIntensity += e.emotionIntensity;
              }
              if (e.bodyRegions) {
                e.bodyRegions.forEach((br) => {
                  const key = br.region;
                  if (!freq[key]) freq[key] = { count: 0, totalIntensity: 0 };
                  freq[key].count++;
                  freq[key].totalIntensity += br.intensity;
                });
              }
            });
            const sorted = Object.entries(freq)
              .sort(([, a], [, b]) => b.count - a.count)
              .slice(0, 6);
            if (sorted.length === 0) return null;
            return (
              <Animated.View
                entering={ENTER_3}
                className="rounded-3xl overflow-hidden mb-6"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.20)",
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                }}
              >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>🗺️</Text>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        color: "#FFFFFF",
                        fontSize: 15,
                        marginLeft: 8,
                      }}
                    >
                      Where You Feel Things
                    </Text>
                  </View>
                  {sorted.map(([label, data]) => {
                    const avgIntensity = Math.round(
                      data.totalIntensity / data.count,
                    );
                    const intensityLabel =
                      avgIntensity <= 2
                        ? "mild"
                        : avgIntensity <= 3
                          ? "moderate"
                          : "intense";
                    return (
                      <View
                        key={label}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 8,
                          borderBottomWidth:
                            sorted.indexOf([label, data] as any) <
                            sorted.length - 1
                              ? 1
                              : 0,
                          borderBottomColor: hexToRgba(Colors.primary, 0.08),
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            color: "#FFFFFF",
                            fontSize: 13,
                            textTransform: "capitalize",
                            flex: 1,
                          }}
                        >
                          {label.replace(/_/g, " ")}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            color: "rgba(255, 255, 255, 0.6)",
                            fontSize: 12,
                          }}
                        >
                          {data.count}x {intensityLabel}
                        </Text>
                      </View>
                    );
                  })}
              </Animated.View>
            );
          })()}

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
      </ScrollView>
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

  // Dynamic time-of-day greeting
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return `Good morning, ${user.name}.`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${user.name}.`;
    if (hour >= 17 && hour < 21) return `Good evening, ${user.name}.`;
    return `Hey, ${user.name}.`;
  }, [user.name]);

  // Dynamic punchy subline that shifts each visit
  const subline = React.useMemo(() => {
    const lines = [
      "Here's what your journal reveals about you.",
      "Your emotions have been speaking. Let's listen.",
      "Every entry shapes a clearer picture of you.",
      "Ready to understand yourself a little better?",
    ];
    const idx = new Date().getDate() % lines.length;
    return lines[idx];
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
                size={26}
                badgeSize={48}
                badgeRadius={BorderRadius.large}
                badgeColor={hexToRgba(Colors.primary, 0.15)}
                glowColor={hexToRgba(Colors.primary, 0.6)}
              />
            </View>
            <View>
              <Text
                style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                className="text-xl"
              >
                {user.streak} {user.streak === 1 ? "Day" : "Days"} Streak
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
                    ? "Next: 3-Day Streak"
                    : user.streak < 7
                      ? "Next: 7-Day Streak"
                      : user.streak < 14
                        ? "Next: 14-Day Streak"
                        : user.streak < 30
                          ? "Next: 30-Day Streak"
                          : user.streak < 100
                            ? "Next: 100-Day Streak"
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
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: BorderRadius.large,
                backgroundColor: hexToRgba(Colors.primary, 0.15),
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Award size={26} color="#FFFFFF" strokeWidth={2} />
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
                <Animated.View style={[progressStyle]}>
                  <LinearGradient
                    colors={Gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: "100%", borderRadius: BorderRadius.round }}
                  />
                </Animated.View>
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
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: BorderRadius.large,
                backgroundColor: isAtLimit
                  ? "rgba(255, 80, 80, 0.25)"
                  : isNearLimit
                    ? "rgba(255, 185, 50, 0.25)"
                    : hexToRgba(Colors.primary, 0.15),
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Clock size={24} color="#FFFFFF" strokeWidth={2} />
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
                  Monthly Minutes
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    color: isAtLimit
                      ? "#FF8080"
                      : isNearLimit
                        ? "#FFD080"
                        : "rgba(255,255,255,0.9)",
                    fontSize: 13,
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
                      backgroundColor: usageBarColor,
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
        Select Emotion
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
                    <FaceIcon size={20} color="#FFFFFF" strokeWidth={2} />
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
            <TrendingUp size={20} color="#FFFFFF" strokeWidth={2} />
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
              className="text-lg ml-2"
            >
              {viewMode === "overall"
                ? "Sentiment Timeline"
                : `${selectedEmotionData?.label || "Emotion"} Focus`}
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
                fontSize: 13,
              }}
            >
              Overall Mood
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
                fontSize: 13,
              }}
            >
              Emotion Focus
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
            <BarChart3
              size={40}
              color="rgba(255, 255, 255, 0.5)"
              strokeWidth={1.5}
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
                    fontSize: 13,
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
                  fontSize: 13,
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
        <Text
          style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
          className="text-lg mb-4"
        >
          Emotional Themes
        </Text>

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
            backgroundColor: hexToRgba(Colors.primary, 0.15),
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
        <Text
          style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
          className="text-lg mb-4"
        >
          Time of Day Patterns
        </Text>

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
            width: 40,
            height: 40,
            borderRadius: BorderRadius.medium,
            backgroundColor: hexToRgba(Colors.primary, 0.15),
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Icon size={22} color="#FFFFFF" strokeWidth={2} />
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
        return TrendingUp;
      case "warning":
        return AlertTriangle;
      case "strength":
        return Shield;
      case "recommendation":
        return Lightbulb;
      default:
        return Sparkles;
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
        return "Key Insight";
      case "medium":
        return "Notable";
      case "low":
        return "Observation";
      default:
        return "";
    }
  };

  // Show top 3 insights
  const topInsights = insights.slice(0, 3);

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
        <View style={{ marginBottom: 16 }}>
          <View className="flex-row items-center mb-4">
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
              className="text-lg"
            >
              Deep Insights
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 12,
              lineHeight: 22,
            }}
          >
            AI-powered analysis of your emotional patterns and growth
          </Text>
        </View>

        {/* Insight Cards */}
        {topInsights.map((insight, index) => {
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
                          textTransform: "uppercase",
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
                        fontSize: 13,
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

        {/* View All Insights */}
        {insights.length > 3 && (
          <Pressable
            onPress={() => tapHaptic()}
            style={{
              backgroundColor: hexToRgba(Colors.primary, 0.15),
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              borderRadius: BorderRadius.large,
              padding: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 13,
                color: "#FFFFFF",
              }}
            >
              View {insights.length - 3} more insights
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
