/**
 * MoodStoryTimeline — replaces the raw-numbers Sentiment Timeline.
 *
 * Three views, each telling a different story:
 *  "This Week"  — line chart with annotated peaks/valleys, gaps for missing days
 *  "Patterns"   — 30-day weekday rhythm ("you journal lower on Mondays")
 *  "Emotions"   — system-surfaced emotion story, no guessing required
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tapHaptic } from '@/lib/haptics';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  CalendarDays,
  Sparkles,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { JournalEntry, EMOTION_COLORS, EmotionType, getEmotionSubLabel } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'week' | 'patterns' | 'emotions';

interface Tab {
  id: TabId;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
}

const TABS: Tab[] = [
  { id: 'week', label: 'This Week', Icon: TrendingUp },
  { id: 'patterns', label: 'Patterns', Icon: CalendarDays },
  { id: 'emotions', label: 'Emotions', Icon: Sparkles },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Main Component ───────────────────────────────────────────────────────────

interface MoodStoryTimelineProps {
  entries: JournalEntry[];
  primaryColor: string;
}

export function MoodStoryTimeline({ entries, primaryColor }: MoodStoryTimelineProps) {
  const [activeTab, setActiveTab] = useState<TabId>('week');

  const handleTabPress = (id: TabId) => {
    tapHaptic();
    setActiveTab(id);
  };

  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View className="flex-row items-center mb-4" style={{ gap: 8 }}>
          <BookOpen size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#FFFFFF' }}>
            Mood Story
          </Text>
        </View>

        {/* Tab Pills */}
        <View
          className="flex-row p-1"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
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
                style={{ flex: 1, borderRadius: 11, overflow: 'hidden' }}
              >
                {isActive && (
                  <LinearGradient
                    colors={[primaryColor, `${primaryColor}BB`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', inset: 0, borderRadius: 11 }}
                  />
                )}
                <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                      fontSize: 12,
                      color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {tab.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <Animated.View key={activeTab} entering={FadeIn.duration(300)}>
        {activeTab === 'week' && (
          <WeekView entries={entries} primaryColor={primaryColor} />
        )}
        {activeTab === 'patterns' && (
          <PatternsView entries={entries} primaryColor={primaryColor} />
        )}
        {activeTab === 'emotions' && (
          <EmotionsView entries={entries} primaryColor={primaryColor} />
        )}
      </Animated.View>
    </View>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ entries, primaryColor }: { entries: JournalEntry[]; primaryColor: string }) {
  const [chartWidth, setChartWidth] = useState(280);

  const CHART_H = 110;
  const PAD_X = 16;
  const PAD_Y = 16;
  const innerW = chartWidth - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width - 32; // subtract container horizontal padding
    if (w > 0) setChartWidth(w);
  };

  const { days, trend, trendDelta, peakIdx, valleyIdx } = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dayData: {
      label: string;
      date: string;
      hasEntry: boolean;
      value: number;
      entryTitle?: string;
    }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
      const dayEntries = entries.filter((e) => e.createdAt.startsWith(dateStr));

      if (dayEntries.length > 0) {
        const avg = Math.round(
          dayEntries.reduce((s, e) => s + e.emotionIntensity, 0) / dayEntries.length
        );
        dayData.push({
          label: dayLabel,
          date: dateStr,
          hasEntry: true,
          value: avg,
          entryTitle: dayEntries[0].title || dayEntries[0].transcript.slice(0, 30),
        });
      } else {
        dayData.push({ label: dayLabel, date: dateStr, hasEntry: false, value: -1 });
      }
    }

    // Trend: compare avg of last 3 days (with entries) vs prior 4 days
    const recentVals = dayData.slice(4).filter((d) => d.hasEntry).map((d) => d.value);
    const priorVals = dayData.slice(0, 4).filter((d) => d.hasEntry).map((d) => d.value);
    const recentAvg = recentVals.length
      ? recentVals.reduce((a, b) => a + b, 0) / recentVals.length
      : null;
    const priorAvg = priorVals.length
      ? priorVals.reduce((a, b) => a + b, 0) / priorVals.length
      : null;

    let trendDir: 'up' | 'down' | 'stable' = 'stable';
    let delta = 0;
    if (recentAvg !== null && priorAvg !== null) {
      delta = Math.round(recentAvg - priorAvg);
      if (delta >= 5) trendDir = 'up';
      else if (delta <= -5) trendDir = 'down';
    }

    // Peak and valley (only among days with entries)
    const withEntries = dayData
      .map((d, i) => ({ ...d, i }))
      .filter((d) => d.hasEntry);

    let peakIdx = -1;
    let valleyIdx = -1;
    if (withEntries.length >= 2) {
      const maxVal = Math.max(...withEntries.map((d) => d.value));
      const minVal = Math.min(...withEntries.map((d) => d.value));
      if (maxVal !== minVal) {
        peakIdx = withEntries.find((d) => d.value === maxVal)?.i ?? -1;
        valleyIdx = withEntries.find((d) => d.value === minVal)?.i ?? -1;
      }
    }

    return { days: dayData, trend: trendDir, trendDelta: delta, peakIdx, valleyIdx };
  }, [entries]);

  // Map value (0-100) to chart Y coordinate (inverted — higher value = lower Y)
  const toY = (val: number) => PAD_Y + innerH - (val / 100) * innerH;
  const toX = (i: number) => PAD_X + (i / 6) * innerW;

  // Build SVG path segments
  const segments = useMemo(() => {
    // Group into consecutive runs of "has entry" days
    const result: { d: string; dashed: boolean }[] = [];
    let i = 0;

    // Interpolate missing values linearly between known values
    const interpolated = days.map((d, idx) => {
      if (d.hasEntry) return d.value;
      // Find nearest valid neighbors
      let prevVal: number | null = null;
      let nextVal: number | null = null;
      for (let j = idx - 1; j >= 0; j--) {
        if (days[j].hasEntry) { prevVal = days[j].value; break; }
      }
      for (let j = idx + 1; j < days.length; j++) {
        if (days[j].hasEntry) { nextVal = days[j].value; break; }
      }
      if (prevVal !== null && nextVal !== null) return (prevVal + nextVal) / 2;
      if (prevVal !== null) return prevVal;
      if (nextVal !== null) return nextVal;
      return 50;
    });

    // Draw solid path through real entries, dashed through gaps
    for (let seg = 0; seg < days.length - 1; seg++) {
      const x1 = toX(seg);
      const y1 = toY(interpolated[seg]);
      const x2 = toX(seg + 1);
      const y2 = toY(interpolated[seg + 1]);
      const dashed = !days[seg].hasEntry || !days[seg + 1].hasEntry;
      result.push({ d: `M ${x1} ${y1} L ${x2} ${y2}`, dashed });
    }
    return { segs: result, interpolated };
  }, [days, toX, toY]);

  const hasAnyEntry = days.some((d) => d.hasEntry);

  const trendConfig = {
    up: { label: 'Improving', color: '#FFFFFF', Icon: TrendingUp },
    down: { label: 'Declining', color: 'rgba(255,255,255,0.7)', Icon: TrendingDown },
    stable: { label: 'Stable', color: 'rgba(255,255,255,0.6)', Icon: Minus },
  }[trend];

  const TrendIcon = trendConfig.Icon;

  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
      {/* SVG Chart */}
      <View onLayout={onLayout}>
        {!hasAnyEntry ? (
          <View
            style={{
              height: CHART_H,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
              }}
            >
              No entries this week yet
            </Text>
          </View>
        ) : (
          <>

            <Svg width={chartWidth} height={CHART_H}>
              <Defs>
                <SvgGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={primaryColor} stopOpacity="0.25" />
                  <Stop offset="1" stopColor={primaryColor} stopOpacity="0.02" />
                </SvgGradient>
              </Defs>

              {/* Horizontal grid lines */}
              {[25, 50, 75].map((v) => (
                <Line
                  key={v}
                  x1={PAD_X}
                  y1={toY(v)}
                  x2={chartWidth - PAD_X}
                  y2={toY(v)}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={1}
                />
              ))}

              {/* Area fill */}
              {(() => {
                const pts = days.map((_, i) => `${toX(i)},${toY(segments.interpolated[i])}`).join(' L ');
                const areaPath = `M ${toX(0)},${toY(segments.interpolated[0])} L ${pts} L ${toX(6)},${CHART_H - PAD_Y} L ${toX(0)},${CHART_H - PAD_Y} Z`;
                return (
                  <Path
                    d={areaPath}
                    fill="url(#lineGrad)"
                  />
                );
              })()}

              {/* Line segments */}
              {segments.segs.map((seg, i) => (
                <Path
                  key={i}
                  d={seg.d}
                  stroke={seg.dashed ? 'rgba(255,255,255,0.2)' : primaryColor}
                  strokeWidth={seg.dashed ? 1.5 : 2.5}
                  strokeDasharray={seg.dashed ? '4,4' : undefined}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}

              {/* Dots */}
              {days.map((day, i) => {
                const cx = toX(i);
                const cy = toY(segments.interpolated[i]);
                const isPeak = i === peakIdx;
                const isValley = i === valleyIdx;

                if (!day.hasEntry) {
                  // Gap marker — small hollow circle
                  return (
                    <Circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="rgba(0,0,0,0)"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth={1.5}
                    />
                  );
                }

                return (
                  <React.Fragment key={i}>
                    {/* Glow for peak/valley */}
                    {(isPeak || isValley) && (
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={10}
                        fill={isPeak ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}
                      />
                    )}
                    {/* Main dot */}
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={isPeak || isValley ? 5.5 : 4}
                      fill={isPeak ? '#FFFFFF' : isValley ? 'rgba(255,255,255,0.6)' : primaryColor}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth={1.5}
                    />
                  </React.Fragment>
                );
              })}
            </Svg>
          </>
        )}
      </View>

      {/* Day labels */}
      <View className="flex-row justify-between" style={{ paddingHorizontal: PAD_X, marginTop: 4 }}>
        {days.map((d, i) => (
          <Text
            key={i}
            style={{
              fontFamily: 'Inter_500Medium',
              fontSize: 10,
              color: d.hasEntry ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.28)',
              textAlign: 'center',
              width: 22,
            }}
          >
            {d.label}
          </Text>
        ))}
      </View>

    </View>
  );
}

