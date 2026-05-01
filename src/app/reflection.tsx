import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";
import {
  X,
  Check,
  ChevronRight,
  Sparkles,
  SkipForward,
} from "lucide-react-native";
import { router } from "expo-router";
import { EmotionType, BodyRegionSensation, DistressLevel } from "@/lib/types";
import { getEmotionDefinition } from "@/lib/emotion-definitions";
import { getSubLabelForIntensity } from "@/lib/plutchik-vocabulary";
import {
  valenceFromPlutchik,
  arousalFromPlutchik,
  distressFromVA,
  shouldTriggerGrounding,
} from "@/lib/valence-arousal";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import useReflectionStore from "@/lib/state/reflection-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { getThemeColors } from "@/lib/theme";
import { useCreateEntry } from "@/lib/hooks";
import ReflectionSlider from "@/components/reflection/ReflectionSlider";
import BodyRegionMap from "@/components/reflection/BodyRegionMap";
import BreathingExercise from "@/components/reflection/BreathingExercise";
import GroundingSenses from "@/components/reflection/GroundingSenses";

type Step = "summary" | "sliders" | "body" | "grounding" | "done";

const ALL_EMOTIONS: EmotionType[] = [
  "happiness",
  "sadness",
  "anger",
  "disgust",
  "fear",
  "surprise",
  "trust",
  "anticipation",
];

