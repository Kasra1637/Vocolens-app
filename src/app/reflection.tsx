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
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import {
  X,
  Check,
  CaretLeft,
  CaretRight,
  Sparkle,
  SkipForward,
} from "phosphor-react-native";
import { router } from "expo-router";
import { EmotionType, BodyRegionSensation, DistressLevel } from "@/lib/types";
import { getEmotionDefinition } from "@/lib/emotion-definitions";
import { getSubLabelForIntensity } from "@/lib/plutchik-vocabulary";
import {
  valenceFromPlutchik,
  arousalFromPlutchik,
  distressFromVA,
} from "@/lib/valence-arousal";
import { tapHaptic, successHaptic, errorHaptic } from "@/lib/haptics";
import useReflectionStore from "@/lib/state/reflection-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { getThemeColors, getThemeGradients } from "@/lib/theme";
import { useCreateEntry } from "@/lib/hooks";
import AdjustmentSliderCard from "@/components/shared/AdjustmentSliderCard";
import BodyRegionMap from "@/components/reflection/BodyRegionMap";
import { BrandedAlert } from "@/components/BrandedAlert";
import { UsageLimitError } from "@/lib/api/usage-service";
import { hexToRgba } from "@/lib/glass";

type Step = "summary" | "sliders" | "body";

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

// Plutchik-based emotion accent colors
const EMOTION_COLORS: Record<EmotionType, string> = {
  happiness: "#FBBF24",
  sadness: "#60A5FA",
  anger: "#F87171",
  disgust: "#A3E635",
  fear: "#C084FC",
  surprise: "#FB923C",
  trust: "#34D399",
  anticipation: "#FCD34D",
};

