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

// ── White-only palette (all badges/text white per design spec) ────────────────

const WHITE_BADGE = {
  bg: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.25)",
  text: "#FFFFFF",
};

// Keep type-safe lookup shapes but all values are white
const EMOTION_COLORS: Record<EmotionType, { bg: string; border: string; text: string }> = {
  happiness:    WHITE_BADGE,
  trust:        WHITE_BADGE,
  fear:         WHITE_BADGE,
  surprise:     WHITE_BADGE,
  sadness:      WHITE_BADGE,
  disgust:      WHITE_BADGE,
  anger:        WHITE_BADGE,
  anticipation: WHITE_BADGE,
};

const BLEND_COLORS: Record<BlendedEmotionType, { bg: string; border: string; text: string }> = {
  Love:           WHITE_BADGE,
  Optimism:       WHITE_BADGE,
  Submission:     WHITE_BADGE,
  Awe:            WHITE_BADGE,
  Disapproval:    WHITE_BADGE,
  Remorse:        WHITE_BADGE,
  Contempt:       WHITE_BADGE,
  Aggressiveness: WHITE_BADGE,
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
          <Text style={[styles.intensityLabel, { color: "#FFFFFF" }]}>{item.intensityLabel}</Text>
          <Text style={styles.rankedScore}>{item.score}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: barWidth, backgroundColor: "rgba(255,255,255,0.85)" }]} />
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
    <Animated.View entering={FadeInUp.delay(200).duration(600)} style={[styles.card, { overflow: 'hidden', backgroundColor: hexToRgba(themeColor, 0.1), borderColor: hexToRgba(themeColor, 0.15) }]}>
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
                bg="rgba(255,255,255,0.12)"
                border="rgba(255,255,255,0.25)"
                textColor="#FFFFFF"
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
    borderWidth: 1,
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