export default function ReflectionScreen() {
  const insets = useSafeAreaInsets();
  const pending = useReflectionStore((s) => s.pending);
  const clearReflection = useReflectionStore((s) => s.clear);
  const createEntry = useCreateEntry();

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const reflectionMode = useSettingsStore((s) => s.emotionReflectionMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);

  const [step, setStep] = useState<Step>("summary");
  const [emotions, setEmotions] = useState<EmotionType[]>([]);
  const [valence, setValence] = useState(0);
  const [arousal, setArousal] = useState(50);
  const [bodyRegions, setBodyRegions] = useState<BodyRegionSensation[]>([]);
  const [groundingUsed, setGroundingUsed] = useState(false);
  const [selectedEmotionDef, setSelectedEmotionDef] =
    useState<EmotionType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pending) return;
    setEmotions(pending.suggestedEmotions);
    setValence(pending.initialValence);
    setArousal(pending.initialArousal);
  }, [pending]);

  useEffect(() => {
    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => handler.remove();
  }, []);

  const distress = useMemo(
    () => distressFromVA(valence, arousal),
    [valence, arousal],
  );
  const showGrounding = useMemo(
    () => shouldTriggerGrounding(distress) || distress === "moderate",
    [distress],
  );
  const effectiveSteps: Step[] = useMemo(() => {
    if (reflectionMode === "quick") return ["summary", "sliders"];
    const base: Step[] = ["summary", "sliders", "body"];
    if (showGrounding) base.push("grounding");
    return base;
  }, [reflectionMode, showGrounding]);

  const stepIdx = effectiveSteps.indexOf(step);
  const isLast = stepIdx === effectiveSteps.length - 1;

  const nextStep = useCallback(() => {
    tapHaptic();
    const next = effectiveSteps[stepIdx + 1];
    if (next) setStep(next);
    else handleSave();
  }, [stepIdx, effectiveSteps]);

  const skipStep = useCallback(() => {
    tapHaptic();
    nextStep();
  }, [nextStep]);

  const toggleEmotion = useCallback((e: EmotionType) => {
    tapHaptic();
    setEmotions((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!pending || saving) return;
    setSaving(true);
    successHaptic();
    try {
      const entry = await createEntry.mutateAsync({
        audioUri: pending.audioUri,
        transcript: pending.transcript,
        duration: pending.duration,
        conversationTopic: pending.conversationTopic,
        conversationPrompt: pending.conversationPrompt,
        reflectionOverride: {
          emotions,
          primaryEmotion: emotions[0] ?? "trust",
          valence,
          arousal,
          bodyRegions,
          groundingUsed,
          alexithymiaFlag: emotions.length === 0,
          distressLevel: distress,
        },
      });
      clearReflection();
      if (entry?.id) {
        router.replace(`/entry-detail?id=${entry.id}`);
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Failed to save reflection:", err);
      setSaving(false);
    }
  }, [
    pending,
    saving,
    emotions,
    valence,
    arousal,
    bodyRegions,
    groundingUsed,
    distress,
  ]);

  const handleDismiss = useCallback(() => {
    tapHaptic();
    clearReflection();
    router.back();
  }, []);

  if (!pending) {
    return (
      <View style={[s.container, { backgroundColor: Colors.background }]}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={s.gradient}
        />
        <View style={[s.center, { paddingTop: insets.top + 100 }]}>
          <Text style={s.white}>No pending reflection</Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={s.backBtn}
          >
            <Text style={s.white}>Go Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const topEmotions = [...emotions]
    .sort((a, b) => {
      const aScore = pending.suggestedEmotions.indexOf(a);
      const bScore = pending.suggestedEmotions.indexOf(b);
      return aScore - bScore;
    })
    .slice(0, 3);

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={s.gradient}
      />

      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={handleDismiss} style={s.headerBtn}>
          <X size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={s.headerTitle}>
          {step === "summary"
            ? "Your Emotions"
            : step === "sliders"
              ? "How it felt"
              : step === "body"
                ? "Body Scan"
                : "Grounding"}
        </Text>
        <Pressable onPress={skipStep} style={s.headerBtn}>
          <SkipForward size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      <ScrollView
        style={s.flex}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Step: Summary ── */}
        {step === "summary" && (
          <Animated.View entering={FadeIn}>
            <Text style={s.sectionLabel}>AI detected these emotions</Text>
            <View style={s.emotionGrid}>
              {ALL_EMOTIONS.map((emotion) => {
                const def = getEmotionDefinition(emotion);
                const sel = emotions.includes(emotion);
                const isTop = topEmotions.includes(emotion);
                return (
                  <Pressable
                    key={emotion}
                    onPress={() => toggleEmotion(emotion)}
                    onLongPress={() => {
                      tapHaptic();
                      setSelectedEmotionDef(
                        selectedEmotionDef === emotion ? null : emotion,
                      );
                    }}
                    style={[s.emotionChip, sel && s.emotionChipSelected]}
                  >
                    <Text style={s.emotionEmoji}>{def.emoji}</Text>
                    <Text
                      style={[s.emotionLabel, sel && s.emotionLabelSelected]}
                    >
                      {emotion}
                    </Text>
                    {sel && (
                      <View style={s.checkBadge}>
                        <Check size={10} color="#1F2937" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedEmotionDef && (
              <Animated.View entering={FadeIn} style={s.defCard}>
                <Text style={s.defEmoji}>
                  {getEmotionDefinition(selectedEmotionDef).emoji}
                </Text>
                <View style={s.defContent}>
                  <Text style={s.defTitle}>
                    {getSubLabelForIntensity(selectedEmotionDef, 50).label}
                  </Text>
                  <Text style={s.defDesc}>
                    {getSubLabelForIntensity(selectedEmotionDef, 50).definition}
                  </Text>
                  <Text style={s.defExample}>
                    "{getSubLabelForIntensity(selectedEmotionDef, 50).example}"
                  </Text>
                </View>
              </Animated.View>
            )}

            <Text style={s.hint}>
              Tap to toggle • Long-press for Plutchik definition
            </Text>

            <Pressable onPress={nextStep} style={s.nextBtn}>
              <Text style={s.nextBtnText}>Next</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={skipStep} style={s.skipBtnWrap}>
              <Text style={s.skipText}>Skip reflection</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Step: Sliders ── */}
        {step === "sliders" && (
          <Animated.View entering={FadeInUp}>
            <Text style={s.sectionLabel}>Adjust how it felt</Text>

            <View style={s.sliderCard}>
              <View style={s.sliderHeader}>
                <Text style={s.sliderTitle}>Pleasant ↔ Unpleasant</Text>
                <Text style={s.sliderValue}>
                  {valence > 0 ? "+" : ""}
                  {valence}
                </Text>
              </View>
              <ReflectionSlider
                value={valence}
                min={-100}
                max={100}
                onChange={setValence}
              />
              <View style={s.sliderLabels}>
                <Text style={s.sliderHint}>Unpleasant</Text>
                <Text style={s.sliderHint}>Pleasant</Text>
              </View>
            </View>

            <View style={[s.sliderCard, { marginTop: 20 }]}>
              <View style={s.sliderHeader}>
                <Text style={s.sliderTitle}>Calm ↔ Activated</Text>
                <Text style={s.sliderValue}>{arousal}%</Text>
              </View>
              <ReflectionSlider
                value={arousal}
                min={0}
                max={100}
                onChange={setArousal}
                positiveColor={Colors.primary}
                negativeColor="rgba(255,255,255,0.3)"
              />
              <View style={s.sliderLabels}>
                <Text style={s.sliderHint}>Calm</Text>
                <Text style={s.sliderHint}>Activated</Text>
              </View>
            </View>

            {distress !== "low" && (
              <Animated.View
                entering={FadeIn}
                style={[
                  s.distressBanner,
                  distress === "high" ? s.distressHigh : s.distressMod,
                ]}
              >
                <Text style={s.distressText}>
                  {distress === "high"
                    ? "High distress detected — grounding may help"
                    : "Moderate distress — take a moment if you need"}
                </Text>
              </Animated.View>
            )}

            <Pressable onPress={nextStep} style={s.nextBtn}>
              <Text style={s.nextBtnText}>{isLast ? "Save" : "Next"}</Text>
              {isLast ? (
                <Sparkles size={16} color="#FFFFFF" />
              ) : (
                <ChevronRight size={18} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable onPress={skipStep} style={s.skipBtnWrap}>
              <Text style={s.skipText}>Skip this step</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Step: Body Scan ── */}
        {step === "body" && (
          <Animated.View entering={FadeInUp}>
            <Text style={s.sectionLabel}>Where do you feel it?</Text>
            <Text style={s.bodySub}>Tap a region, then rate intensity 1-5</Text>
            <BodyRegionMap selected={bodyRegions} onChange={setBodyRegions} />
            <Pressable
              onPress={nextStep}
              style={[s.nextBtn, { marginTop: 28 }]}
            >
              <Text style={s.nextBtnText}>{isLast ? "Save" : "Next"}</Text>
              {isLast ? (
                <Sparkles size={16} color="#FFFFFF" />
              ) : (
                <ChevronRight size={18} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable onPress={skipStep} style={s.skipBtnWrap}>
              <Text style={s.skipText}>Skip body scan</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Step: Grounding ── */}
        {step === "grounding" && (
          <Animated.View entering={FadeInUp}>
            <Text style={s.sectionLabel}>Let's ground together</Text>
            <View style={s.groundingChoice}>
              <Pressable
                onPress={() => {
                  setGroundingUsed(true);
                  setStep("breathe" as any);
                }}
                style={s.groundingBtn}
              >
                <Text style={s.groundingEmoji}>🫁</Text>
                <Text style={s.groundingTitle}>4-7-8 Breathing</Text>
                <Text style={s.groundingDesc}>Calm your nervous system</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setGroundingUsed(true);
                  setStep("senses" as any);
                }}
                style={s.groundingBtn}
              >
                <Text style={s.groundingEmoji}>🌿</Text>
                <Text style={s.groundingTitle}>5-4-3-2-1 Senses</Text>
                <Text style={s.groundingDesc}>Return to the present</Text>
              </Pressable>
            </View>
            <Pressable onPress={nextStep} style={s.skipBtnWrap}>
              <Text style={s.skipText}>Skip grounding</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── Sub-step: Breathing (rendered as overlay within grounding) ── */}
        {step === ("breathe" as any) && (
          <BreathingExercise
            onComplete={() => {
              successHaptic();
              handleSave();
            }}
            onSkip={skipStep}
          />
        )}
        {step === ("senses" as any) && (
          <GroundingSenses
            onComplete={() => {
              successHaptic();
              handleSave();
            }}
            onSkip={skipStep}
          />
        )}
      </ScrollView>

      {saving && (
        <View style={[s.savingOverlay, { paddingTop: insets.top }]}>
          <Text style={s.savingText}>Saving...</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject, opacity: 0.9 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  white: { color: "#FFFFFF", fontSize: 16 },
  backBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { padding: 8, borderRadius: 12 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
  sectionLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  emotionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  emotionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emotionChipSelected: {
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  emotionEmoji: { fontSize: 18, marginRight: 6 },
  emotionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    textTransform: "capitalize",
  },
  emotionLabelSelected: { color: "#FFFFFF" },
  checkBadge: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  defCard: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginTop: 12,
  },
  defEmoji: { fontSize: 32, marginRight: 12 },
  defContent: { flex: 1 },
  defTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  defDesc: { fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 18 },
  defExample: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontStyle: "italic",
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 8,
    textAlign: "center",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 6,
  },
  skipBtnWrap: { alignItems: "center", paddingVertical: 12, marginTop: 8 },
  skipText: { fontSize: 14, color: "rgba(255,255,255,0.55)" },
  sliderCard: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sliderTitle: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  sliderValue: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sliderHint: { fontSize: 11, color: "rgba(255,255,255,0.4)" },
  distressBanner: {
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
  },
  distressHigh: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.35)",
  },
  distressMod: {
    backgroundColor: "rgba(234,179,8,0.15)",
    borderColor: "rgba(234,179,8,0.35)",
  },
  distressText: { fontSize: 13, color: "#FFFFFF", textAlign: "center" },
  bodySub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 20,
    marginTop: -10,
  },
  groundingChoice: { gap: 12 },
  groundingBtn: {
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  groundingEmoji: { fontSize: 36, marginBottom: 8 },
  groundingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  groundingDesc: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  savingText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
});