// ─── Patterns View ────────────────────────────────────────────────────────────

function PatternsView({ entries, primaryColor }: { entries: JournalEntry[]; primaryColor: string }) {
  const { weekdayStats, bestDay, worstDay, insight, mostActiveDay } = useMemo(() => {
    // Count last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const stats: { total: number; count: number; entryCount: number }[] = Array.from(
      { length: 7 },
      () => ({ total: 0, count: 0, entryCount: 0 })
    );

    entries.forEach((e) => {
      if (new Date(e.createdAt) < cutoff) return;
      const dow = (new Date(e.createdAt).getDay() + 6) % 7; // 0=Mon
      stats[dow].total += e.emotionIntensity;
      stats[dow].count++;
      stats[dow].entryCount++;
    });

    const avgs = stats.map((s) => (s.count > 0 ? Math.round(s.total / s.count) : null));

    const validAvgs = avgs.filter((v) => v !== null) as number[];
    if (validAvgs.length === 0) {
      return { weekdayStats: avgs, bestDay: -1, worstDay: -1, insight: '', mostActiveDay: -1 };
    }

    const max = Math.max(...validAvgs);
    const min = Math.min(...validAvgs);
    const bestDay = avgs.indexOf(max);
    const worstDay = avgs.indexOf(min);

    const maxEntries = Math.max(...stats.map((s) => s.entryCount));
    const mostActiveDay = stats.findIndex((s) => s.entryCount === maxEntries);

    let insight = '';
    if (bestDay !== worstDay) {
      const bestName = WEEKDAYS[bestDay];
      const worstName = WEEKDAYS[worstDay];
      insight = `You tend to feel best on ${bestName}s and lowest on ${worstName}s over the last 30 days.`;
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
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: 'rgba(255,255,255,0.4)',
              textAlign: 'center',
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
              const barWidth = val !== null ? `${Math.round((val / Math.max(maxVal, 1)) * 100)}%` : '0%';

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
                      fontFamily: 'Inter_500Medium',
                      fontSize: 12,
                      color: val !== null ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
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
                      backgroundColor: 'rgba(255,255,255,0.07)',
                      overflow: 'hidden',
                      justifyContent: 'center',
                    }}
                  >
                    {val !== null && (
                      <Animated.View
                        entering={FadeIn.delay(i * 40 + 100).duration(500)}
                        style={{
                          width: barWidth as any,
                          height: '100%',
                          borderRadius: 6,
                          backgroundColor: barColor,
                          opacity: 0.75,
                        }}
                      />
                    )}
                    {val !== null && (
                      <Text
                        style={{
                          position: 'absolute',
                          left: 10,
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      >
                        {val}
                      </Text>
                    )}
                    {val === null && (
                      <Text
                        style={{
                          position: 'absolute',
                          left: 10,
                          fontFamily: 'Inter_400Regular',
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.25)',
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
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 9,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {isBest ? 'Best' : 'Low'}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* Insight callout */}
          {insight !== '' && (
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
                  fontFamily: 'Inter_500Medium',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.88)',
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

function EmotionsView({ entries, primaryColor }: { entries: JournalEntry[]; primaryColor: string }) {
  const { dominantCard, shiftedCard } = useMemo(() => {
    const now = new Date();
    const cutoff7 = new Date(now);
    cutoff7.setDate(now.getDate() - 7);
    const cutoff14 = new Date(now);
    cutoff14.setDate(now.getDate() - 14);

    const recent = entries.filter((e) => new Date(e.createdAt) >= cutoff7);
    const prior = entries.filter(
      (e) => new Date(e.createdAt) >= cutoff14 && new Date(e.createdAt) < cutoff7
    );

    const EMOTIONS: EmotionType[] = [
      'happiness', 'sadness', 'anger', 'disgust', 'fear', 'surprise', 'trust', 'anticipation',
    ];

    // Compute average score per emotion for a set of entries
    const avgScores = (pool: JournalEntry[]) => {
      if (pool.length === 0) return null;
      const sums: Record<EmotionType, number> = {
        happiness: 0, sadness: 0, anger: 0, disgust: 0,
        fear: 0, surprise: 0, trust: 0, anticipation: 0,
      };
      pool.forEach((e) => {
        if (e.emotionScores) {
          EMOTIONS.forEach((em) => { sums[em] += e.emotionScores![em] ?? 0; });
        } else {
          // Fallback: binary presence
          if (e.primaryEmotion) sums[e.primaryEmotion] += e.emotionIntensity;
        }
      });
      const result = {} as Record<EmotionType, number>;
      EMOTIONS.forEach((em) => { result[em] = Math.round(sums[em] / pool.length); });
      return result;
    };

    const recentScores = avgScores(recent);
    const priorScores = avgScores(prior);

    if (!recentScores) {
      return { dominantCard: null, shiftedCard: null };
    }

    // Most dominant this week
    const dominantEmotion = EMOTIONS.reduce((a, b) =>
      recentScores[a] >= recentScores[b] ? a : b
    );
    const dominantScore = recentScores[dominantEmotion];

    // Build 7-day overall mood intensity sparkline (all emotions, for "This Week's Story")
    const weeklyIntensitySparkline = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = entries.filter((e) => e.createdAt.startsWith(dateStr));
      if (dayEntries.length === 0) return null;
      return Math.round(
        dayEntries.reduce((s, e) => s + e.emotionIntensity, 0) / dayEntries.length
      );
    });

    // Build 7-day sparkline for dominant emotion
    const sparkline = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = recent.filter((e) => e.createdAt.startsWith(dateStr));
      if (dayEntries.length === 0) return null;
      const scored = dayEntries.filter((e) => e.emotionScores);
      if (scored.length > 0) {
        return Math.round(
          scored.reduce((s, e) => s + (e.emotionScores![dominantEmotion] ?? 0), 0) / scored.length
        );
      }
      return dayEntries.some((e) => e.primaryEmotion === dominantEmotion)
        ? Math.round(dayEntries.reduce((s, e) => s + e.emotionIntensity, 0) / dayEntries.length)
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
          const dateStr = d.toISOString().split('T')[0];
          const dayEntries = entries.filter((e) => e.createdAt.startsWith(dateStr));
          if (dayEntries.length === 0) return null;
          const scored = dayEntries.filter((e) => e.emotionScores);
          if (scored.length > 0) {
            return Math.round(
              scored.reduce((s, e) => s + (e.emotionScores![shiftedEmotion] ?? 0), 0) / scored.length
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
      dominantCard: { emotion: dominantEmotion, score: dominantScore, sparkline, weeklyIntensitySparkline },
      shiftedCard,
    };
  }, [entries]);

  if (!dominantCard) {
    return (
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8, alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
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
            label={shiftedCard.delta > 0 ? 'Rising' : 'Easing'}
            description={`${getEmotionSubLabel(shiftedCard.emotion, shiftedCard.recentVal)} ${
              shiftedCard.delta > 0 ? 'increased' : 'decreased'
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
  const color = EMOTION_COLORS[emotion] ?? '#A88AFF';
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
    return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`;
  })();

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }}
    >
      <View className="flex-row items-center justify-between">
        <View style={{ flex: 1 }}>
          {/* Label */}
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.1)',
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 9,
                color: '#FFFFFF',
                textTransform: 'uppercase',
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
                fontFamily: 'Inter_700Bold',
                fontSize: 20,
                color: '#FFFFFF',
              }}
            >
              {getEmotionSubLabel(emotion, score)}
            </Text>
            {/* Show base emotion name only when it differs from the sub-label */}
            {getEmotionSubLabel(emotion, score).toLowerCase() !== emotion.toLowerCase() && (
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
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
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
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
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 11,
                  color: delta > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {delta > 0 ? '+' : ''}{delta} pts
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────
