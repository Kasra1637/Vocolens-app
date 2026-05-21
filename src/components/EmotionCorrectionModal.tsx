/**
 * EmotionCorrectionModal — Post-Analysis Feedback UI (Glassmorphic Rebuild)
 *
 * Appears on the entry detail screen. Lets the user confirm or correct
 * the AI's emotion analysis. Full glassmorphic design matching the app theme.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInUp,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import {
  Mic,
  Check,
  X,
  Brain,
} from "lucide-react-native";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmotionType, DistressLevel } from "@/lib/types";
import { EMOTION_EMOJIS } from "@/lib/types";
import { getEmotionDefinition } from "@/lib/emotion-definitions";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import { tapHaptic, successHaptic } from "@/lib/haptics";
import { transcribeAudioFile } from "@/lib/deepgram-transcription-service";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { getThemeColors, getThemeGradients } from "@/lib/theme";
import { hexToRgba, GlassLayers } from "@/lib/glass";

const { width: SCREEN_W } = Dimensions.get("window");
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

type CorrectionMode = "voice" | "text" | "slider";


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
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const voiceRecordingRef = useRef<Audio.Recording | null>(null);

  const { recordCorrection, recordConfirmation } = useEmotionCorrectionStore();
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);

  const handleConfirm = useCallback(() => {
    successHaptic();
    recordConfirmation(entryId, aiEmotion, aiValence, aiArousal);
    onSubmit({ userConfirmedAI: true, correctionTimestamp: new Date().toISOString() });
  }, [entryId, aiEmotion, aiValence, aiArousal, recordConfirmation, onSubmit]);

  const handleReject = useCallback(() => {
    tapHaptic();
    setStep("replace");
  }, []);

  const handleSelectReplacement = useCallback((emotion: EmotionType) => {
    tapHaptic();
    setSelectedEmotion(emotion);
    setStep("explain");
  }, []);

  const handleSliderAdjustment = useCallback(() => {
    tapHaptic();
    setCorrectionMode("slider");
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


  const handleVoiceReason = useCallback(() => {
    setCorrectionMode("voice");
    setVoiceTranscript("");
  }, []);

  const startVoiceRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      voiceRecordingRef.current = recording;
      setIsRecordingVoice(true);
      tapHaptic();
    } catch (err) {
      console.warn("Voice reason recording failed:", err);
    }
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    try {
      setIsRecordingVoice(false);
      const recording = voiceRecordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      voiceRecordingRef.current = null;
      if (!uri) return;
      setIsTranscribingVoice(true);
      const result = await transcribeAudioFile(uri);
      setIsTranscribingVoice(false);
      if (result.transcript && result.transcript.trim().length > 0) {
        setVoiceTranscript(result.transcript);
        setReason(result.transcript);
      }
    } catch (err) {
      console.warn("Voice reason transcription failed:", err);
      setIsTranscribingVoice(false);
    }
  }, []);

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
  }, [entryId, aiEmotion, selectedEmotion, aiValence, valence, aiArousal, arousal, reason, correctionMode, recordCorrection, onSubmit]);

  const aiDef = getEmotionDefinition(aiEmotion);

  // ── Glassmorphic card style — matches Insights screen cards exactly ─────────
  const glassCard = {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: hexToRgba(Colors.primary, 0.15),
    borderRadius: 20,
    overflow: "hidden" as const,
  };


  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      {/* Full-screen theme gradient background */}
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
            paddingTop: insets.top + 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: hexToRgba(Colors.primary, 0.12),
          }}
        >
          <Pressable
            onPress={onDismiss}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: hexToRgba(Colors.primary, 0.15),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
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
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >


          {/* ── Step: initial — AI result summary ── */}
          {step === "initial" && (
            <Animated.View entering={FadeIn}>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                AI detected
              </Text>
              <View style={{ ...glassCard, marginBottom: 24 }}>
                <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
                <View style={{ padding: 18 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 40, marginRight: 14 }}>{aiDef.emoji}</Text>
                    <View>
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          fontSize: 22,
                          color: "#FFFFFF",
                          textTransform: "capitalize",
                        }}
                      >
                        {aiEmotion}
                      </Text>
                      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                        {aiDef.plainLanguage}
                      </Text>
                    </View>
                  </View>
                  {/* Mini valence bar */}
                  <View style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Valence</Text>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFFFFF" }}>
                        {aiValence > 0 ? `+${aiValence}` : aiValence}
                      </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                      <View
                        style={{
                          width: `${Math.abs(aiValence)}%`,
                          height: "100%",
                          backgroundColor: "#FFFFFF",
                          borderRadius: 3,
                          marginLeft: aiValence < 0 ? `${100 - Math.abs(aiValence)}%` : 0,
                        }}
                      />
                    </View>
                  </View>
                  {/* Mini arousal bar */}
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Arousal</Text>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFFFFF" }}>{aiArousal}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                      <View style={{ width: `${aiArousal}%`, height: "100%", backgroundColor: "#FFFFFF", borderRadius: 3 }} />
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}


          {/* ── Step: replace — pick new emotion ── */}
          {step === "replace" && (
            <Animated.View entering={FadeInDown.delay(80)}>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 16,
                  lineHeight: 22,
                }}
              >
                No worries — emotions can be hard to pin down. Which label feels more like what you were actually feeling?
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                {ALL_EMOTIONS.map((emotion) => {
                  const def = getEmotionDefinition(emotion);
                  return (
                    <Pressable
                      key={emotion}
                      onPress={() => handleSelectReplacement(emotion)}
                      style={{
                        backgroundColor: "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        borderColor: hexToRgba(Colors.primary, 0.15),
                        borderRadius: 24,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        flexDirection: "row",
                        alignItems: "center",
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
              <Pressable onPress={() => setStep("initial")} style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: "rgba(255,255,255,0.65)" }}>
                  Actually, I want to adjust sliders instead
                </Text>
              </Pressable>
            </Animated.View>
          )}


          {/* ── Slider section (shown on initial + replace steps) ── */}
          {(step === "initial" || step === "replace") && (
            <Animated.View entering={FadeIn.delay(160)} style={{ marginTop: 4 }}>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                  color: "#FFFFFF",
                  marginBottom: 4,
                }}
              >
                Or adjust how you felt
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  marginBottom: 14,
                }}
              >
                Drag the sliders to refine your emotional state
              </Text>
              <View style={{ ...glassCard, marginBottom: 20 }}>
                <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
                <View style={{ padding: 18 }}>
                  {/* Valence slider */}
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: "#FFFFFF" }}>
                        Pleasant ↔ Unpleasant
                      </Text>
                      <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                        {valence > 0 ? `+${valence}` : valence}
                      </Text>
                    </View>
                    <GlassSlider
                      value={valence}
                      min={-100}
                      max={100}
                      onChange={setValence}
                    />
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
                    <GlassSlider
                      value={arousal}
                      min={0}
                      max={100}
                      onChange={setArousal}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          )}


          {/* ── Step: explain — optional reason ── */}
          {step === "explain" && (
            <Animated.View entering={FadeInDown.delay(80)}>
              {selectedEmotion && (
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.7)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    You selected
                  </Text>
                  <View style={{ ...glassCard }}>
                    <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
                    <View
                      style={{
                        padding: 16,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 32, marginRight: 14 }}>
                        {getEmotionDefinition(selectedEmotion).emoji}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          fontSize: 20,
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

              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                Is there anything that might help us understand this better next time? (Optional)
              </Text>

              {/* Mode chips */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                <ReasonChip
                  label="Voice note"
                  icon={<Mic size={14} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionMode === "voice"}
                  onPress={handleVoiceReason}
                  primaryColor={Colors.primary}
                />
                <ReasonChip
                  label="Quick note"
                  icon={<Brain size={14} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionMode === "text"}
                  onPress={() => setCorrectionMode("text")}
                  primaryColor={Colors.primary}
                />
                <ReasonChip
                  label="Just save"
                  icon={<Check size={14} color="#FFFFFF" strokeWidth={2} />}
                  active={correctionMode === "slider"}
                  onPress={() => setCorrectionMode("slider")}
                  primaryColor={Colors.primary}
                />
              </View>


              {correctionMode === "text" && (
                <Animated.View entering={FadeIn.delay(80)} style={{ marginBottom: 16 }}>
                  <TextInput
                    multiline
                    placeholder="What made you feel this way? (optional)"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={reason}
                    onChangeText={setReason}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.06)",
                      borderRadius: 14,
                      padding: 14,
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      color: "#FFFFFF",
                      minHeight: 90,
                      textAlignVertical: "top",
                      borderWidth: 1,
                      borderColor: hexToRgba(Colors.primary, 0.15),
                    }}
                  />
                </Animated.View>
              )}

              {correctionMode === "voice" && (
                <Animated.View
                  entering={FadeIn.delay(80)}
                  style={{
                    ...glassCard,
                    marginBottom: 16,
                    alignItems: "center",
                    padding: 20,
                  }}
                >
                  <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
                  {isRecordingVoice ? (
                    <Pressable onPress={stopVoiceRecording} style={{ alignItems: "center" }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#FFFFFF", marginTop: 8 }}>
                        Recording... tap to stop
                      </Text>
                    </Pressable>
                  ) : isTranscribingVoice ? (
                    <View style={{ alignItems: "center" }}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#FFFFFF", marginTop: 8 }}>
                        Transcribing...
                      </Text>
                    </View>
                  ) : (
                    <Pressable onPress={startVoiceRecording} style={{ alignItems: "center" }}>
                      <Mic size={28} color="#FFFFFF" strokeWidth={2} />
                      <Text style={{ fontFamily: "Inter_500Medium", fontSize: 14, color: "#FFFFFF", marginTop: 8 }}>
                        Tap to record
                      </Text>
                    </Pressable>
                  )}
                  {voiceTranscript.length > 0 && (
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.7)",
                        textAlign: "center",
                        marginTop: 12,
                        lineHeight: 18,
                      }}
                    >
                      {voiceTranscript}
                    </Text>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          )}

        </ScrollView>


        {/* ── Bottom action bar (glassmorphic) ── */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderTopWidth: 1,
            borderTopColor: hexToRgba(Colors.primary, 0.15),
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <GlassLayers primaryColor={Colors.primary} borderRadius={0} blur blurIntensity={80} />

          {/* Step: initial — three buttons */}
          {step === "initial" && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {/* Not quite right */}
              <Pressable
                onPress={handleReject}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                  Not quite
                </Text>
              </Pressable>
              {/* Adjust sliders */}
              <Pressable
                onPress={handleSliderAdjustment}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                  Adjust
                </Text>
              </Pressable>
              {/* Yes, that's me — elevated glass with theme border */}
              <Pressable
                onPress={handleConfirm}
                style={{
                  flex: 1,
                  backgroundColor: hexToRgba(Colors.primary, 0.20),
                  borderRadius: 16,
                  paddingVertical: 15,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.40),
                }}
              >
                <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: "#FFFFFF" }}>
                  That's me
                </Text>
              </Pressable>
            </View>
          )}

          {/* Step: replace — back button */}
          {step === "replace" && (
            <Pressable
              onPress={() => setStep("initial")}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.15),
              }}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFFFFF" }}>
                Go back
              </Text>
            </Pressable>
          )}

          {/* Step: explain — skip + save correction */}
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
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.15),
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
                  backgroundColor: hexToRgba(Colors.primary, 0.20),
                  borderWidth: 1,
                  borderColor: hexToRgba(Colors.primary, 0.40),
                  borderRadius: 16,
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


