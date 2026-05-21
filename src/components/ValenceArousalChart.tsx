/**
 * ValenceArousalChart — "Emotional Landscape"
 *
 * Renders a Circumplex Model of Affect scatter plot:
 *   X-axis: Valence  (-100 = Unpleasant → +100 = Pleasant)
 *   Y-axis: Arousal  (0 = Calm → 100 = Activated)
 *
 * Features:
 *  • Dark glassmorphism styling matching the app design system
 *  • 7D / 14D / 30D time range selector
 *  • SVG scatter plot with emotion-colored data points
 *  • Tappable points revealing entry detail (title, date, emotion)
 *  • "Hybrid" crown icon for user-corrected entries
 *  • Quadrant distribution bar + dominant state summary
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  LayoutChangeEvent,
  ScrollView,
} from "react-native";
import Svg, {
  Line,
  Circle,
  Text as SvgText,
  G,
  Path,
} from "react-native-svg";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { tapHaptic, selectionHaptic } from "@/lib/haptics";
import {
  JournalEntry,
  EMOTION_COLORS,
  EMOTION_EMOJIS,
  EmotionType,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeRange = "7D" | "14D" | "30D";

interface ChartPoint {
  x: number; // SVG pixel x
  y: number; // SVG pixel y
  valence: number; // -100..+100
  arousal: number; // 0..100
  emotion: EmotionType;
  emoji: string;
  color: string;
  title: string;
  date: string;
  isUserCorrected: boolean;
  entryId: string;
}

interface QuadrantCounts {
  pleasantActivated: number;
  pleasantCalm: number;
  unpleasantActivated: number;
  unpleasantCalm: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: "7D", label: "7D" },
  { id: "14D", label: "14D" },
  { id: "30D", label: "30D" },
];

const QUADRANT_CONFIG = [
  {
    key: "unpleasantActivated" as keyof QuadrantCounts,
    label: "Tense",
    desc: "Stress, anger, anxiety",
    color: "#EF4444",
    quadX: "left",
    quadY: "top",
    emoji: "⚡",
  },
  {
    key: "pleasantActivated" as keyof QuadrantCounts,
    label: "Excited",
    desc: "Joy, energy, enthusiasm",
    color: "#F59E0B",
    quadX: "right",
    quadY: "top",
    emoji: "✨",
  },
  {
    key: "unpleasantCalm" as keyof QuadrantCounts,
    label: "Down",
    desc: "Sadness, fatigue, withdrawal",
    color: "#6B7280",
    quadX: "left",
    quadY: "bottom",
    emoji: "🌧",
  },
  {
    key: "pleasantCalm" as keyof QuadrantCounts,
    label: "Calm",
    desc: "Contentment, peace, serenity",
    color: "#10B981",
    quadX: "right",
    quadY: "bottom",
    emoji: "🌿",
  },
] as const;

// ─── Main Component ───────────────────────────────────────────────────────────

interface ValenceArousalChartProps {
  entries: JournalEntry[];
  primaryColor?: string;
}

export default function ValenceArousalChart({
  entries,
  primaryColor = "#8B5CF6",
}: ValenceArousalChartProps) {
  const [range, setRange] = useState<TimeRange>("30D");
  const [selectedPoint, setSelectedPoint] = useState<ChartPoint | null>(null);
  const [chartWidth, setChartWidth] = useState(280);

  const CHART_H = chartWidth; // square
  const PAD = 0; // SVG padding — labels drawn outside chart area

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartWidth(w);
  }, []);

  const handleRangePress = (id: TimeRange) => {
    selectionHaptic();
    setRange(id);
    setSelectedPoint(null);
  };

  // ─── Data Computation ──────────────────────────────────────────────────────

  const days = range === "7D" ? 7 : range === "14D" ? 14 : 30;

  const points: ChartPoint[] = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return entries
      .filter(
        (e) =>
          new Date(e.createdAt) >= cutoff &&
          e.valence !== undefined &&
          e.arousal !== undefined,
      )
      .map((e) => {
        // Map valence (-100..+100) → SVG x (0..chartWidth)
        const x = ((e.valence + 100) / 200) * CHART_H;
        // Map arousal (0..100) → SVG y (inverted: 0 = bottom = calm)
        const y = CHART_H - (e.arousal / 100) * CHART_H;
        const emotion = e.primaryEmotion ?? "happiness";
        return {
          x,
          y,
          valence: e.valence,
          arousal: e.arousal,
          emotion,
          emoji: EMOTION_EMOJIS[emotion] ?? "•",
          color: EMOTION_COLORS[emotion] ?? primaryColor,
          title: e.title || e.transcript.slice(0, 40),
          date: new Date(e.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          isUserCorrected: !!(e.aiCorrected || e.userValidated),
          entryId: e.id,
        };
      });
  }, [entries, days, CHART_H, primaryColor]);

  const quadrantCounts: QuadrantCounts = useMemo(() => {
    let pleasantActivated = 0;
    let pleasantCalm = 0;
    let unpleasantActivated = 0;
    let unpleasantCalm = 0;
    points.forEach((p) => {
      if (p.valence >= 0 && p.arousal >= 50) pleasantActivated++;
      else if (p.valence >= 0 && p.arousal < 50) pleasantCalm++;
      else if (p.valence < 0 && p.arousal >= 50) unpleasantActivated++;
      else unpleasantCalm++;
    });
    return {
      pleasantActivated,
      pleasantCalm,
      unpleasantActivated,
      unpleasantCalm,
    };
  }, [points]);

  const dominantQuadrant = useMemo(() => {
    if (points.length === 0) return null;
    const max = Math.max(
      quadrantCounts.pleasantActivated,
      quadrantCounts.pleasantCalm,
      quadrantCounts.unpleasantActivated,
      quadrantCounts.unpleasantCalm,
    );
    if (max === 0) return null;
    return QUADRANT_CONFIG.find((q) => quadrantCounts[q.key] === max) ?? null;
  }, [quadrantCounts, points.length]);

  const totalPoints = points.length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View
      style={{
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🗺️</Text>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                fontSize: 17,
                color: "#FFFFFF",
              }}
            >
              Emotional Landscape
            </Text>
          </View>

          {/* Range Selector */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "rgba(255,255,255,0.07)",
              borderRadius: 10,
              padding: 3,
            }}
          >
            {RANGE_OPTIONS.map((opt) => {
              const isActive = range === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => handleRangePress(opt.id)}
                  style={{ borderRadius: 8, overflow: "hidden" }}
                >
                  {isActive && (
                    <LinearGradient
                      colors={[primaryColor, `${primaryColor}BB`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 8,
                      }}
                    />
                  )}
                  <View style={{ paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text
                      style={{
                        fontFamily: isActive
                          ? "Inter_600SemiBold"
                          : "Inter_400Regular",
                        fontSize: 12,
                        color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text
          style={{
            fontFamily: "Inter_400Regular",
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 16,
          }}
        >
          Where your emotions fall on the calm/activated × pleasant/unpleasant
          grid
        </Text>
      </View>

      {/* Chart Body */}
      {points.length === 0 ? (
        <EmptyState range={range} />
      ) : (
        <Animated.View key={range} entering={FadeIn.duration(300)}>
          {/* SVG Chart */}
          <View
            style={{ paddingHorizontal: 20, paddingBottom: 8 }}
            onLayout={onLayout}
          >
            <ChartSvg
              chartSize={CHART_H}
              points={points}
              selectedPoint={selectedPoint}
              onPointPress={(p) => {
                tapHaptic();
                setSelectedPoint((prev) =>
                  prev?.entryId === p.entryId ? null : p,
                );
              }}
              primaryColor={primaryColor}
            />
          </View>

          {/* Axis labels row below chart */}
          <AxisLabels />

          {/* Selected point detail */}
          {selectedPoint && (
            <Animated.View
              entering={FadeInDown.duration(250)}
              style={{
                marginHorizontal: 20,
                marginTop: 4,
                marginBottom: 12,
                padding: 14,
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.2)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{selectedPoint.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 13,
                        color: "#FFFFFF",
                      }}
                      numberOfLines={1}
                    >
                      {selectedPoint.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.5)",
                        marginTop: 1,
                      }}
                    >
                      {selectedPoint.date}
                    </Text>
                  </View>
                </View>
                {selectedPoint.isUserCorrected && (
                  <View
                    style={{
                      paddingHorizontal: 7,
                      paddingVertical: 3,
                      borderRadius: 8,
                      backgroundColor: `${primaryColor}30`,
                      borderWidth: 1,
                      borderColor: `${primaryColor}60`,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 9,
                        color: primaryColor,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      You edited
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <VABadge
                  label="Valence"
                  value={selectedPoint.valence}
                  unit=""
                  signed
                />
                <VABadge
                  label="Arousal"
                  value={selectedPoint.arousal}
                  unit=""
                  signed={false}
                />
                <VABadge
                  label="Emotion"
                  value={
                    selectedPoint.emotion.charAt(0).toUpperCase() +
                    selectedPoint.emotion.slice(1)
                  }
                  unit=""
                  isText
                  color={selectedPoint.color}
                />
              </View>
            </Animated.View>
          )}

          {/* Quadrant Distribution */}
          <QuadrantDistribution counts={quadrantCounts} total={totalPoints} />

          {/* Dominant quadrant summary */}
          {dominantQuadrant && (
            <Animated.View
              entering={FadeInDown.delay(100).duration(350)}
              style={{
                marginHorizontal: 20,
                marginBottom: 20,
                padding: 14,
                borderRadius: 16,
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.20)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 14 }}>{dominantQuadrant.emoji}</Text>
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 14,
                    color: "#FFFFFF",
                  }}
                >
                  Mostly {dominantQuadrant.label}
                </Text>
                <View
                  style={{
                    marginLeft: "auto",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: `${dominantQuadrant.color}25`,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_700Bold",
                      fontSize: 11,
                      color: "#FFFFFF",
                    }}
                  >
                    {quadrantCounts[dominantQuadrant.key]}/{totalPoints}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 18,
                }}
              >
                {dominantQuadrant.desc}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

// ─── Chart SVG ────────────────────────────────────────────────────────────────

function ChartSvg({
  chartSize,
  points,
  selectedPoint,
  onPointPress,
  primaryColor,
}: {
  chartSize: number;
  points: ChartPoint[];
  selectedPoint: ChartPoint | null;
  onPointPress: (p: ChartPoint) => void;
  primaryColor: string;
}) {
  const half = chartSize / 2;

  return (
    <Svg width={chartSize} height={chartSize} style={{ borderRadius: 16 }}>
      {/* Quadrant corner labels */}
      <SvgText
        x={8}
        y={16}
        fontSize={9}
        fill="rgba(255,255,255,0.45)"
        fontFamily="Inter_600SemiBold"
      >
        TENSE
      </SvgText>
      <SvgText
        x={half + 6}
        y={16}
        fontSize={9}
        fill="rgba(255,255,255,0.45)"
        fontFamily="Inter_600SemiBold"
      >
        EXCITED
      </SvgText>
      <SvgText
        x={8}
        y={chartSize - 6}
        fontSize={9}
        fill="rgba(255,255,255,0.45)"
        fontFamily="Inter_600SemiBold"
      >
        DOWN
      </SvgText>
      <SvgText
        x={half + 6}
        y={chartSize - 6}
        fontSize={9}
        fill="rgba(255,255,255,0.45)"
        fontFamily="Inter_600SemiBold"
      >
        CALM
      </SvgText>

      {/* Axes */}
      <Line
        x1={half}
        y1={0}
        x2={half}
        y2={chartSize}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <Line
        x1={0}
        y1={half}
        x2={chartSize}
        y2={half}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {/* Centre crosshair dot */}
      <Circle cx={half} cy={half} r={3} fill="rgba(255,255,255,0.2)" />

      {/* Data points */}
      {points.map((p, i) => {
        const isSelected = selectedPoint?.entryId === p.entryId;
        const r = isSelected ? 16 : 13;

        return (
          <G key={p.entryId + i}>
            {/* Glow ring for selected */}
            {isSelected && (
              <Circle
                cx={p.x}
                cy={p.y}
                r={r + 6}
                fill={`${p.color}25`}
                stroke={p.color}
                strokeWidth={1.5}
                strokeOpacity={0.5}
              />
            )}
            {/* Outer glow */}
            <Circle cx={p.x} cy={p.y} r={r + 2} fill={`${p.color}18`} />
            {/* Main circle */}
            <Circle
              cx={p.x}
              cy={p.y}
              r={r}
              fill="rgba(20,20,40,0.85)"
              stroke={isSelected ? "#FFFFFF" : p.color}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            {/* "Edited by you" star indicator */}
            {p.isUserCorrected && (
              <Circle
                cx={p.x + r - 3}
                cy={p.y - r + 3}
                r={4}
                fill={primaryColor}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={1}
              />
            )}
            {/* Tap target (transparent, larger) */}
            <Circle
              cx={p.x}
              cy={p.y}
              r={r + 6}
              fill="transparent"
              onPress={() => onPointPress(p)}
            />
          </G>
        );
      })}

      {/* Emoji labels (drawn last so they appear on top) */}
      {points.map((p, i) => (
        <SvgText
          key={`emoji-${p.entryId}-${i}`}
          x={p.x}
          y={p.y + 5}
          fontSize={12}
          textAnchor="middle"
          onPress={() => onPointPress(p)}
        >
          {p.emoji}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Axis Labels ──────────────────────────────────────────────────────────────

function AxisLabels() {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        ← Unpleasant
      </Text>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
        }}
      >
        Pleasant →
      </Text>
    </View>
  );
}

// ─── Quadrant Distribution Bar ────────────────────────────────────────────────

function QuadrantDistribution({
  counts,
  total,
}: {
  counts: QuadrantCounts;
  total: number;
}) {
  if (total === 0) return null;

  const sections = QUADRANT_CONFIG.map((q) => ({
    ...q,
    count: counts[q.key],
    pct: total > 0 ? counts[q.key] / total : 0,
  })).filter((s) => s.count > 0);

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
      {/* Bar */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          flexDirection: "row",
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.07)",
          marginBottom: 10,
        }}
      >
        {sections.map((s) => (
          <View
            key={s.key}
            style={{
              flex: s.pct,
              backgroundColor: "#FFFFFF",
              opacity: 0.75,
            }}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {sections.map((s) => (
          <View
            key={s.key}
            style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FFFFFF",
                opacity: 0.75,
              }}
            />
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {s.label} {s.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── V-A Badge ────────────────────────────────────────────────────────────────

function VABadge({
  label,
  value,
  unit,
  signed = false,
  isText = false,
  color,
}: {
  label: string;
  value: number | string;
  unit: string;
  signed?: boolean;
  isText?: boolean;
  color?: string;
}) {
  const display = isText
    ? String(value)
    : signed
      ? `${Number(value) > 0 ? "+" : ""}${value}`
      : String(value);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: 8,
        alignItems: "center",
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          fontSize: 9,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 13,
          color: color ?? "#FFFFFF",
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {display}
        {unit}
      </Text>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ range }: { range: TimeRange }) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 40,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 32, marginBottom: 10 }}>🗺️</Text>
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 14,
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        No entries in the last{" "}
        {range === "7D" ? "7 days" : range === "14D" ? "14 days" : "30 days"}.
        {"\n"}
        Record a few to see your emotional landscape.
      </Text>
    </View>
  );
}
