import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  LayoutChangeEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit3,
  Save,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  MessageSquare,
  Target,
  BarChart2,
  RefreshCw,
  CheckCircle2,
  Heart,
  AlertTriangle,
  Wind,
} from "lucide-react-native";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import {
  tapHaptic,
  selectHaptic,
  successHaptic,
  confirmHaptic,
} from "@/lib/haptics";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import useJournalStore from "@/lib/state/journal-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { useDeleteEntry } from "@/lib/hooks";
import { hexToRgba } from "@/lib/glass";

import {
  formatShortDuration,
  EMOTION_COLORS,
  EmotionType,
  EmotionScores,
  getEmotionSubLabel,
  BODY_REGION_EMOJIS,
} from "@/lib/types";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RecommendationCard } from "@/components/RecommendationCard";
import EmotionBreakdownCard from "@/components/EmotionBreakdownCard";
import EmotionCorrectionModal from "@/components/EmotionCorrectionModal";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import { queryKeys } from "@/lib/hooks";
import { analyzeWithOpenRouter, generateRecommendation } from "@/lib/api/openrouter-service";
import { useQueryClient } from "@tanstack/react-query";

const ALL_EMOTIONS: EmotionType[] = [
  "happiness",
  "trust",
  "anticipation",
  "surprise",
  "fear",
  "sadness",
  "disgust",
  "anger",
];

// ─── Glassmorphic card tokens matching the filter/search container ────────────
const GLASS_BG       = "rgba(255, 255, 255, 0.12)";
const GLASS_BORDER   = "rgba(255, 255, 255, 0.20)";
const GLASS_INNER_BG = "rgba(255, 255, 255, 0.08)";
const GLASS_INNER_BORDER = "rgba(255, 255, 255, 0.13)";


