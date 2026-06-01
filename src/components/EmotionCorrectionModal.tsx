/**
 * EmotionCorrectionModal — Post-Analysis Feedback UI
 *
 * Three-step flow:
 *  "initial"  → "Does this feel right?"   — AI result + sliders + confirm/adjust
 *  "replace"  → "What fits better?"       — emotion picker grid
 *  "explain"  → "Anything to add?"        — optional reason + save
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  Check,
  X,
  ChevronLeft,
  Brain,
  Tag,
  Sliders,
  MessageSquare,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmotionType, DistressLevel } from "@/lib/types";
import { getEmotionDefinition } from "@/lib/emotion-definitions";
import { useEmotionCorrectionStore, CorrectionType } from "@/lib/state/emotion-correction-store";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { getThemeColors, getThemeGradients, BorderRadius } from "@/lib/theme";
import { hexToRgba } from "@/lib/glass";


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

type CorrectionMode = "text" | "slider";

// ── Shared glass card style ───────────────────────────────────────────────────
const glassCard = {
  backgroundColor: "rgba(255, 255, 255, 0.12)",
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.20)",
  borderRadius: BorderRadius.xlarge,
  overflow: "hidden" as const,
};

// ── Mini progress bar ─────────────────────────────────────────────────────────
function MiniBar({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  const pct = signed
    ? Math.abs(value)
    : value;
  const displayVal = signed ? (value > 0 ? `+${value}` : `${value}`) : `${value}%`;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
        <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          {label}
        </Text>
        <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFFFFF" }}>
          {displayVal}
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: 3,
            ...(signed && value < 0 ? { marginLeft: `${100 - Math.abs(value)}%` } : {}),
          }}
        />
      </View>
    </View>
  );
}


// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  entryId: string;
  aiEmotion: EmotionType;
  aiValence: number;
  aiArousal: number;
  aiDistress: DistressLevel;
  onDismiss: () => void;
  onSubmit: (correction: {
    userConfirmedAI: boolean;
    userEditedEmotion?: EmotionType;
    userEditedValence?: number;
    userEditedArousal?: number;
    userCorrectionMode?: CorrectionMode;
    userCorrectionReason?: string;
    correctionTimestamp: string;
  }) => void;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EmotionCorrectionModal({
  visible,
  entryId,
  aiEmotion,
  aiValence,
  aiArousal,
  aiDistress,
  onDismiss,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"initial" | "replace" | "explain">("initial");
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [valence, setValence] = useState(aiValence);
  const [arousal, setArousal] = useState(aiArousal);
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>("slider");
  const [reason, setReason] = useState("");
  const [correctionType, setCorrectionType] = useState<CorrectionType>("intensity");

  const { recordCorrection, recordConfirmation } = useEmotionCorrectionStore();
  const selectedTheme = useOnboardingStore((s: any) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s: any) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const aiDef = getEmotionDefinition(aiEmotion);


  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(() => {
    successHaptic();
    recordConfirmation(entryId, aiEmotion, aiValence, aiArousal);
    onSubmit({ userConfirmedAI: true, correctionTimestamp: new Date().toISOString() });
  }, [entryId, aiEmotion, aiValence, aiArousal, recordConfirmation, onSubmit]);

  const handleReject = useCallback(() => {
    tapHaptic();
    setCorrectionType("label");
    setStep("replace");
  }, []);

  const handleSelectReplacement = useCallback((emotion: EmotionType) => {
    tapHaptic();
    setSelectedEmotion(emotion);
    setStep("explain");
  }, []);

  const handleSaveSliders = useCallback(() => {
    tapHaptic();
    recordCorrection({
      entryId,
      timestamp: new Date().toISOString(),
      aiEmotion,
      userEmotion: aiEmotion,
      aiValence,
      userValence: valence,
      aiArousal,
      userArousal: arousal,
      reason: undefined,
      correctionMode: "slider",
      correctionType: "intensity",
    });
    onSubmit({
      userConfirmedAI: false,
      userEditedEmotion: aiEmotion,
      userEditedValence: valence,
      userEditedArousal: arousal,
      userCorrectionMode: "slider",
      correctionTimestamp: new Date().toISOString(),
    });
  }, [entryId, aiEmotion, aiValence, valence, aiArousal, arousal, recordCorrection, onSubmit]);

  const handleSubmitWithReason = useCallback(() => {
    successHaptic();
    recordCorrection({
      entryId,
      timestamp: new Date().toISOString(),
      aiEmotion,
      userEmotion: selectedEmotion ?? aiEmotion,
      aiValence,
      userValence: valence,
      aiArousal,
      userArousal: arousal,
      reason: reason.trim() || undefined,
      correctionMode,
      correctionType,
    });
    onSubmit({
      userConfirmedAI: false,
      userEditedEmotion: selectedEmotion ?? aiEmotion,
      userEditedValence: valence,
      userEditedArousal: arousal,
      userCorrectionMode: correctionMode,
      userCorrectionReason: reason.trim() || undefined,
      correctionTimestamp: new Date().toISOString(),
    });
  }, [entryId, aiEmotion, selectedEmotion, aiValence, valence, aiArousal, arousal, reason, correctionMode, correctionType, recordCorrection, onSubmit]);


  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
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
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255, 255, 255, 0.12)",
          }}
        >
          {/* Back / Close button */}
          {step !== "initial" ? (
            <Pressable
              onPress={() => setStep(step === "explain" ? "replace" : "initial")}
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
          ) : (
            <Pressable
              onPress={onDismiss}
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
              <X size={20} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          )}

          <Text
            style={{
              fontFamily: "Fraunces_700Bold",
              fontSize: 18,
              color: "#FFFFFF",
              textAlign: "center",
              flex: 1,
              marginHorizontal: 12,
            }}
          >
            {step === "initial"
              ? "Does this feel right?"
              : step === "replace"
                ? "What fits better?"
                : "Anything to add?"}
          </Text>

          {/* Right spacer */}
          <View style={{ width: 36 }} />
        </View>


        {/* ── Step progress dots ── */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingTop: 14 }}>
          {(["initial", "replace", "explain"] as const).map((s) => (
            <View
              key={s}
              style={{
                width: step === s ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: step === s
                  ? "#FFFFFF"
                  : "rgba(255, 255, 255, 0.25)",
              }}
            />
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ═══════════════════════════════════════════════════════════════
              STEP: initial — AI result card + adjustment sliders
          ═══════════════════════════════════════════════════════════════ */}
          {step === "initial" && (
            <Animated.View entering={FadeIn.duration(300)}>

              {/* AI emotion card */}
              <View style={{ ...glassCard, marginBottom: 20 }}>
                <View style={{ padding: 18 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Text style={{ fontSize: 26 }}>{aiDef.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          fontSize: 20,
                          color: "#FFFFFF",
                          textTransform: "capitalize",
                        }}
                        numberOfLines={1}
                      >
                        {aiEmotion}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.70)",
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {aiDef.plainLanguage}
                      </Text>
                    </View>
                  </View>

                  {/* Valence + Arousal read-only bars */}
                  <MiniBar label="Valence" value={aiValence} signed />
                  <MiniBar label="Arousal" value={aiArousal} />
                </View>
              </View>


              {/* Slider adjustment card */}
              <View style={{ ...glassCard, marginBottom: 4 }}>
                <View style={{ padding: 18 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.70)",
                      marginBottom: 16,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Fine-tune if needed
                  </Text>

                  {/* Valence slider */}
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#FFFFFF" }}>
                        Unpleasant ↔ Pleasant
                      </Text>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                        {valence > 0 ? `+${valence}` : `${valence}`}
                      </Text>
                    </View>
                    <GlassSlider value={valence} min={-100} max={100} onChange={setValence} />
                  </View>

                  {/* Arousal slider */}
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#FFFFFF" }}>
                        Calm ↔ Activated
                      </Text>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                        {arousal}%
                      </Text>
                    </View>
                    <GlassSlider value={arousal} min={0} max={100} onChange={setArousal} />
                  </View>
                </View>
              </View>

            </Animated.View>
          )}


          {/* ═══════════════════════════════════════════════════════════════
              STEP: replace — emotion picker grid
          ═══════════════════════════════════════════════════════════════ */}
          {step === "replace" && (
            <Animated.View entering={FadeInDown.duration(300)}>

              {/* Current AI emotion chip — for reference */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                  borderRadius: BorderRadius.large,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  marginBottom: 20,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ fontSize: 16, marginRight: 8 }}>{aiDef.emoji}</Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
                  AI detected:{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", textTransform: "capitalize" }}>
                    {aiEmotion}
                  </Text>
                </Text>
              </View>

              {/* Emotion grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 }}>
                {ALL_EMOTIONS.map((emotion) => {
                  const def = getEmotionDefinition(emotion);
                  const isAI = emotion === aiEmotion;
                  return (
                    <Pressable
                      key={emotion}
                      onPress={() => handleSelectReplacement(emotion)}
                      style={{
                        backgroundColor: isAI
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(255, 255, 255, 0.12)",
                        borderWidth: 2,
                        borderColor: isAI
                          ? "rgba(255, 255, 255, 0.12)"
                          : "rgba(255, 255, 255, 0.20)",
                        borderRadius: BorderRadius.round,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        opacity: isAI ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 7 }}>{def.emoji}</Text>
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 14,
                          color: "#FFFFFF",
                          textTransform: "capitalize",
                        }}
                      >
                        {emotion}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

            </Animated.View>
          )}


          {/* ═══════════════════════════════════════════════════════════════
              STEP: explain — optional reason + correction type
          ═══════════════════════════════════════════════════════════════ */}
          {step === "explain" && (
            <Animated.View entering={FadeInDown.duration(300)}>

              {/* Selected emotion confirmation */}
              {selectedEmotion && (
                <View style={{ ...glassCard, marginBottom: 20 }}>
                  <View style={{ padding: 16, flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>
                        {getEmotionDefinition(selectedEmotion).emoji}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.60)", marginBottom: 2 }}>
                        You selected
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          fontSize: 18,
                          color: "#FFFFFF",
                          textTransform: "capitalize",
                        }}
                      >
                        {selectedEmotion}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Correction type chips */}
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 12,
                  color: "rgba(255,255,255,0.60)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                What kind of change?
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                <ReasonChip
                  label="Wrong label"
                  icon={<Tag size={13} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionType === "label"}
                  onPress={() => { tapHaptic(); setCorrectionType("label"); }}
                  primaryColor={Colors.primary}
                />
                <ReasonChip
                  label="Wrong intensity"
                  icon={<Sliders size={13} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionType === "intensity"}
                  onPress={() => { tapHaptic(); setCorrectionType("intensity"); }}
                  primaryColor={Colors.primary}
                />
                <ReasonChip
                  label="Context"
                  icon={<MessageSquare size={13} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionType === "context"}
                  onPress={() => { tapHaptic(); setCorrectionType("context"); }}
                  primaryColor={Colors.primary}
                />
              </View>

              {/* Quick note toggle */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <ReasonChip
                  label="Add a note"
                  icon={<Brain size={14} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionMode === "text"}
                  onPress={() => { tapHaptic(); setCorrectionMode(correctionMode === "text" ? "slider" : "text"); }}
                  primaryColor={Colors.primary}
                />
              </View>

              {correctionMode === "text" && (
                <Animated.View entering={FadeIn.delay(80)} style={{ marginBottom: 16 }}>
                  <TextInput
                    multiline
                    placeholder="What made you feel this way? (optional)"
                    placeholderTextColor="rgba(255,255,255,0.40)"
                    value={reason}
                    onChangeText={setReason}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderRadius: BorderRadius.large,
                      padding: 14,
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      color: "#FFFFFF",
                      minHeight: 90,
                      textAlignVertical: "top",
                      borderWidth: 2,
                      borderColor: "rgba(255, 255, 255, 0.20)",
                    }}
                  />
                </Animated.View>
              )}

            </Animated.View>
          )}

        </ScrollView>


        {/* ── Bottom action bar ── */}
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderTopWidth: 1,
            borderTopColor: "rgba(255, 255, 255, 0.12)",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >

          {/* ── initial: Adjust sliders | Not quite (label) | Confirm ── */}
          {step === "initial" && (
            <View style={{ gap: 10 }}>
              {/* Primary confirm button */}
              <Pressable
                onPress={handleConfirm}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.22)",
                  borderRadius: BorderRadius.large,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.40)",
                }}
              >
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: "#FFFFFF" }}>
                  Yes, that's right
                </Text>
              </Pressable>

              {/* Secondary row */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={handleSaveSliders}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderRadius: BorderRadius.large,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  }}
                >
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF" }}>
                    Save adjusted
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleReject}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderRadius: BorderRadius.large,
                    paddingVertical: 14,
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  }}
                >
                  <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFFFFF" }}>
                    Change label
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── replace: no action bar needed — tapping a chip advances ── */}
          {/* (empty — selection happens inline via the grid) */}

          {/* ── explain: Skip | Save correction ── */}
          {step === "explain" && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
                  recordCorrection({
                    entryId,
                    timestamp: new Date().toISOString(),
                    aiEmotion,
                    userEmotion: selectedEmotion ?? aiEmotion,
                    aiValence,
                    userValence: valence,
                    aiArousal,
                    userArousal: arousal,
                    reason: undefined,
                    correctionMode,
                    correctionType,
                  });
                  onSubmit({
                    userConfirmedAI: false,
                    userEditedEmotion: selectedEmotion ?? aiEmotion,
                    userEditedValence: valence,
                    userEditedArousal: arousal,
                    userCorrectionMode: correctionMode,
                    correctionTimestamp: new Date().toISOString(),
                  });
                }}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  borderRadius: BorderRadius.large,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.20)",
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFFFFF" }}>
                  Skip
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitWithReason}
                style={{
                  flex: 2,
                  backgroundColor: "rgba(255, 255, 255, 0.22)",
                  borderWidth: 2,
                  borderColor: "rgba(255, 255, 255, 0.40)",
                  borderRadius: BorderRadius.large,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 15, color: "#FFFFFF" }}>
                  Save correction
                </Text>
              </Pressable>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}