export default function ReflectionScreen() {
  const insets = useSafeAreaInsets();
  const pending = useReflectionStore((s) => s.pending);
  const clearReflection = useReflectionStore((s) => s.clear);
  const createEntry = useCreateEntry();

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const reflectionMode = useSettingsStore((s) => s.emotionReflectionMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const [step, setStep] = useState<Step>("summary");
  const [emotions, setEmotions] = useState<EmotionType[]>([]);
  const [valence, setValence] = useState(0);
  const [arousal, setArousal] = useState(50);
  const [bodyRegions, setBodyRegions] = useState<BodyRegionSensation[]>([]);
  const [selectedEmotionDef, setSelectedEmotionDef] =
    useState<EmotionType | null>(null);
  // The AI-detected emotions are presented as a read-only result by default.
  // Users only get to add/remove emotions after they explicitly say they
  // disagree — this prevents accidental taps from silently rewriting what the
  // AI found, and makes it clear that editing is a deliberate "I disagree"
  // action rather than the default interaction.
  const [emotionsEditable, setEmotionsEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  // Shown when handleSave fails. The pending reflection data is untouched on
  // failure (it's only cleared after a successful save), so closing this
  // alert simply leaves the user on the same step, free to tap Save again.
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    setEmotions(pending.suggestedEmotions);
    setValence(pending.initialValence);
    setArousal(pending.initialArousal);
    // Every new reflection starts in the read-only "agree" state; the user
    // must opt into editing again if they disagree with this entry's result.
    setEmotionsEditable(false);
  }, [pending]);

  useEffect(() => {
    const handler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => handler.remove();
  }, []);

  // Primary emotion accent color for sliders and accents
  const primaryEmotionColor = useMemo(() => {
    const top = emotions[0];
    return top ? EMOTION_COLORS[top] : "rgba(255,255,255,0.85)";
  }, [emotions]);

  const distress = useMemo(
    () => distressFromVA(valence, arousal),
    [valence, arousal],
  );
  const effectiveSteps: Step[] = useMemo(() => {
    if (reflectionMode === "quick") return ["summary", "sliders"];
    return ["summary", "sliders", "body"];
  }, [reflectionMode]);

  const stepIdx = effectiveSteps.indexOf(step);
  const isLast = stepIdx === effectiveSteps.length - 1;

  // ⚠️ handleSave is defined BEFORE nextStep so nextStep can include it in
  // its dependency array. Without this, nextStep captures a stale handleSave
  // closure with bodyRegions = [], and the user's body-region selections are
  // lost when they tap Save on the final body step.
  const handleSave = useCallback(async () => {
    if (!pending || saving) return;
    setSaving(true);
    setSaveError(null);
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
          alexithymiaFlag: emotions.length === 0,
          distressLevel: distress,
          aiTitle: pending.aiTitle,
          // Forward the full AI analysis so createJournalEntry preserves it
          emotionScores: pending.emotionScores,
          emotionIntensityLabels: pending.emotionIntensityLabels,
          topics: pending.topics,
          aiAnalysis: pending.aiAnalysis,
          aiReflection: pending.aiReflection,
          aiTopThreeEmotions: pending.aiTopThreeEmotions,
          aiBlendedEmotions: pending.aiBlendedEmotions,
          aiAmbivalenceFlags: pending.aiAmbivalenceFlags,
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
      errorHaptic();
      // pending is untouched here — nothing is cleared on failure — so the
      // user can dismiss this and simply tap Save again to retry.
      setSaveError(
        err instanceof UsageLimitError
          ? err.message
          : "We couldn't save your entry. Please check your connection and try again.",
      );
      setSaving(false);
    }
  }, [
    pending,
    saving,
    emotions,
    valence,
    arousal,
    bodyRegions,
    distress,
  ]);

  const nextStep = useCallback(() => {
    tapHaptic();
    const next = effectiveSteps[stepIdx + 1];
    if (next) setStep(next);
    else handleSave();
  }, [stepIdx, effectiveSteps, handleSave]);

  // Back navigation. Previously this screen was forward-only — once you left
  // the emotion grid you could not return to fix a selection, which made a
  // mis-tap unrecoverable without discarding the whole recording.
  const prevStep = useCallback(() => {
    tapHaptic();
    const prev = effectiveSteps[stepIdx - 1];
    if (prev) setStep(prev);
  }, [stepIdx, effectiveSteps]);

  // Jump straight to a step from the progress dots. Every step is optional
  // (each has a Skip), so no target is ever an invalid state — jumping
  // forward is equivalent to skipping the steps in between.
  const goToStep = useCallback((target: Step) => {
    tapHaptic();
    setStep(target);
  }, []);

  const skipStep = useCallback(() => {
    tapHaptic();
    nextStep();
  }, [nextStep]);

  /**
   * The AI's confidence score (0–100) for an emotion, from the analysis that
   * produced this pending reflection.
   *
   * Surfaced on the summary step so "AI detected these emotions" is backed by
   * visible evidence — previously the grid pre-selected some chips but gave no
   * indication of how strongly each was detected, so the user had no basis to
   * judge whether to agree.
   */
  const aiScoreFor = useCallback(
    (emotion: EmotionType): number => {
      const raw = pending?.emotionScores?.[emotion];
      const n = typeof raw === "number" ? raw : 0;
      return Math.max(0, Math.min(100, Math.round(n)));
    },
    [pending],
  );

  const toggleEmotion = useCallback((e: EmotionType) => {
    tapHaptic();
    setEmotions((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }, []);

  const handleDismiss = useCallback(() => {
    tapHaptic();
    clearReflection();
    router.back();
  }, []);

  if (!pending) {
    return (
      <View style={[s.container, { backgroundColor: Colors.background }]}>
        <LinearGradient
          colors={Gradients.background}
          style={s.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={[s.center, { paddingTop: insets.top + 100 }]}>
          <Text style={s.white}>No pending reflection</Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={[
              s.backBtn,
              { backgroundColor: hexToRgba(Colors.primary, 0.12) },
            ]}
          >
            <Text style={s.white}>Go home</Text>
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
        colors={Gradients.background}
        style={s.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header — back/dismiss on the left, skip on the right.
          On the first step the left control dismisses (discarding the
          recording); on later steps it goes back a step instead, matching the
          Refine Analysis modal's pattern so both correction surfaces navigate
          the same way. Discarding from a later step is still possible by
          stepping back to the first step — and requiring that extra tap is a
          feature, since discarding throws away a finished recording. */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={stepIdx > 0 ? prevStep : handleDismiss}
          accessibilityLabel={stepIdx > 0 ? "Go back a step" : "Discard reflection"}
          style={[
            s.headerBtn,
            { backgroundColor: hexToRgba(Colors.primary, 0.1) },
          ]}
        >
          {stepIdx > 0 ? (
            <CaretLeft size={22} color="rgba(255,255,255,0.75)" />
          ) : (
            <X size={22} color="rgba(255,255,255,0.75)" />
          )}
        </Pressable>
        <Pressable
          onPress={skipStep}
          accessibilityLabel="Skip this step"
          style={[
            s.headerBtn,
            { backgroundColor: hexToRgba(Colors.primary, 0.1) },
          ]}
        >
          <SkipForward size={18} color="rgba(255,255,255,0.55)" />
        </Pressable>
      </View>

      {/* Step progress — tappable, so the dots double as navigation.
          This screen previously gave no indication of how many steps remained
          (it varies: 2 in "quick" mode, 3 in "full"). */}
      <View style={s.dotsRow}>
        {effectiveSteps.map((stepName, i) => {
          const isCurrent = stepName === step;
          return (
            <Pressable
              key={stepName}
              onPress={() => goToStep(stepName)}
              hitSlop={10}
              accessibilityLabel={`Go to step ${i + 1} of ${effectiveSteps.length}`}
            >
              <View
                style={[
                  s.dot,
                  isCurrent && s.dotActive,
                  // Steps already visited read as "done" rather than pending,
                  // so progress is legible at a glance.
                  !isCurrent && i < stepIdx && s.dotVisited,
                ]}
              />
            </Pressable>
          );
        })}
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
            <View style={[s.emotionGrid, { overflow: "hidden" }]}>
              {/* Fixed order, deliberately NOT sorted by score — a stable
                  layout every time is worth more to this audience than
                  ranking, and matches the "same order every time" promise the
                  rest of the reflection flow makes. The AI's confidence is
                  conveyed by the bar inside each chip instead. */}
              {ALL_EMOTIONS.map((emotion) => {
                const def = getEmotionDefinition(emotion);
                const sel = emotions.includes(emotion);
                const accentColor = EMOTION_COLORS[emotion];
                const aiScore = aiScoreFor(emotion);
                return (
                  <Pressable
                    key={emotion}
                    // Read-only until the user opts into editing. Tapping a
                    // chip only toggles selection once they've said they
                    // disagree; before that, taps do nothing so the AI result
                    // can't be changed by accident.
                    onPress={
                      emotionsEditable
                        ? () => toggleEmotion(emotion)
                        : undefined
                    }
                    // Long-press for the Plutchik definition stays available in
                    // both modes — reading about an emotion never mutates the
                    // selection.
                    onLongPress={() => {
                      tapHaptic();
                      setSelectedEmotionDef(
                        selectedEmotionDef === emotion ? null : emotion,
                      );
                    }}
                    accessibilityLabel={
                      aiScore > 0
                        ? `${emotion}, AI confidence ${aiScore} percent${sel ? ", selected" : ""}${emotionsEditable ? ", tap to toggle" : ""}`
                        : `${emotion}${sel ? ", selected" : ""}${emotionsEditable ? ", tap to toggle" : ""}`
                    }
                    style={[
                      s.emotionChip,
                      sel && {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}22`,
                      },
                      // In read-only mode, fade the unselected chips so the
                      // detected ones read clearly as "the result" and the
                      // grid doesn't look like a set of live buttons.
                      !emotionsEditable && !sel && { opacity: 0.45 },
                    ]}
                  >
                    <Text style={s.emotionEmoji}>{def.emoji}</Text>
                    <Text style={[s.emotionLabel, sel && { color: "#FFFFFF" }]}>
                      {emotion}
                    </Text>

                    {/* AI confidence for this emotion. Rendered only when the
                        AI actually detected it, so undetected emotions stay
                        visually quiet rather than showing an empty track. */}
                    {aiScore > 0 && (
                      <View style={s.scoreTrack}>
                        <View
                          style={[
                            s.scoreFill,
                            {
                              width: `${aiScore}%`,
                              backgroundColor: sel
                                ? accentColor
                                : "rgba(255,255,255,0.45)",
                            },
                          ]}
                        />
                      </View>
                    )}

                    {sel && (
                      <View
                        style={[s.checkBadge, { backgroundColor: accentColor }]}
                      >
                        <Check size={10} color="#1F2937" weight="regular" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedEmotionDef && (
              <Animated.View
                entering={FadeIn}
                style={[
                  s.defCard,
                  {
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  },
                ]}
              >
                <Text style={s.defEmoji}>
                  {getEmotionDefinition(selectedEmotionDef).emoji}
                </Text>
                {/* Uses this entry's ACTUAL detected intensity, so the
                    Plutchik rung shown matches what the AI found (e.g.
                    "Ecstasy" at 85, not always the mid-range "Joy"). Falls
                    back to the midpoint for an emotion the AI didn't detect,
                    since a 0 score would render the faintest rung and read as
                    misleading for one the user is adding themselves. */}
                {(() => {
                  const detected = aiScoreFor(selectedEmotionDef);
                  const intensity = detected > 0 ? detected : 50;
                  const sub = getSubLabelForIntensity(selectedEmotionDef, intensity);
                  return (
                    <View style={s.defContent}>
                      <Text style={s.defTitle}>{sub.label}</Text>
                      <Text style={s.defDesc}>{sub.definition}</Text>
                      <Text style={s.defExample}>"{sub.example}"</Text>
                    </View>
                  );
                })()}
              </Animated.View>
            )}

            {/* Editing gate. By default the grid above is a read-only result;
                the user taps "I disagree" to unlock it, then taps chips to
                add/remove emotions so their final decision is what gets saved.
                They can lock it back to "agree" if they change their mind. */}
            {!emotionsEditable ? (
              <>
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setEmotionsEditable(true);
                  }}
                  accessibilityLabel="I disagree — edit the detected emotions"
                  style={s.disagreeBtn}
                >
                  <Sparkle size={16} color="rgba(255,255,255,0.85)" />
                  <Text style={s.disagreeBtnText}>
                    Not quite right? Tap to edit
                  </Text>
                </Pressable>
                <Text style={s.hint}>
                  These are the emotions the AI detected · Long-press any for
                  its Plutchik definition
                </Text>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setEmotionsEditable(false);
                  }}
                  accessibilityLabel="Done editing — keep these emotions"
                  style={s.disagreeBtn}
                >
                  <Check size={16} color="rgba(255,255,255,0.85)" />
                  <Text style={s.disagreeBtnText}>Done editing</Text>
                </Pressable>
                <Text style={s.hint}>
                  Tap emotions to add or remove them · Long-press for the
                  Plutchik definition
                </Text>
              </>
            )}

            <Pressable
              onPress={nextStep}
              style={[
                s.nextBtn,
                {
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderColor: "rgba(255, 255, 255, 0.20)",
                },
              ]}
            >
              <Text style={s.nextBtnText}>Next</Text>
              <CaretRight size={18} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        )}

        {/* ── Step: Sliders ── */}
        {step === "sliders" && (
          <Animated.View entering={FadeInUp}>
            <Text style={s.sectionLabel}>Adjust how it felt</Text>

            {/* Both adjustment cards come from the shared component, so this
                screen and the post-save Refine Analysis modal are identical in
                design, spacing and behaviour. The label order matches the axis
                labels (Unpleasant low / Pleasant high) — it previously read
                "Pleasant ↔ Unpleasant", contradicting its own slider. */}
            <AdjustmentSliderCard
              label="Unpleasant ↔ Pleasant"
              value={valence}
              min={-100}
              max={100}
              onChange={setValence}
              formatValue={(v) => `${v > 0 ? "+" : ""}${v}`}
              minLabel="Unpleasant"
              maxLabel="Pleasant"
            />

            <AdjustmentSliderCard
              style={{ marginTop: 16 }}
              label="Calm ↔ Activated"
              value={arousal}
              min={0}
              max={100}
              onChange={setArousal}
              formatValue={(v) => `${v}%`}
              minLabel="Calm"
              maxLabel="Activated"
            />

            {distress !== "low" && (
              <Animated.View
                entering={FadeIn}
                style={[
                  s.distressBanner,
                  {
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  },
                ]}
              >
                <Text style={s.distressText}>
                  {distress === "high"
                    ? "⚠️  High distress detected — take a moment if you need"
                    : "🌿  Moderate distress — take a moment if you need"}
                </Text>
              </Animated.View>
            )}

            <Pressable
              onPress={nextStep}
              style={[
                s.nextBtn,
                {
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderColor: "rgba(255, 255, 255, 0.20)",
                },
              ]}
            >
              <Text style={s.nextBtnText}>{isLast ? "Save" : "Next"}</Text>
              {isLast ? (
                <Sparkle size={16} color="#FFFFFF" />
              ) : (
                <CaretRight size={18} color="#FFFFFF" />
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
            <Text style={s.bodySub}>Tap the regions where you feel this emotion</Text>
            <BodyRegionMap selected={bodyRegions} onChange={setBodyRegions} />
            <Pressable
              onPress={nextStep}
              style={[
                s.nextBtn,
                {
                  marginTop: 28,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderColor: "rgba(255, 255, 255, 0.20)",
                },
              ]}
            >
              <Text style={s.nextBtnText}>{isLast ? "Save" : "Next"}</Text>
              {isLast ? (
                <Sparkle size={16} color="#FFFFFF" />
              ) : (
                <CaretRight size={18} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable onPress={skipStep} style={s.skipBtnWrap}>
              <Text style={s.skipText}>Skip body scan</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {saving && (
        <View style={[s.savingOverlay, { paddingTop: insets.top }]}>
          <Text style={s.savingText}>Saving...</Text>
        </View>
      )}

      {/* Entry save failed — pending reflection data is intact, so retrying
          (tap Save again) works. This just makes the failure visible. */}
      <BrandedAlert
        visible={saveError !== null}
        type="error"
        title="Couldn't save entry"
        message={saveError ?? ""}
        onClose={() => setSaveError(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  gradient: { ...StyleSheet.absoluteFillObject },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  white: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  backBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    padding: 10,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 4,
    paddingBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },
  dotVisited: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  scoreTrack: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginTop: 6,
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 22,
    fontFamily: "Fraunces_700Bold",
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 72,
  },
  emotionEmoji: { fontSize: 22, marginBottom: 5 },
  emotionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.65)",
    textTransform: "capitalize",
    textAlign: "center",
  },
  checkBadge: {
    marginTop: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  defCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    marginTop: 12,
  },
  defEmoji: { fontSize: 32, marginRight: 12 },
  defContent: { flex: 1 },
  defTitle: {
    fontSize: 16,
    fontFamily: "Fraunces_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  defDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },
  defExample: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    fontStyle: "italic",
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    marginTop: 8,
    textAlign: "center",
  },
  disagreeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  disagreeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    paddingVertical: 16,
    marginTop: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    marginRight: 6,
  },
  skipBtnWrap: { alignItems: "center", paddingVertical: 12, marginTop: 8 },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  // Slider card styles removed — the adjustment cards now come from the shared
  // AdjustmentSliderCard component, which owns that styling so this screen and
  // the Refine Analysis modal cannot drift apart again.
  distressBanner: {
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
  },
  distressText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 20,
  },
  bodySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 20,
    marginTop: -8,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  savingText: {
    fontSize: 18,
    fontFamily: "Fraunces_700Bold",
    color: "#FFFFFF",
  },
});