// ── GlassSlider — white track, white thumb ────────────────────────────────

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
  const [localVal, setLocalVal] = useState(value);
  const trackWidth = SCREEN_W - 96; // padding 20 each side + card padding 18 each side
  const normalized = (localVal - min) / (max - min);
  const thumbPos = normalized * trackWidth;

  return (
    <Pressable
      onPress={(e) => {
        const x = e.nativeEvent.locationX;
        const v = Math.round(min + (x / trackWidth) * (max - min));
        const clamped = Math.max(min, Math.min(max, v));
        setLocalVal(clamped);
        onChange(clamped);
      }}
      style={{ height: 36, justifyContent: "center" }}
    >
      {/* Track background */}
      <View
        style={{
          height: 6,
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* Fill */}
        <View
          style={{
            width: `${normalized * 100}%`,
            height: "100%",
            backgroundColor: "#FFFFFF",
            opacity: 0.85,
            borderRadius: 3,
          }}
        />
      </View>
      {/* Thumb */}
      <View
        style={{
          position: "absolute",
          left: Math.max(0, thumbPos - 11),
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "#FFFFFF",
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.6)",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 4,
          elevation: 4,
        }}
      />
    </Pressable>
  );
}

// ── ReasonChip ────────────────────────────────────────────────────────────

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
        borderRadius: 20,
        backgroundColor: active
          ? hexToRgba(primaryColor, 0.20)
          : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active
          ? hexToRgba(primaryColor, 0.40)
          : hexToRgba(primaryColor, 0.15),
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
