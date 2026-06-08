/**
 * MoodStoryTimeline — replaces the raw-numbers Sentiment Timeline.
 *
 * Three views, each telling a different story:
 *  "This Week"  — line chart with annotated peaks/valleys, gaps for missing days
 *  "Patterns"   — 30-day weekday rhythm ("you journal lower on Mondays")
 *  "Emotions"   — system-surfaced emotion story, no guessing required
 */

import React, { useState, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";
import {
  BookOpen,
  CalendarDays,
  Sparkles,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import useOnboardingStore from "@/lib/state/onboarding-store";
import { hexToRgba } from "@/lib/glass";
import {
  JournalEntry,
  EMOTION_COLORS,
  EmotionType,
  getEmotionSubLabel,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "patterns" | "emotions";

interface Tab {
  id: TabId;
  label: string;
  Icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
}

const TABS: Tab[] = [
  { id: "patterns", label: "Patterns", Icon: CalendarDays },
  { id: "emotions", label: "Emotions", Icon: Sparkles },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Main Component ───────────────────────────────────────────────────────────

interface MoodStoryTimelineProps {
  entries: JournalEntry[];
  primaryColor: string;
}

export function MoodStoryTimeline({
  entries,
  primaryColor,
}: MoodStoryTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabId>("patterns");
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = selectedTheme === "darkMode";

  const handleTabPress = (id: TabId) => {
    tapHaptic();
    setActiveTab(id);
  };

  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: "rgba(255,255,255,0.12)",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.20)",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
          <BookOpen size={18} color="#FFFFFF" strokeWidth={2} />
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              fontSize: 17,
              color: "#FFFFFF",
            }}
          >
            Mood Story
          </Text>
        </View>

        {/* Tab Pills */}
        <View
          className="flex-row p-1"
          style={{
            backgroundColor: "rgba(255,255,255,0.07)",
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                style={{
                  flex: 1,
                  borderRadius: 11,
                  overflow: "hidden",
                  paddingVertical: 8,
                  alignItems: "center",
                  backgroundColor: isActive
                    ? isDarkMode
                      ? hexToRgba(primaryColor, 0.25)
                      : "rgba(255,255,255,0.15)"
                    : "transparent",
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive
                    ? isDarkMode
                      ? hexToRgba(primaryColor, 0.6)
                      : "rgba(255,255,255,0.25)"
                    : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: isActive
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                    fontSize: 12,
                    color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <Animated.View key={activeTab} entering={FadeIn.duration(300)}>
        {activeTab === "patterns" && (
          <PatternsView entries={entries} primaryColor={primaryColor} />
        )}
        {activeTab === "emotions" && (
          <EmotionsView entries={entries} primaryColor={primaryColor} />
        )}
      </Animated.View>
    </View>
  );
}

// ─── Patterns View ────────────────────────────────────────────────────────────

function PatternsView({
  entries,
  primaryColor,
}: {
  entries: JournalEntry[];
  primaryColor: string;
}) {
  const { weekdayStats, bestDay, worstDay, insight, mostActiveDay } =
    useMemo(() => {
      // Count last 30 days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      const stats: { total: number; count: number; entryCount: number }[] =
        Array.from({ length: 7 }, () => ({
          total: 0,
          count: 0,
          entryCount: 0,
        }));

      entries.forEach((e) => {
        if (new Date(e.createdAt) < cutoff) return;
        const dow = (new Date(e.createdAt).getDay() + 6) % 7; // 0=Mon
        stats[dow].total += e.emotionIntensity;
        stats[dow].count++;
        stats[dow].entryCount++;
      });

      const avgs = stats.map((s) =>
        s.count > 0 ? Math.round(s.total / s.count) : null,
      );

      const validAvgs = avgs.filter((v) => v !== null) as number[];
      if (validAvgs.length === 0) {
        return {
          weekdayStats: avgs,
          bestDay: -1,
          worstDay: -1,
          insight: "",
          mostActiveDay: -1,
        };
      }

      const max = Math.max(...validAvgs);
      const min = Math.min(...validAvgs);
      const bestDay = avgs.indexOf(max);
      const worstDay = avgs.indexOf(min);

      const maxEntries = Math.max(...stats.map((s) => s.entryCount));
      const mostActiveDay = stats.findIndex((s) => s.entryCount === maxEntries);

      let insight = "";
      if (bestDay !== worstDay) {
        const bestName = WEEKDAYS[bestDay];
        const worstName = WEEKDAYS[worstDay];
        insight = `Your emotions reach ecstasy-level intensity on ${bestName}s and settle into serenity on ${worstName}s.`;
      } else if (mostActiveDay >= 0) {
        insight = `You journal most consistently on ${WEEKDAYS[mostActiveDay]}s.`;
      }

      return { weekdayStats: avgs, bestDay, worstDay, insight, mostActiveDay };
    }, [entries]);

  const hasData = weekdayStats.some((v) => v !== null);
  const maxVal = hasData
    ? Math.max(...(weekdayStats.filter((v) => v !== null) as number[]))
    : 100;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {!hasData ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
            }}
          >
            Journal for a few weeks to see your patterns
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            {WEEKDAYS.map((day, i) => {
              const val = weekdayStats[i];
              const isBest = i === bestDay;
              const isWorst = i === worstDay;
              const barColor = primaryColor;
              const barWidth =
                val !== null
                  ? `${Math.round((val / Math.max(maxVal, 1)) * 100)}%`
                  : "0%";

              return (
                <Animated.View
                  key={day}
                  entering={FadeInDown.delay(i * 40).duration(400)}
                  className="flex-row items-center"
                  style={{ gap: 10 }}
                >
                  {/* Day label */}
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 12,
                      color:
                        val !== null
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(255,255,255,0.25)",
                      width: 28,
                    }}
                  >
                    {day}
                  </Text>

                  {/* Bar track */}
                  <View
                    style={{
                      flex: 1,
                      height: 24,
                      borderRadius: 6,
                      backgroundColor: "rgba(255,255,255,0.07)",
                      overflow: "hidden",
                      justifyContent: "center",
                    }}
                  >
                    {val !== null && (
                      <Animated.View
                        entering={FadeIn.delay(i * 40 + 100).duration(500)}
                        style={{
                          width: barWidth as any,
                          height: "100%",
                          borderRadius: 6,
                          backgroundColor: barColor,
                          opacity: 0.75,
                        }}
                      />
                    )}
                    {val !== null && (
                      <Text
                        style={{
                          position: "absolute",
                          left: 10,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 11,
                          color: "rgba(255,255,255,0.9)",
                        }}
                      >
                        {val}
                      </Text>
                    )}
                    {val === null && (
                      <Text
                        style={{
                          position: "absolute",
                          left: 10,
                          fontFamily: "Inter_400Regular",
                          fontSize: 10,
                          color: "rgba(255,255,255,0.25)",
                        }}
                      >
                        no entries
                      </Text>
                    )}
                  </View>

                  {/* Badge */}
                  {(isBest || isWorst) && (
                    <View
                      style={{
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        borderRadius: 8,
                        backgroundColor: `${primaryColor}25`,
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
                        {isBest ? "Peak" : "Calm"}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Plutchik intensity scale labels */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 14,
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Serenity
            </Text>
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 10,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              Ecstasy
            </Text>
          </View>

          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 11,
              color: "rgba(255,255,255,0.45)",
              textAlign: "center",
              marginTop: 6,
              lineHeight: 16,
            }}
          >
            Gentle feelings on the left · Intense feelings on the right
          </Text>

          {/* Insight callout */}
          {insight !== "" && (
            <Animated.View
              entering={FadeInDown.delay(350).duration(500)}
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 14,
                backgroundColor: `${primaryColor}18`,
                borderWidth: 1,
                borderColor: `${primaryColor}35`,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.88)",
                  lineHeight: 22,
                }}
              >
                {insight}
              </Text>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

// ─── Emotions View ────────────────────────────────────────────────────────────

function EmotionsView({
  entries,
  primaryColor,
}: {
  entries: JournalEntry[];
  primaryColor: string;
}) {
  const { dominantCard, shiftedCard } = useMemo(() => {
    const now = new Date();
    const cutoff7 = new Date(now);
    cutoff7.setDate(now.getDate() - 7);
    const cutoff14 = new Date(now);
    cutoff14.setDate(now.getDate() - 14);

    const recent = entries.filter((e) => new Date(e.createdAt) >= cutoff7);
    const prior = entries.filter(
      (e) =>
        new Date(e.createdAt) >= cutoff14 && new Date(e.createdAt) < cutoff7,
    );

    const EMOTIONS: EmotionType[] = [
      "happiness",
      "sadness",
      "anger",
      "disgust",
      "fear",
      "surprise",
      "trust",
      "anticipation",
    ];

    // Compute average score per emotion for a set of entries
    const avgScores = (pool: JournalEntry[]) => {
      if (pool.length === 0) return null;
      const sums: Record<EmotionType, number> = {
        happiness: 0,
        sadness: 0,
        anger: 0,
        disgust: 0,
        fear: 0,
        surprise: 0,
        trust: 0,
        anticipation: 0,
      };
      pool.forEach((e) => {
        if (e.emotionScores) {
          EMOTIONS.forEach((em) => {
            sums[em] += e.emotionScores![em] ?? 0;
          });
        } else {
          // Fallback: binary presence
          if (e.primaryEmotion) sums[e.primaryEmotion] += e.emotionIntensity;
        }
      });
      const result = {} as Record<EmotionType, number>;
      EMOTIONS.forEach((em) => {
        result[em] = Math.round(sums[em] / pool.length);
      });
      return result;
    };

    const recentScores = avgScores(recent);
    const priorScores = avgScores(prior);

    if (!recentScores) {
      return { dominantCard: null, shiftedCard: null };
    }

    // Most dominant this week
    const dominantEmotion = EMOTIONS.reduce((a, b) =>
      recentScores[a] >= recentScores[b] ? a : b,
    );
    const dominantScore = recentScores[dominantEmotion];

    // Local date helper — avoids UTC offset shifting date for negative-timezone users
    const localDateStr = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    // Convert an entry's stored UTC ISO createdAt to its local date string
    const entryLocalDate = (iso: string) => localDateStr(new Date(iso));

    // Build 7-day overall mood intensity sparkline (all emotions, for "This Week's Story")
    const weeklyIntensitySparkline = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = localDateStr(d);
      const dayEntries = entries.filter((e) => entryLocalDate(e.createdAt) === dateStr);
      if (dayEntries.length === 0) return null;
      return Math.round(
        dayEntries.reduce((s, e) => s + e.emotionIntensity, 0) /
          dayEntries.length,
      );
    });

    // Build 7-day sparkline for dominant emotion
    const sparkline = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = localDateStr(d);
      const dayEntries = recent.filter((e) => entryLocalDate(e.createdAt) === dateStr);
      if (dayEntries.length === 0) return null;
      const scored = dayEntries.filter((e) => e.emotionScores);
      if (scored.length > 0) {
        return Math.round(
          scored.reduce(
            (s, e) => s + (e.emotionScores![dominantEmotion] ?? 0),
            0,
          ) / scored.length,
        );
      }
      return dayEntries.some((e) => e.primaryEmotion === dominantEmotion)
        ? Math.round(
            dayEntries.reduce((s, e) => s + e.emotionIntensity, 0) /
              dayEntries.length,
          )
        : 0;
    });

    // Most shifted emotion (if prior data exists)
    let shiftedCard: {
      emotion: EmotionType;
      delta: number;
      recentVal: number;
      priorVal: number;
      sparkline: (number | null)[];
    } | null = null;

    if (priorScores) {
      let maxShift = 0;
      let shiftedEmotion = dominantEmotion;
      EMOTIONS.forEach((em) => {
        const shift = Math.abs(recentScores[em] - priorScores[em]);
        if (shift > maxShift && em !== dominantEmotion) {
          maxShift = shift;
          shiftedEmotion = em;
        }
      });

      if (maxShift >= 8) {
        const shiftedSparkline = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (13 - i));
          const dateStr = localDateStr(d);
          const dayEntries = entries.filter((e) =>
            entryLocalDate(e.createdAt) === dateStr,
          );
          if (dayEntries.length === 0) return null;
          const scored = dayEntries.filter((e) => e.emotionScores);
          if (scored.length > 0) {
            return Math.round(
              scored.reduce(
                (s, e) => s + (e.emotionScores![shiftedEmotion] ?? 0),
                0,
              ) / scored.length,
            );
          }
          return 0;
        });

        shiftedCard = {
          emotion: shiftedEmotion,
          delta: recentScores[shiftedEmotion] - priorScores[shiftedEmotion],
          recentVal: recentScores[shiftedEmotion],
          priorVal: priorScores[shiftedEmotion],
          sparkline: shiftedSparkline,
        };
      }
    }

    return {
      dominantCard: {
        emotion: dominantEmotion,
        score: dominantScore,
        sparkline,
        weeklyIntensitySparkline,
      },
      shiftedCard,
    };
  }, [entries]);

  if (!dominantCard) {
    return (
      <View
        style={{
          paddingHorizontal: 20,
          paddingBottom: 20,
          paddingTop: 8,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
            textAlign: "center",
          }}
        >
          Journal this week to see your emotion story
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
      {/* Dominant emotion card */}
      <Animated.View entering={FadeInDown.delay(0).duration(400)}>
        <EmotionStoryCard
          emotion={dominantCard.emotion}
          score={dominantCard.score}
          sparkline={dominantCard.weeklyIntensitySparkline}
          label="This Week's Story"
          description={`${getEmotionSubLabel(dominantCard.emotion, dominantCard.score)} is your dominant emotion this week`}
          points={dominantCard.weeklyIntensitySparkline.length}
        />
      </Animated.View>

      {/* Shifted emotion card */}
      {shiftedCard && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <EmotionStoryCard
            emotion={shiftedCard.emotion}
            score={shiftedCard.recentVal}
            sparkline={shiftedCard.sparkline}
            label={shiftedCard.delta > 0 ? "Rising" : "Easing"}
            description={`${getEmotionSubLabel(shiftedCard.emotion, shiftedCard.recentVal)} ${
              shiftedCard.delta > 0 ? "increased" : "decreased"
            } by ${Math.abs(shiftedCard.delta)} pts vs last week`}
            delta={shiftedCard.delta}
            points={shiftedCard.sparkline.length}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Emotion Story Card ───────────────────────────────────────────────────────

function EmotionStoryCard({
  emotion,
  score,
  sparkline,
  label,
  description,
  delta,
  points,
}: {
  emotion: EmotionType;
  score: number;
  sparkline: (number | null)[];
  label: string;
  description: string;
  delta?: number;
  points: number;
}) {
  const color = EMOTION_COLORS[emotion] ?? "#A88AFF";
  const SPARK_H = 36;
  const SPARK_W = 80;

  const validVals = sparkline.filter((v) => v !== null) as number[];
  const maxV = validVals.length > 0 ? Math.max(...validVals, 1) : 100;

  const toSY = (v: number) => SPARK_H - (v / Math.max(maxV, 1)) * SPARK_H;
  const toSX = (i: number) => (i / (points - 1)) * SPARK_W;

  // Build sparkline path
  const sparkPath = (() => {
    const pts: string[] = [];
    sparkline.forEach((v, i) => {
      if (v === null) return;
      pts.push(`${toSX(i)},${toSY(v)}`);
    });
    if (pts.length < 2) return null;
    return `M ${pts[0]} L ${pts.slice(1).join(" L ")}`;
  })();

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
      }}
    >
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1 }}>
          {/* Label */}
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.1)",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 9,
                color: "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {label}
            </Text>
          </View>

          {/* Emotion sub-label + base name */}
          <View style={{ marginBottom: 4 }}>
            <Text
              style={{
                fontFamily: "Fraunces_700Bold",
                fontSize: 20,
                color: "#FFFFFF",
              }}
            >
              {getEmotionSubLabel(emotion, score)}
            </Text>
            {/* Show base emotion name only when it differs from the sub-label */}
            {getEmotionSubLabel(emotion, score).toLowerCase() !==
              emotion.toLowerCase() && (
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  marginTop: 1,
                }}
              >
                {emotion}
              </Text>
            )}
          </View>

          {/* Description */}
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 12,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 17,
            }}
          >
            {description}
          </Text>
        </View>

        {/* Sparkline */}
        {sparkPath && (
          <View style={{ marginLeft: 12 }}>
            <Svg width={SPARK_W} height={SPARK_H}>
              <Defs>
                <SvgGradient id={`sg-${emotion}`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={color} stopOpacity="0.4" />
                  <Stop offset="1" stopColor={color} stopOpacity="1" />
                </SvgGradient>
              </Defs>
              <Path
                d={sparkPath}
                stroke={`url(#sg-${emotion})`}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            {delta !== undefined && (
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 11,
                  color: delta > 0 ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {delta > 0 ? "+" : ""}
                {delta} pts
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────
