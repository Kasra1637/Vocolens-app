/**
 * EmotionBreakdownCard
 *
 * Renders the AI's Plutchik deep-analysis "extras" that are not already
 * shown by the Top Emotions bars in the collapsible "Emotion Breakdown"
 * section on the entry-detail screen:
 *   - Blended emotion badges (Love, Awe, Remorse…)
 *   - Ambivalence flags (happiness↔sadness…)
 *
 * This component is meant to be nested INSIDE that collapsible section
 * (not rendered as its own standalone card) — it intentionally has no
 * header or background of its own so it reads as a continuation of the
 * "Emotion Breakdown" section rather than a second, duplicate section.
 *
 * IMPORTANT: This component ALWAYS renders both sections — it never
 * returns null. When no qualifying data exists, a placeholder is shown
 * so that Blended Emotions and Emotional Tension are permanently visible
 * inside the Emotion Breakdown card on every journal entry.
 *
 * ai* fields are AI-baseline only — user corrections never touch them.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { BlendedEmotionType } from "@/lib/types";

// ── White-only palette (all badges/text white per design spec) ────────────────

const WHITE_BADGE = {
  bg: "rgba(255, 255, 255, 0.12)",
  border: "rgba(255, 255, 255, 0.25)",
  text: "#FFFFFF",
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
  aiBlendedEmotions?: BlendedEmotionType[];
  aiAmbivalenceFlags?: string[];
}

export default function EmotionBreakdownCard({
  aiBlendedEmotions,
  aiAmbivalenceFlags,
}: Props) {
  const hasBlended = aiBlendedEmotions && aiBlendedEmotions.length > 0;
  const hasAmbivalence = aiAmbivalenceFlags && aiAmbivalenceFlags.length > 0;

  return (
    <View style={styles.wrapper}>
      {/* Blended emotions — always shown */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Blended Emotions</Text>
        {hasBlended ? (
          <View style={styles.badgeRow}>
            {aiBlendedEmotions!.map((blend) => {
              const c = BLEND_COLORS[blend];
              return <Badge key={blend} label={blend} bg={c.bg} border={c.border} textColor={c.text} />;
            })}
          </View>
        ) : (
          <Text style={styles.emptyNote}>No blended emotions detected in this entry</Text>
        )}
      </View>

      {/* Emotional tension — always shown */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Emotional Tension</Text>
        {hasAmbivalence ? (
          <View>
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
        ) : (
          <Text style={styles.emptyNote}>No opposing emotions detected in this entry</Text>
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
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
  emptyNote: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
    fontSize: 12,
    fontStyle: "italic",
  },
});