// ── GlassSlider — layout-aware PanResponder drag ─────────────────────────────
// Uses onLayout to measure the actual rendered track width so it never overflows.

function GlassSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(240);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const toPixel = (v: number) => ((v - min) / (max - min)) * trackWidth;
  const toValue = (px: number) =>
    Math.round(min + (clamp(px, 0, trackWidth) / trackWidth) * (max - min));

  const thumbPx = useRef(toPixel(value));
  const lastHapticVal = useRef(value);
  const [displayVal, setDisplayVal] = useState(value);

  // Resync thumb when track width becomes known after layout
  useEffect(() => {
    thumbPx.current = toPixel(value);
    setDisplayVal(value);
  }, [trackWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt: any) => {
        const tapX = clamp(evt.nativeEvent.locationX, 0, trackWidth);
        thumbPx.current = tapX;
        const newVal = toValue(tapX);
        lastHapticVal.current = newVal;
        setDisplayVal(newVal);
        onChange(newVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_: any, gs: any) => {
        const rawPx = clamp(thumbPx.current + gs.dx, 0, trackWidth);
        const newVal = toValue(rawPx);
        setDisplayVal(newVal);
        onChange(newVal);
        if (Math.abs(newVal - lastHapticVal.current) >= 5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastHapticVal.current = newVal;
        }
      },
      onPanResponderRelease: (_: any, gs: any) => {
        const finalPx = clamp(thumbPx.current + gs.dx, 0, trackWidth);
        thumbPx.current = finalPx;
        const finalVal = toValue(finalPx);
        setDisplayVal(finalVal);
        onChange(finalVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  const normalized = clamp((displayVal - min) / (max - min), 0, 1);
  const THUMB = 28;
  const thumbLeft = normalized * trackWidth - THUMB / 2;

  return (
    <View onLayout={handleLayout} style={{ width: "100%" }}>
      <View
        {...panResponder.panHandlers}
        style={{ height: 44, justifyContent: "center" }}
      >
        {/* Track */}
        <View
          style={{
            height: 8,
            backgroundColor: "rgba(255,255,255,0.15)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${normalized * 100}%`,
              height: "100%",
              backgroundColor: "#FFFFFF",
              opacity: 0.85,
              borderRadius: 4,
            }}
          />
        </View>

        {/* Thumb */}
        <View
          style={{
            position: "absolute",
            left: Math.max(0, Math.min(thumbLeft, trackWidth - THUMB)),
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: "#FFFFFF",
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.6)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.30,
            shadowRadius: 6,
            elevation: 6,
          }}
        />
      </View>
    </View>
  );
}





// ── ReasonChip ────────────────────────────────────────────────────────────────
function ReasonChip({
  label,
  icon,
  active,
  onPress,
  primaryColor,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  primaryColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: BorderRadius.round,
        backgroundColor: active
          ? hexToRgba(primaryColor, 0.22)
          : "rgba(255,255,255,0.08)",
        borderWidth: 2,
        borderColor: active
          ? hexToRgba(primaryColor, 0.40)
          : "rgba(255, 255, 255, 0.15)",
      }}
    >
      {icon}
      <Text
        style={{
          fontFamily: "Inter_500Medium",
          color: "#FFFFFF",
          marginLeft: 6,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
