import React from "react";
import { View, Text, ScrollView, Pressable, Share, Alert, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
  Download,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import { getThemeColors, getThemeGradients } from "@/lib/theme";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { hexToRgba, GlassLayers } from "@/lib/glass";

export default function CorrectionHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const {
    corrections,
    userBias,
    getConfirmationRate,
    getPersonalizationStrength,
  } = useEmotionCorrectionStore();
  const confirmationRate = getConfirmationRate();
  const personalizationStrength = getPersonalizationStrength();

  // Top delta: most frequent correction pattern
  const topPattern = userBias.patterns[0];

  const handleBack = () => {
    tapHaptic();
    router.back();
  };

  const handleExportCSV = async () => {
    successHaptic();
    const headers =
      "timestamp,aiEmotion,userEmotion,aiValence,userValence,aiArousal,userArousal,reason,correctionMode\n";
    const rows = corrections
      .map((c) =>
        [
          c.timestamp,
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

    const csv = headers + rows;

    try {
      await Share.share({
        message: csv,
        title: "Vocolens Correction History",
      });
    } catch (err) {
      Alert.alert("Export failed", "Could not share CSV.");
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: insets.top + 12,
          paddingBottom: 16,
        }}
      >
        <Pressable
          onPress={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: hexToRgba(Colors.primary, 0.15),
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            color: "#FFFFFF",
            fontSize: 18,
          }}
        >
          My Feedback
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            {/* Confirmation Rate */}
            <View
              style={{
                flex: 1,
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.15),
                overflow: "hidden",
              }}
            >
              <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
              <CheckCircle2 size={20} color="#22C55E" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 24,
                  marginTop: 8,
                }}
              >
                {Math.round(confirmationRate * 100)}%
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                AI confirmation rate
              </Text>
            </View>

            {/* Personalization Strength */}
            <View
              style={{
                flex: 1,
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.15),
                overflow: "hidden",
              }}
            >
              <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
              <TrendingUp size={20} color={Colors.primary} strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 24,
                  marginTop: 8,
                }}
              >
                {Math.round(personalizationStrength * 100)}%
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Personalization
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Top Delta */}
        {topPattern && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            style={{ marginBottom: 20 }}
          >
            <View
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.15),
                overflow: "hidden",
              }}
            >
              <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 8,
                }}
              >
                Top pattern
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "#FFFFFF",
                    fontSize: 16,
                    textTransform: "capitalize",
                  }}
                >
                  {topPattern.aiLabel}
                </Text>
                <RefreshCw
                  size={16}
                  color={Colors.primary}
                  style={{ marginHorizontal: 12 }}
                />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 16,
                    textTransform: "capitalize",
                  }}
                >
                  {topPattern.actualLabel}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                {topPattern.occurrences} times ·{" "}
                {Math.round(topPattern.confidence * 100)}% confidence
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Recent Corrections List */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
              fontSize: 16,
              marginBottom: 12,
            }}
          >
            Recent feedback
          </Text>

          {corrections.length === 0 ? (
            <View
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.08),
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                No feedback yet. Confirm or adjust emotions after recording to
                build your personalized model.
              </Text>
            </View>
          ) : (
            <View>
              {corrections.slice(0, 20).map((c, i) => {
                const isConfirmation =
                  c.aiEmotion === c.userEmotion && c.aiValence === c.userValence;
                return (
                  <View
                    key={c.id}
                    style={[
                      styles.container,
                      {
                        backgroundColor: hexToRgba(Colors.primary, 0.08),
                        borderColor: hexToRgba(Colors.primary, 0.12),
                      },
                    ]}
                  >
                    <GlassLayers
                      primaryColor={Colors.primary}
                      borderRadius={16}
                    />
                    {/* Row 1: Status and Emotion */}
                    <View style={styles.emotionPair}>
                      {/* Confirmation Badge */}
                      <View
                        style={[
                          styles.confirmationBadge,
                          {
                            backgroundColor:
                              c.correctionMode === "user_accepted"
                                ? hexToRgba(Colors.primary, 0.2)
                                : hexToRgba(Colors.accent, 0.15),
                          },
                        ]}
                      >
                        {c.correctionMode === "user_accepted" ? (
                          <CheckCircle2 size={14} color={Colors.primary} />
                        ) : (
                          <RefreshCw size={14} color={Colors.accent} />
                        )}
                      </View>
                      {/* Row 2: Emotion Pair */}
                      <View style={styles.emotionPair}>
                        <View
                          style={[
                            styles.emotionBadge,
                            {
                              backgroundColor: hexToRgba(Colors.secondary, 0.15),
                              borderColor: hexToRgba(Colors.secondary, 0.3),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.emotionText,
                              { color: Colors.secondary },
                            ]}
                          >
                            {c.userEmotion}
                          </Text>
                        </View>
                        <Text style={styles.arrow}>→</Text>
                        <View
                          style={[
                            styles.emotionBadge,
                            {
                              backgroundColor: hexToRgba(Colors.primary, 0.15),
                              borderColor: hexToRgba(Colors.primary, 0.3),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.emotionText,
                              { color: Colors.primary },
                            ]}
                          >
                            {c.aiEmotion}
                          </Text>
                        </View>
                      </View>
                      {/* Row 3: Delta */}
                      <View style={styles.delta}>
                        <Text style={styles.deltaLabel}>Valence: </Text>
                        <Text
                          style={[styles.deltaValue, { color: Colors.primary }]}
                        >
                          {c.userValence > c.aiValence ? "+" : ""}
                          {(c.userValence - c.aiValence).toFixed(1)}
                        </Text>
                        <Text
                          style={[
                            styles.deltaSeparator,
                            { color: "rgba(255,255,255,0.4)" },
                          ]}
                        >
                          {" "}•{" "}
                        </Text>
                        <Text style={styles.deltaLabel}>Arousal: </Text>
                        <Text
                          style={[styles.deltaValue, { color: Colors.accent }]}
                        >
                          {c.userArousal > c.aiArousal ? "+" : ""}
                          {(c.userArousal - c.aiArousal).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        marginTop: 6,
                      }}
                    >
                      {formatDate(c.timestamp)}
                    </Text>
                    {c.reason && (
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                          marginTop: 4,
                          fontStyle: "italic",
                        }}
                      >
                        "{c.reason}"
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Export Button */}
        {corrections.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            style={{ marginTop: 12 }}
          >
            <Pressable
              onPress={handleExportCSV}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: hexToRgba(Colors.primary, 0.12),
                borderRadius: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.2),
                overflow: "hidden",
              }}
            >
              <GlassLayers primaryColor={Colors.primary} borderRadius={16} />
              <Download size={16} color="#FFFFFF" />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                  fontSize: 14,
                  marginLeft: 8,
                }}
              >
                Export feedback as CSV
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emotionPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
  },
  emotionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  emotionText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  arrow: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  delta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
  deltaLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginRight: 2,
  },
  deltaValue: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    marginRight: 4,
  },
  deltaSeparator: {
    fontSize: 10,
  },
});
