import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  EmotionType,
  EMOTION_EMOJIS,
  EMOTION_COLORS,
  BlendedEmotionType,
  BLENDED_EMOTION_LABELS,
  RankedEmotion,
} from "@/lib/types";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";

const INTENSITY_COLORS: Record<string, string> = {
  mild: "#F0F9FF",
  moderate: "#BAE6FD",
  high: "#7DD3FC",
};

function getIntensityColor(label: string): string {
  if (label === "Serenity" || label === "Acceptance" || label === "Apprehension" ||
      label === "Distraction" || label === "Pensiveness" || label === "Boredom" ||
      label === "Annoyance" || label === "Interest") {
    return INTENSITY_COLORS.mild;
  }
  if (label === "Ecstasy" || label === "Admiration" || label === "Terror" ||
      label === "Amazement" || label === "Grief" || label === "Loathing" ||
      label === "Rage" || label === "Vigilance") {
    return INTENSITY_COLORS.high;
  }
  return INTENSITY_COLORS.moderate;
}

interface EmotionBreakdownCardProps {
  topThreeEmotions: RankedEmotion[];
  blendedEmotions: Partial<Record<BlendedEmotionType, number>>;
  ambivalenceFlags: [EmotionType, EmotionType][];
}

export function EmotionBreakdownCard({
  topThreeEmotions,
  blendedEmotions,
  ambivalenceFlags,
}: EmotionBreakdownCardProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const theme = THEME_COLORS[selectedTheme];

  const blendedEntries = Object.entries(blendedEmotions ?? {}) as [BlendedEmotionType, number][];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: isDarkMode ? "#FFFFFF" : "#3B2463" }]}>
        Top 3 Emotions
      </Text>

      {topThreeEmotions.map((item) => {
        const emotionColor = EMOTION_COLORS[item.emotion] ?? theme.primary;

        return (
          <View key={item.rank} style={styles.rankedRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{item.rank}</Text>
            </View>

            <Text style={[styles.emoji]}>{EMOTION_EMOJIS[item.emotion]}</Text>

            <View style={styles.emotionInfo}>
              <Text style={[styles.emotionName, { color: isDarkMode ? "#FFFFFF" : "#3B2463" }]}>
                {item.intensityLabel}
              </Text>
              <Text style={[styles.emotionSub, { color: isDarkMode ? "#A0A0A0" : "#9D8EC9" }]}>
                {item.emotion} · {item.score}%
              </Text>
            </View>

            <View style={[styles.miniBar, { backgroundColor: isDarkMode ? "#333" : "#E9D5FF" }]}>
              <View style={[styles.miniBarFill, { width: `${item.score}%`, backgroundColor: emotionColor }]} />
            </View>
          </View>
        );
      })}

      {blendedEntries.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#A0A0A0" : "#9D8EC9" }]}>
            Blended Emotions
          </Text>
          <View style={styles.blendedRow}>
            {blendedEntries.map(([key, score]) => (
              <View
                key={key}
                style={[
                  styles.blendedBadge,
                  {
                    backgroundColor: isDarkMode ? "rgba(147, 112, 219, 0.15)" : "rgba(147, 112, 219, 0.1)",
                    borderColor: isDarkMode ? "rgba(147, 112, 219, 0.3)" : "rgba(147, 112, 219, 0.25)",
                  },
                ]}
              >
                <Text style={[styles.blendedLabel, { color: isDarkMode ? "#D8BFEA" : "#7E22CE" }]}>
                  {BLENDED_EMOTION_LABELS[key]}
                </Text>
                <Text style={[styles.blendedScore, { color: isDarkMode ? "#A0A0A0" : "#9D8EC9" }]}>
                  {score}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {ambivalenceFlags.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? "#A0A0A0" : "#9D8EC9" }]}>
            Ambivalence Detected
          </Text>
          <View style={styles.ambivalentRow}>
            {ambivalenceFlags.map(([a, b]) => (
              <View
                key={`${a}-${b}`}
                style={[
                  styles.ambivalentBadge,
                  {
                    backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.08)",
                    borderColor: "rgba(245, 158, 11, 0.3)",
                  },
                ]}
              >
                <Text style={[styles.ambivalentEmoji]}>
                  {EMOTION_EMOJIS[a]}↔{EMOTION_EMOJIS[b]}
                </Text>
                <Text style={[styles.ambivalentLabel, { color: isDarkMode ? "#FBBF24" : "#B45309" }]}>
                  {a} ↔ {b}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 4 },
  rankedRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(147, 112, 219, 0.15)", alignItems: "center", justifyContent: "center" },
  rankText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#9370DB" },
  emoji: { fontSize: 22 },
  emotionInfo: { flex: 1 },
  emotionName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  emotionSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  miniBar: { width: 48, height: 4, borderRadius: 2, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 2 },
  section: { marginTop: 12, gap: 8 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  blendedRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  blendedBadge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  blendedLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  blendedScore: { fontFamily: "Inter_400Regular", fontSize: 12 },
  ambivalentRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ambivalentBadge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 6 },
  ambivalentEmoji: { fontSize: 14 },
  ambivalentLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
});

export default EmotionBreakdownCard;