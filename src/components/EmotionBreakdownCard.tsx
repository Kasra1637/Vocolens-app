/**
 * EmotionBreakdownCard
 * Displays the Claude 3.5 Sonnet Plutchik deep analysis:
 *   - Top-3 ranked emotions with intensity badges (Ecstasy / Joy / Serenity…)
 *   - Blended emotion badges (Love, Awe, Remorse…)
 *   - Ambivalence flags (Joy↔Sadness…)
 *
 * ai* fields are AI-baseline only — user corrections never touch them.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { RankedEmotion, BlendedEmotionType, EmotionType } from "@/lib/types";
import { GlassLayers, hexToRgba } from "@/lib/glass";

// ── Emotion palette ───────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<EmotionType, { bg: string; border: string; text: string }> = {
  happiness:    { bg: "rgba(255, 217, 61, 0.18)",  border: "rgba(255, 217, 61, 0.55)",  text: "#FFD93D" },
  trust:        { bg: "rgba(77, 182, 172, 0.18)",  border: "rgba(77, 182, 172, 0.55)",  text: "#4DB6AC" },
  fear:         { bg: "rgba(149, 117, 205, 0.18)", border: "rgba(149, 117, 205, 0.55)", text: "#9575CD" },
  surprise:     { bg: "rgba(255, 138, 101, 0.18)", border: "rgba(255, 138, 101, 0.55)", text: "#FF8A65" },
  sadness:      { bg: "rgba(107, 141, 214, 0.18)", border: "rgba(107, 141, 214, 0.55)", text: "#6B8DD6" },
  disgust:      { bg: "rgba(124, 179, 66, 0.18)",  border: "rgba(124, 179, 66, 0.55)",  text: "#7CB342" },
  anger:        { bg: "rgba(255, 107, 107, 0.18)", border: "rgba(255, 107, 107, 0.55)", text: "#FF6B6B" },
  anticipation: { bg: "rgba(255, 183, 77, 0.18)",  border: "rgba(255, 183, 77, 0.55)",  text: "#FFB74D" },
};

const BLEND_COLORS: Record<BlendedEmotionType, { bg: string; border: string; text: string }> = {
  Love:            { bg: "rgba(255, 107, 170, 0.18)", border: "rgba(255, 107, 170, 0.5)", text: "#FF6BAA" },
  Optimism:        { bg: "rgba(255, 236, 100, 0.18)", border: "rgba(255, 236, 100, 0.5)", text: "#FFD700" },
  Submission:      { bg: "rgba(149, 117, 205, 0.18)", border: "rgba(149, 117, 205, 0.5)", text: "#9575CD" },
  Awe:             { bg: "rgba(100, 200, 220, 0.18)", border: "rgba(100, 200, 220, 0.5)", text: "#64C8DC" },
  Disapproval:     { bg: "rgba(150, 150, 180, 0.18)", border: "rgba(150, 150, 180, 0.5)", text: "#9696B4" },
  Remorse:         { bg: "rgba(107, 141, 214, 0.18)", border: "rgba(107, 141, 214, 0.5)", text: "#6B8DD6" },
  Contempt:        { bg: "rgba(120, 160, 80, 0.18)",  border: "rgba(120, 160, 80, 0.5)",  text: "#78A050" },
  Aggressiveness:  { bg: "rgba(255, 120, 80, 0.18)",  border: "rgba(255, 120, 80, 0.5)",  text: "#FF7850" },
};

const RANK_LABELS: Record<1 | 2 | 3, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

// ── Sub-components ────────────────────────────────────────────────────────────

function RankedEmotionRow({ item }: { item: RankedEmotion }) {
  const colors = EMOTION_COLORS[item.emotion];
  const barWidth = `${item.score}%` as `${number}%`;

  return (
    <View style={styles.rankedRow}>
      {/* Rank badge */}
      <View style={[styles.rankBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.rankBadgeText, { color: colors.text }]}>{RANK_LABELS[item.rank]}</Text>
      </View>

      {/* Label + bar */}
      <View style={styles.rankedMid}>
        <View style={styles.rankedLabelRow}>
          <Text style={[styles.intensityLabel, { color: colors.text }]}>{item.intensityLabel}</Text>
          <Text style={styles.rankedScore}>{item.score}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: barWidth, backgroundColor: colors.text }]} />
        </View>
      </View>
    </View>
  );
}

function Badge({
  label,
  bg,
  border,
  textColor,
}: {
  label: string;
  bg: string;
  border: string;
  textColor: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  aiTopThreeEmotions?: RankedEmotion[];
  aiBlendedEmotions?: BlendedEmotionType[];
  aiAmbivalenceFlags?: string[];
  themeColor?: string;
}

export default function EmotionBreakdownCard({
  aiTopThreeEmotions,
  aiBlendedEmotions,
  aiAmbivalenceFlags,
  themeColor = "#a78bfa",
}: Props) {
  const hasTop3 = aiTopThreeEmotions && aiTopThreeEmotions.length > 0;
  const hasBlended = aiBlendedEmotions && aiBlendedEmotions.length > 0;
  const hasAmbivalence = aiAmbivalenceFlags && aiAmbivalenceFlags.length > 0;

  if (!hasTop3 && !hasBlended && !hasAmbivalence) return null;

  return (
    <Animated.View entering={FadeInUp.delay(200).duration(600)} style={[styles.card, { overflow: 'hidden' }]}>
      <GlassLayers primaryColor={themeColor} borderRadius={20} />
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerDot, { backgroundColor: themeColor }]} />
        <Text style={styles.headerTitle}>Emotion Breakdown</Text>
        <Text style={styles.headerSub}>Claude 3.5 Sonnet analysis</Text>
      </View>

      {/* Top 3 ranked emotions */}
      {hasTop3 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Top Emotions</Text>
          {aiTopThreeEmotions!.map((item) => (
            <RankedEmotionRow key={item.emotion} item={item} />
          ))}
        </View>
      )}

      {/* Blended emotions */}
      {hasBlended && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Blended Emotions</Text>
          <View style={styles.badgeRow}>
            {aiBlendedEmotions!.map((blend) => {
              const c = BLEND_COLORS[blend];
              return <Badge key={blend} label={blend} bg={c.bg} border={c.border} textColor={c.text} />;
            })}
          </View>
        </View>
      )}

      {/* Ambivalence flags */}
      {hasAmbivalence && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Emotional Tension</Text>
          <View style={styles.badgeRow}>
            {aiAmbivalenceFlags!.map((flag) => (
              <Badge
                key={flag}
                label={flag}
                bg="rgba(255,255,255,0.08)"
                border="rgba(255,255,255,0.22)"
                textColor="rgba(255,255,255,0.75)"
              />
            ))}
          </View>
          <Text style={styles.ambivalenceNote}>
            Opposing emotions detected simultaneously
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    fontSize: 15,
    flex: 1,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  // Ranked row
  rankedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  rankBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: "center",
  },
  rankBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rankedMid: {
    flex: 1,
  },
  rankedLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  intensityLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  rankedScore: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 2,
    opacity: 0.7,
  },
  // Badges
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  ambivalenceNote: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    marginTop: 6,
  },
});