export default function EntryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Independent collapse state — multiple sections can be open simultaneously
  const [sectionEmotions,    setSectionEmotions]    = useState(true);  // open by default
  const [sectionReflection,  setSectionReflection]  = useState(true);  // open by default
  const [sectionTranscript,  setSectionTranscript]  = useState(false); // closed by default
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [barContainerWidth, setBarContainerWidth] = useState(0);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const queryClient = useQueryClient();

  const onBarContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setBarContainerWidth(e.nativeEvent.layout.width);
  }, []);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(false);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  // Time is always displayed in the device's local 12-hour format.
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  const entry = useJournalStore((s) => (id ? s.entries.find((e) => e.id === id) ?? null : null));
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const deleteEntryMutation = useDeleteEntry();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });


  const handleBack = () => {
    tapHaptic();
    if (isEditing) {
      setIsEditing(false);
      setEditedTranscript("");
    } else {
      router.back();
    }
  };

  const handleEdit = () => {
    if (!entry) return;
    selectHaptic();
    setIsEditing(true);
    setEditedTranscript(entry.transcript);
    setEditedTitle(entry.title);
  };

  const handleSave = () => {
    if (!entry) return;
    successHaptic();
    updateEntry(entry.id, { transcript: editedTranscript, title: editedTitle });
    setIsEditing(false);
    setEditedTranscript("");
    setEditedTitle("");
  };

  const handleCancelEdit = () => {
    tapHaptic();
    setIsEditing(false);
    setEditedTranscript("");
    setEditedTitle("");
  };

  const handleDeletePress = () => {
    selectHaptic();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!entry) return;
    confirmHaptic();
    deleteEntryMutation.mutate(entry.id);
    setShowDeleteModal(false);
    router.back();
  };

  const handleDeleteCancel = () => {
    tapHaptic();
    setShowDeleteModal(false);
  };

  const toggleSection = (section: "emotions" | "analysis" | "reflection") => {
    tapHaptic();
    if (section === "emotions")   setSectionEmotions((v)   => !v);
    if (section === "analysis")   setSectionTranscript((v) => !v);
    if (section === "reflection") setSectionReflection((v) => !v);
  };

  // Generate recommendation once — only when entry has no persisted aiReflection
  const handleGenerateRecommendation = async () => {
    if (!entry || !entry.transcript || isGeneratingRecommendation) return;
    setIsGeneratingRecommendation(true);
    try {
      // generateRecommendation never throws — 3-path cascade always returns a result
      const result = await generateRecommendation(
        entry.transcript,
        entry.primaryEmotion,
      );
      if (result.advice && result.advice.trim().length > 0) {
        updateEntry(entry.id, { aiReflection: result.advice });
      }
    } finally {
      setIsGeneratingRecommendation(false);
    }
  };

  // Auto-generate once per entry — fires only when aiReflection is absent
  React.useEffect(() => {
    if (!entry) return;
    const hasReflection = entry.aiReflection && entry.aiReflection.trim().length > 0;
    if (!hasReflection && entry.transcript && entry.transcript.trim().length > 0) {
      handleGenerateRecommendation();
    }
  }, [entry?.id]);

  if (!fontsLoaded) return null;


  if (!entry) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: Colors.background }}>
        <LinearGradient
          colors={Gradients.background}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }} className="text-lg">
          Entry not found
        </Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
  };


  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      >
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: GLASS_BG, borderWidth: 1.5, borderColor: GLASS_BORDER }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <View className="flex-row items-center" style={{ gap: 10 }}>
          {!isEditing && (
            <>
              <Pressable
                onPress={handleEdit}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: GLASS_BG, borderWidth: 1.5, borderColor: GLASS_BORDER }}
              >
                <Edit3 size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={handleDeletePress}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1.5, borderColor: "rgba(239,68,68,0.30)" }}
              >
                <Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </>
          )}
          {isEditing && (
            <>
              <Pressable
                onPress={handleCancelEdit}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: GLASS_BG, borderWidth: 1.5, borderColor: GLASS_BORDER }}
              >
                <X size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: GLASS_BG, borderWidth: 1.5, borderColor: GLASS_BORDER }}
              >
                <Save size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </>
          )}
        </View>
      </View>


      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Entry title + meta ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={{ marginBottom: 24 }}>
          {isEditing ? (
            <TextInput
              value={editedTitle}
              onChangeText={setEditedTitle}
              style={{
                fontFamily: "Fraunces_700Bold",
                color: "#FFFFFF",
                fontSize: 24,
                backgroundColor: GLASS_INNER_BG,
                borderRadius: 14,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: GLASS_BORDER,
              }}
              placeholderTextColor="rgba(255,255,255,0.5)"
              placeholder="Entry title…"
            />
          ) : (
            <Text
              style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF", fontSize: 26, marginBottom: 6 }}
            >
              {entry.title}
            </Text>
          )}
          <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 14 }}>
            {formatDate(entry.createdAt)}
          </Text>

          {/* Meta chips row */}
          <View
            className="rounded-2xl overflow-hidden"
            style={{
              backgroundColor: GLASS_BG,
              borderWidth: 2,
              borderColor: GLASS_BORDER,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row items-center justify-around py-4 px-5">
              <View className="items-center">
                <Calendar size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 12, marginTop: 4 }}>
                  {formatTime(entry.createdAt)}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Time</Text>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" }} />
              <View className="items-center">
                <Clock size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 12, marginTop: 4 }}>
                  {formatShortDuration(entry.duration)}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Duration</Text>
              </View>
              <View style={{ width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" }} />
              <View className="items-center">
                <Activity size={16} color="rgba(255,255,255,0.9)" strokeWidth={2} />
                <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 12, marginTop: 4 }}>
                  {entry.emotionIntensity}%
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Intensity</Text>
              </View>
            </View>
          </View>
        </Animated.View>


        {/* ── Conversation Prompt ─────────────────────────────────────────── */}
        {entry.conversationPrompt && (
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={{ marginBottom: 16 }}>
            <View
              className="rounded-2xl overflow-hidden"
              style={{
                backgroundColor: GLASS_BG,
                borderWidth: 2,
                borderColor: GLASS_BORDER,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}
            >
              <View style={{ padding: 18 }}>
                <View className="flex-row items-center" style={{ marginBottom: 10, gap: 8 }}>
                  <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                    <MessageSquare size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
                  </View>
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.75)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Conversation Starter
                  </Text>
                </View>
                <Text style={{ fontFamily: "Inter_400Regular", color: "#FFFFFF", lineHeight: 22, fontSize: 14, fontStyle: "italic" }}>
                  "{entry.conversationPrompt}"
                </Text>
              </View>
            </View>
          </Animated.View>
        )}


        {/* ── Full Transcript ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={{ marginBottom: 16 }}>
          <Pressable
            onPress={() => toggleSection("analysis")}
            className="rounded-3xl overflow-hidden"
            style={{
              backgroundColor: GLASS_BG,
              borderWidth: 2,
              borderColor: GLASS_BORDER,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            }}
          >
            <View style={{ padding: 20 }}>
              {/* Section header — always visible */}
              <View className="flex-row items-center justify-between" style={{ marginBottom: sectionTranscript ? 14 : 0 }}>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                    <MessageSquare size={16} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15 }}>
                    Full Transcript
                  </Text>
                </View>
                {sectionTranscript
                  ? <ChevronUp size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                  : <ChevronDown size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
              </View>

              {/* Collapsible body */}
              {sectionTranscript && (
                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                  {isEditing ? (
                    <TextInput
                      value={editedTranscript}
                      onChangeText={setEditedTranscript}
                      multiline
                      numberOfLines={10}
                      textAlignVertical="top"
                      style={{
                        fontFamily: "Inter_400Regular",
                        fontSize: 14,
                        lineHeight: 24,
                        color: "#FFFFFF",
                        backgroundColor: GLASS_INNER_BG,
                        borderRadius: 12,
                        padding: 14,
                        minHeight: 200,
                        borderWidth: 1,
                        borderColor: GLASS_BORDER,
                      }}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                    />
                  ) : (
                    <View
                      style={{
                        backgroundColor: GLASS_INNER_BG,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: GLASS_INNER_BORDER,
                        padding: 14,
                      }}
                    >
                      <Text
                        style={{ fontFamily: "Inter_400Regular", lineHeight: 24, color: "rgba(255,255,255,0.92)", fontSize: 14 }}
                        numberOfLines={transcriptExpanded ? undefined : 4}
                      >
                        {entry.transcript}
                      </Text>
                      {entry.transcript && entry.transcript.length > 180 && (
                        <Pressable
                          onPress={(e) => { e.stopPropagation?.(); tapHaptic(); setTranscriptExpanded(!transcriptExpanded); }}
                          className="flex-row items-center mt-3"
                          style={{ gap: 4 }}
                        >
                          {transcriptExpanded
                            ? <ChevronUp size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                            : <ChevronDown size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
                          <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                            {transcriptExpanded ? "Show less" : "Read more"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          </Pressable>
        </Animated.View>


        {/* ── Audio Playback ──────────────────────────────────────────────── */}
        {entry.audioUri && (
          <Animated.View entering={FadeInDown.delay(350).duration(600)} style={{ marginBottom: 16 }}>
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: GLASS_BG,
                borderWidth: 2,
                borderColor: GLASS_BORDER,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}
            >
              <View style={{ padding: 20 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15, marginBottom: 14 }}>
                  Your recording
                </Text>
                <AudioPlayer
                  audioUri={entry.audioUri}
                  primaryColor={Colors.primary}
                  isDarkMode={isDarkMode}
                  compact={false}
                />
              </View>
            </View>
          </Animated.View>
        )}


        {/* ── Recommendation ─────────────────────────────────────────────── */}
        {entry.transcript && entry.transcript.trim().length > 0 && (
          <Animated.View entering={FadeInDown.delay(370).duration(600)} style={{ marginBottom: 16 }}>
            <RecommendationCard
              advice={entry.aiReflection?.trim() || null}
              isGenerating={isGeneratingRecommendation}
              themeColor={Colors.primary}
              compact={false}
            />
          </Animated.View>
        )}


        {/* ── EmotionBreakdownCard (Claude 3.7 Sonnet deep analysis) ─────── */}
        {(entry.aiTopThreeEmotions?.length || entry.aiBlendedEmotions?.length || entry.aiAmbivalenceFlags?.length) ? (
          <View style={{ marginBottom: 4 }}>
            <EmotionBreakdownCard
              aiTopThreeEmotions={entry.aiTopThreeEmotions}
              aiBlendedEmotions={entry.aiBlendedEmotions}
              aiAmbivalenceFlags={entry.aiAmbivalenceFlags}
              themeColor={Colors.primary}
            />
          </View>
        ) : null}

        {/* ── Emotion Breakdown — collapsible ─────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)} style={{ marginBottom: 16 }}>
          <Pressable
            onPress={() => toggleSection("emotions")}
            className="rounded-3xl overflow-hidden"
            style={{
              backgroundColor: GLASS_BG,
              borderWidth: 2,
              borderColor: GLASS_BORDER,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            }}
          >
            <View style={{ padding: 20 }}>
              {/* Header row */}
              <View className="flex-row items-center justify-between" style={{ marginBottom: sectionEmotions ? 16 : 0 }}>
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                    <BarChart2 size={16} color="#FFFFFF" strokeWidth={2} />
                  </View>
                  <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15 }}>
                    Emotion Breakdown
                  </Text>
                  {entry.emotionScores && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", fontSize: 9 }}>TOP 4</Text>
                    </View>
                  )}
                </View>
                {sectionEmotions
                  ? <ChevronUp size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                  : <ChevronDown size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
              </View>


              {sectionEmotions && (
                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                  {entry.emotionScores ? (
                    <View style={{ gap: 10 }} onLayout={onBarContainerLayout}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
                        Top Emotions — Plutchik Intensity
                      </Text>
                      {ALL_EMOTIONS.map((emotion) => ({
                        emotion,
                        score: entry.emotionScores![emotion] ?? 0,
                      }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 4)
                        .map(({ emotion, score }, rank) => {
                          const isPrimary = emotion === entry.primaryEmotion;
                          const barWidth = barContainerWidth > 0 ? (score / 100) * barContainerWidth : 0;
                          const intensityLabel =
                            entry.userOverrideLabels?.[emotion] ??
                            entry.emotionIntensityLabels?.[emotion] ??
                            getEmotionSubLabel(emotion, score);
                          const subLabelMatchesBase = intensityLabel.toLowerCase() === emotion.toLowerCase();
                          const barOpacity = [1, 0.75, 0.55, 0.4][rank];
                          return (
                            <View key={emotion}>
                              <View className="flex-row items-center justify-between" style={{ marginBottom: 6 }}>
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View>
                                    <Text style={{ fontFamily: isPrimary ? "Inter_600SemiBold" : "Inter_400Regular", color: "#FFFFFF", fontSize: 13 }}>
                                      {intensityLabel}
                                    </Text>
                                    {!subLabelMatchesBase && (
                                      <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                        {emotion}
                                      </Text>
                                    )}
                                  </View>
                                  {isPrimary && (
                                    <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                                      <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 9 }}>PRIMARY</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={{ fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{score}</Text>
                              </View>
                              <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                <View style={{ height: "100%", borderRadius: 3, width: barWidth, backgroundColor: "#FFFFFF", opacity: barOpacity }} />
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  ) : (
                    <View onLayout={onBarContainerLayout}>
                      <Text style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.7)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 }}>
                        Detected Emotions
                      </Text>
                      <View style={{ gap: 10 }}>
                        {entry.emotions.map((emotion, index) => {
                          const isPrimary = emotion === entry.primaryEmotion;
                          const intensity = isPrimary ? entry.emotionIntensity : Math.round(entry.emotionIntensity * (0.7 - index * 0.1));
                          const barWidth = barContainerWidth > 0 ? (intensity / 100) * barContainerWidth : 0;
                          const subLabel =
                            entry.userOverrideLabels?.[emotion] ??
                            entry.emotionIntensityLabels?.[emotion] ??
                            getEmotionSubLabel(emotion, intensity);
                          const subLabelMatchesBase = subLabel.toLowerCase() === emotion.toLowerCase();
                          return (
                            <View key={emotion}>
                              <View className="flex-row items-center justify-between" style={{ marginBottom: 6 }}>
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View>
                                    <Text style={{ fontFamily: isPrimary ? "Inter_600SemiBold" : "Inter_400Regular", color: "#FFFFFF", fontSize: 13 }}>
                                      {subLabel}
                                    </Text>
                                    {!subLabelMatchesBase && (
                                      <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                        {emotion}
                                      </Text>
                                    )}
                                  </View>
                                  {isPrimary && (
                                    <View style={{ marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                                      <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 9 }}>PRIMARY</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF", fontSize: 13 }}>{intensity}%</Text>
                              </View>
                              <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                <View style={{ height: "100%", borderRadius: 3, width: barWidth, backgroundColor: "#FFFFFF" }} />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          </Pressable>
        </Animated.View>


        {/* ── Your Reflection ─────────────────────────────────────────────── */}
        {(entry.valence !== undefined ||
          entry.arousal !== undefined ||
          entry.bodySensation ||
          entry.groundingUsed) && (
          <Animated.View entering={FadeInDown.delay(450).duration(600)} style={{ marginBottom: 16 }}>
            <Pressable
              onPress={() => toggleSection("reflection")}
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: GLASS_BG,
                borderWidth: 2,
                borderColor: GLASS_BORDER,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}
            >
              <View style={{ padding: 20 }}>
                {/* Header — always visible */}
                <View className="flex-row items-center justify-between" style={{ marginBottom: sectionReflection ? 18 : 0 }}>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                      <Heart size={16} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15 }}>Your Reflection</Text>
                  </View>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    {entry.userValidated ? (
                      <View className="flex-row items-center px-2.5 py-1 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_BORDER }}>
                        <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2} />
                        <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 10, marginLeft: 4 }}>Confirmed</Text>
                      </View>
                    ) : entry.aiCorrected ? (
                      <View className="flex-row items-center px-2.5 py-1 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_BORDER }}>
                        <RefreshCw size={12} color="#FFFFFF" strokeWidth={2} />
                        <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 10, marginLeft: 4 }}>Adjusted</Text>
                      </View>
                    ) : null}
                    {sectionReflection
                      ? <ChevronUp size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />
                      : <ChevronDown size={18} color="rgba(255,255,255,0.7)" strokeWidth={2} />}
                  </View>
                </View>

                {/* Collapsible body */}
                {sectionReflection && (
                  <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    {/* Valence & Arousal */}
                    {(entry.valence !== undefined || entry.arousal !== undefined) && (
                      <View style={{ gap: 16, marginBottom: 16 }}>
                        {entry.valence !== undefined && (
                          <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 12, borderWidth: 1, borderColor: GLASS_INNER_BORDER, padding: 14 }}>
                            <View className="flex-row items-center justify-between" style={{ marginBottom: 8 }}>
                              <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Valence</Text>
                              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 12 }}>
                                {entry.valence > 0 ? "+" : ""}{entry.valence}
                              </Text>
                            </View>
                            <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                              <View style={{ height: "100%", borderRadius: 4, width: `${Math.abs(entry.valence)}%`, backgroundColor: "#FFFFFF", marginLeft: entry.valence < 0 ? `${100 - Math.abs(entry.valence)}%` : 0 }} />
                            </View>
                            <View className="flex-row justify-between" style={{ marginTop: 6 }}>
                              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Unpleasant</Text>
                              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Pleasant</Text>
                            </View>
                          </View>
                        )}
                        {entry.arousal !== undefined && (
                          <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 12, borderWidth: 1, borderColor: GLASS_INNER_BORDER, padding: 14 }}>
                            <View className="flex-row items-center justify-between" style={{ marginBottom: 8 }}>
                              <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)", fontSize: 12 }}>Arousal</Text>
                              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 12 }}>{entry.arousal}%</Text>
                            </View>
                            <View style={{ height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                              <View style={{ height: "100%", borderRadius: 4, width: `${entry.arousal}%`, backgroundColor: "#FFFFFF" }} />
                            </View>
                            <View className="flex-row justify-between" style={{ marginTop: 6 }}>
                              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Calm</Text>
                              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Activated</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Body Sensation & Grounding chips */}
                    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                      {entry.bodySensation && (
                        <View className="flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_BORDER }}>
                          <AlertTriangle size={12} color="#FFFFFF" strokeWidth={2} />
                          <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 11, marginLeft: 6, textTransform: "capitalize" }}>
                            {entry.bodySensation.replace(/_/g, " ")}
                          </Text>
                        </View>
                      )}
                      {entry.groundingUsed && (
                        <View className="flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_BORDER }}>
                          <Wind size={12} color="#FFFFFF" strokeWidth={2} />
                          <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 11, marginLeft: 6 }}>Grounding used</Text>
                        </View>
                      )}
                      {entry.distressLevel && (
                        <View className="flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_BORDER }}>
                          <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 11, textTransform: "capitalize" }}>
                            {entry.distressLevel} distress
                          </Text>
                        </View>
                      )}
                      {entry.userValidated && (
                        <View className="flex-row items-center px-3 py-2 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_BORDER }}>
                      <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2} />
                      <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 11, marginLeft: 6 }}>Validated</Text>
                    </View>
                  )}
                </View>

                {/* Body region map */}
                {entry.bodyRegions && entry.bodyRegions.length > 0 && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Body regions
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                      {entry.bodyRegions.map((br) => (
                        <View key={br.region} className="flex-row items-center px-2.5 py-1.5 rounded-full" style={{ backgroundColor: GLASS_INNER_BG, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                          <Text style={{ fontSize: 10, marginRight: 4 }}>{BODY_REGION_EMOJIS[br.region]}</Text>
                          <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 10, textTransform: "capitalize" }}>{br.region}</Text>
                          <Text style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", fontSize: 9, marginLeft: 4 }}>{br.intensity ? "●".repeat(br.intensity) : ""}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}


        {/* ── Refine Analysis button ──────────────────────────────────────── */}
        {!entry.userValidated && (
          <Animated.View entering={FadeInDown.delay(480).duration(600)} style={{ marginBottom: 16 }}>
            <Pressable
              onPress={() => { selectHaptic(); setShowRefineModal(true); }}
              className="flex-row items-center justify-center rounded-3xl py-4 px-5"
              style={{
                backgroundColor: GLASS_BG,
                borderWidth: 2,
                borderColor: GLASS_BORDER,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}
            >
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 13, marginLeft: 8 }}>
                Refine Analysis
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── AI Analysis — removed: shows generic text for reflection-override entries ── */}


        {/* ── Topics ─────────────────────────────────────────────────────── */}
        {entry.topics &&
          entry.topics.length > 0 &&
          entry.topics.some((t) => t && t.trim().length > 0) && (
            <Animated.View entering={FadeInDown.delay(560).duration(600)} style={{ marginBottom: 16 }}>
              <View
                className="rounded-3xl overflow-hidden"
                style={{
                  backgroundColor: GLASS_BG,
                  borderWidth: 2,
                  borderColor: GLASS_BORDER,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                }}
              >
                <View style={{ padding: 20 }}>
                  <View className="flex-row items-center" style={{ marginBottom: 14, gap: 8 }}>
                    <View style={{ backgroundColor: GLASS_INNER_BG, borderRadius: 8, padding: 6, borderWidth: 1, borderColor: GLASS_INNER_BORDER }}>
                      <Target size={16} color="#FFFFFF" strokeWidth={2} />
                    </View>
                    <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 15 }}>Topics</Text>
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {entry.topics
                      .filter((t) => t && t.trim().length > 0)
                      .map((topic, index) => (
                        <View
                          key={index}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: GLASS_INNER_BG,
                            borderWidth: 1.5,
                            borderColor: GLASS_BORDER,
                          }}
                        >
                          <Text style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF", fontSize: 13, textTransform: "capitalize" }}>
                            {topic}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
      </ScrollView>


      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal visible={showDeleteModal} animationType="fade" transparent onRequestClose={handleDeleteCancel}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={FadeIn.duration(200)}
            className="rounded-3xl overflow-hidden w-full max-w-sm"
            style={{
              backgroundColor: GLASS_BG,
              borderWidth: 2,
              borderColor: GLASS_BORDER,
            }}
          >
            <LinearGradient
              colors={Gradients.background}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ padding: 24, borderRadius: 24 }}
            >
              <View className="items-center" style={{ marginBottom: 20 }}>
                <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.15)", marginBottom: 16 }}>
                  <Trash2 size={32} color="#EF4444" strokeWidth={2} />
                </View>
                <Text className="text-2xl font-bold mb-2 text-center" style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>
                  Delete Entry?
                </Text>
                <Text className="text-center text-base" style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", lineHeight: 22 }}>
                  This will permanently delete this journal entry. This action cannot be undone.
                </Text>
              </View>
              <View style={{ gap: 12 }}>
                <Pressable onPress={handleDeleteConfirm} className="rounded-2xl overflow-hidden">
                  <LinearGradient colors={["#EF4444", "#DC2626"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ padding: 16, alignItems: "center" }}>
                    <Text className="text-white text-base font-bold" style={{ fontFamily: "Inter_700Bold" }}>Delete Entry</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={handleDeleteCancel}
                  className="rounded-2xl py-4 items-center"
                  style={{ borderWidth: 2, borderColor: Colors.primary, backgroundColor: "transparent" }}
                >
                  <Text className="text-base font-bold" style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>Cancel</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Refine Analysis Modal ─────────────────────────────────────────── */}
      {entry && (
        <EmotionCorrectionModal
          visible={showRefineModal}
          entryId={entry.id}
          aiEmotion={entry.primaryEmotion}
          aiValence={entry.valence}
          aiArousal={entry.arousal}
          aiDistress={entry.distressLevel}
          onDismiss={() => { tapHaptic(); setShowRefineModal(false); }}
          onSubmit={(correction) => {
            if (correction.userConfirmedAI) {
              updateEntry(entry.id, { userValidated: true });
              successHaptic();
            } else {
              const updates: Partial<{
                primaryEmotion: EmotionType;
                valence: number;
                arousal: number;
                aiCorrected: boolean;
                userOverrideLabels: Partial<Record<EmotionType, string>>;
              }> = { aiCorrected: true };
              if (correction.userEditedEmotion) updates.primaryEmotion = correction.userEditedEmotion;
              if (correction.userEditedValence !== undefined) updates.valence = correction.userEditedValence;
              if (correction.userEditedArousal !== undefined) updates.arousal = correction.userEditedArousal;
              updateEntry(entry.id, updates as any);
              successHaptic();
            }
            setShowRefineModal(false);
            queryClient.invalidateQueries({ queryKey: ["insights"] });
            queryClient.invalidateQueries({ queryKey: ["priorityInsights"] });
            queryClient.invalidateQueries({ queryKey: ["triggerDetection"] });
          }}
        />
      )}
    </View>
  );
}
