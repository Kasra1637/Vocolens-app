/**
 * My Feedback History Screen
 *
 * Rebuilt with the app's glassmorphic design system (matching Transcription
 * Language section: rgba(255,255,255,0.12) bg, borderWidth 2,
 * borderColor rgba(255,255,255,0.20), borderRadius 24, no shadows).
 *
 * Sections:
 *  1. Header stats row (AI confirmation rate + personalisation strength)
 *  2. Top pattern card
 *  3. Recent Feedback list (last 20 items)
 *  4. Export Feedback as CSV button
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Download,
  BarChart3,
  RefreshCw,
  Sparkles,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import { getThemeColors, getThemeGradients, BorderRadius } from "@/lib/theme";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";

// ── Shared glassmorphic card style (matches Transcription Language section) ──
const glass = {
  backgroundColor: "rgba(255, 255, 255, 0.12)" as const,
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.20)" as const,
  borderRadius: BorderRadius.xlarge, // 24
  overflow: "hidden" as const,
};

// ── Divider style ─────────────────────────────────────────────────────────────
const divider = {
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255, 255, 255, 0.12)" as const,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function CorrectionHistoryScreen() {
  useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_700Bold,
  });

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const selectedTheme = useOnboardingStore((s: any) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s: any) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const { corrections, userBias, getConfirmationRate, getPersonalizationStrength } =
    useEmotionCorrectionStore();

  const confirmationRate = getConfirmationRate();
  const personalizationStrength = getPersonalizationStrength();
  const topPattern = userBias.patterns[0] ?? null;
  const recentFeedback = corrections.slice(0, 20);

  const handleExportCSV = useCallback(async () => {
    successHaptic();
    const headers =
      "Date,AI Emotion,Your Emotion,AI Valence,Your Valence,AI Arousal,Your Arousal,Note,Mode\n";
    const rows = corrections
      .map((c) =>
        [
          formatDate(c.timestamp),
          c.aiEmotion,
          c.userEmotion,
          c.aiValence,
          c.userValence,
          c.aiArousal,
          c.userArousal,
          c.reason ? `"${c.reason.replace(/"/g, '""')}"` : "",
          c.correctionMode,
        ].join(","),
      )
      .join("\n");
    try {
      await Share.share({
        message: headers + rows,
        title: "My Feedback History — Vocolens",
      });
    } catch {
      Alert.alert("Export failed", "Could not share the CSV file.");
    }
  }, [corrections]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: insets.top + 14,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(255, 255, 255, 0.12)",
        }}
      >
        <Pressable
          onPress={() => { tapHaptic(); router.back(); }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.20)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <Text
          style={{
            fontFamily: "Fraunces_700Bold",
            color: "#FFFFFF",
            fontSize: 18,
            flex: 1,
            textAlign: "center",
            marginHorizontal: 12,
          }}
        >
          My Feedback
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── 1. Stats row ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(500)}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>

            {/* AI Confirmation Rate */}
            <View style={{ flex: 1, ...glass, padding: 18 }}>
              <View
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <CheckCircle2 size={22} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 26 }}>
                {Math.round(confirmationRate * 100)}%
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                AI confirmation{"\n"}rate
              </Text>
            </View>

            {/* Personalisation Strength */}
            <View style={{ flex: 1, ...glass, padding: 18 }}>
              <View
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <TrendingUp size={22} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 26 }}>
                {Math.round(personalizationStrength * 100)}%
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                Model person-{"\n"}alisation
              </Text>
            </View>

          </View>
        </Animated.View>

        {/* ── 2. Top pattern card ── */}
        {topPattern && (
          <Animated.View entering={FadeInDown.delay(160).duration(500)} style={{ marginBottom: 16 }}>
            <View style={{ ...glass }}>
              {/* Header row */}
              <View style={{ flexDirection: "row", alignItems: "center", padding: 18, ...divider }}>
                <View
                  style={{
                    width: 44, height: 44, borderRadius: 22,
                    overflow: "hidden",
                    alignItems: "center", justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                  <Sparkles size={24} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 16 }}>
                  Top Pattern
                </Text>
              </View>

              {/* Pattern body */}
              <View style={{ padding: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.12)",
                      borderWidth: 2, borderColor: "rgba(255,255,255,0.20)",
                      borderRadius: BorderRadius.round,
                      paddingHorizontal: 14, paddingVertical: 7,
                    }}
                  >
                    <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 14, textTransform: "capitalize" }}>
                      {topPattern.aiLabel}
                    </Text>
                  </View>
                  <ArrowRight size={16} color="rgba(255,255,255,0.5)" style={{ marginHorizontal: 10 }} />
                  <View
                    style={{
                      backgroundColor: "rgba(255,255,255,0.22)",
                      borderWidth: 2, borderColor: "rgba(255,255,255,0.40)",
                      borderRadius: BorderRadius.round,
                      paddingHorizontal: 14, paddingVertical: 7,
                    }}
                  >
                    <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 14, textTransform: "capitalize" }}>
                      {topPattern.actualLabel}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
                  {topPattern.rawOccurrences}× · {Math.round(topPattern.confidence * 100)}% confidence · last {formatShortDate(topPattern.lastSeen)}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── 3. Recent Feedback ── */}
        <Animated.View entering={FadeInDown.delay(240).duration(500)} style={{ marginBottom: 16 }}>
          <View style={{ ...glass }}>

            {/* Section header */}
            <View style={{ flexDirection: "row", alignItems: "center", padding: 18, ...divider }}>
              <View
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  overflow: "hidden",
                  alignItems: "center", justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                <BarChart3 size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 16, flex: 1 }}>
                Recent Feedback
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                {recentFeedback.length} entries
              </Text>
            </View>

            {/* Empty state */}
            {recentFeedback.length === 0 ? (
              <View style={{ padding: 28, alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255,255,255,0.55)",
                    fontSize: 14,
                    textAlign: "center",
                    lineHeight: 21,
                  }}
                >
                  No feedback yet.{"\n"}Confirm or adjust emotions after recording to build your personalised model.
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14 }}>
                {recentFeedback.map((c, i) => {
                  const isConfirmation =
                    c.aiEmotion === c.userEmotion &&
                    c.aiValence === c.userValence &&
                    c.aiArousal === c.userArousal;
                  const valenceDelta = c.userValence - c.aiValence;
                  const arousalDelta = c.userArousal - c.aiArousal;
                  const isLast = i === recentFeedback.length - 1;

                  return (
                    <View
                      key={c.id}
                      style={{
                        paddingVertical: 14,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      {/* Date + type pill */}
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                          {formatShortDate(c.timestamp)}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row", alignItems: "center",
                            backgroundColor: isConfirmation ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.10)",
                            borderRadius: BorderRadius.round,
                            paddingHorizontal: 10, paddingVertical: 4,
                            borderWidth: 1,
                            borderColor: isConfirmation ? "rgba(34,197,94,0.30)" : "rgba(255,255,255,0.18)",
                            gap: 5,
                          }}
                        >
                          {isConfirmation
                            ? <CheckCircle2 size={11} color="#22C55E" strokeWidth={2} />
                            : <RefreshCw size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                          }
                          <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: isConfirmation ? "#22C55E" : "rgba(255,255,255,0.7)" }}>
                            {isConfirmation ? "Confirmed" : "Corrected"}
                          </Text>
                        </View>
                      </View>

                      {/* Emotion pair */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)", fontSize: 13, textTransform: "capitalize" }}>
                          {c.aiEmotion}
                        </Text>
                        {!isConfirmation && (
                          <>
                            <ArrowRight size={13} color="rgba(255,255,255,0.35)" />
                            <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 13, textTransform: "capitalize" }}>
                              {c.userEmotion}
                            </Text>
                          </>
                        )}
                      </View>

                      {/* V/A deltas (only for corrections with meaningful change) */}
                      {!isConfirmation && (Math.abs(valenceDelta) > 0 || Math.abs(arousalDelta) > 0) && (
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                          <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                            Valence {valenceDelta > 0 ? "+" : ""}{valenceDelta.toFixed(0)}
                          </Text>
                          <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", fontSize: 11 }}>
                            Arousal {arousalDelta > 0 ? "+" : ""}{arousalDelta.toFixed(0)}
                          </Text>
                        </View>
                      )}

                      {/* User note */}
                      {!!c.reason && (
                        <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.50)", fontSize: 12, marginTop: 5, fontStyle: "italic" }}>
                          "{c.reason}"
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── 4. Export CSV ── */}
        {corrections.length > 0 && (
          <Animated.View entering={FadeInDown.delay(320).duration(500)}>
            <Pressable
              onPress={handleExportCSV}
              style={{
                ...glass,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 16,
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  overflow: "hidden",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                <Download size={24} color="#FFFFFF" strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15 }}>
                Export Feedback as CSV
              </Text>
            </Pressable>
          </Animated.View>
        )}

      </ScrollView>
    </View>
  );
}
