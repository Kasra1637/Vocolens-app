import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
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
  Share2,
  Edit3,
  Save,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  MessageSquare,
  Lightbulb,
  Target,
  Play,
  Square,
  Volume2,
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
import * as Speech from "expo-speech";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import useJournalStore from "@/lib/state/journal-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { useDeleteEntry } from "@/lib/hooks";
import { hexToRgba, GlassLayers } from "@/lib/glass";
import {
  formatShortDuration,
  EMOTION_COLORS,
  EmotionType,
  EmotionScores,
  getEmotionSubLabel,
  BODY_REGION_EMOJIS,
} from "@/lib/types";
import { AudioPlayer } from "@/components/AudioPlayer";
import EmotionBreakdownCard from "@/components/EmotionBreakdownCard";
import EmotionCorrectionModal from "@/components/EmotionCorrectionModal";
import { useEmotionCorrectionStore } from "@/lib/state/emotion-correction-store";
import { queryKeys } from "@/lib/hooks";
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

export default function EntryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<
    "emotions" | "analysis" | "reflection" | null
  >("emotions");
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [barContainerWidth, setBarContainerWidth] = useState(0);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const queryClient = useQueryClient();
  const onBarContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setBarContainerWidth(e.nativeEvent.layout.width);
  }, []);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Get selected theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  const getEntry = useJournalStore((s) => s.getEntry);
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const deleteEntryMutation = useDeleteEntry();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const entry = id ? getEntry(id) : null;

  const handleBack = () => {
    tapHaptic();
    if (isSpeaking) Speech.stop();
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
    if (isSpeaking) Speech.stop();
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
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleToggleSpeech = async () => {
    if (!entry?.aiReflection) return;
    selectHaptic();
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(entry.aiReflection, {
        language: "en-US",
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!entry) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: Colors.background }}
      >
        <LinearGradient
          colors={Gradients.background}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Text
          style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
          className="text-lg"
        >
          Entry not found
        </Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (timeFormat === "24h") {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      >
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <View className="flex-row items-center" style={{ gap: 12 }}>
          {!isEditing && (
            <>
              <Pressable
                onPress={handleEdit}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
              >
                <Edit3 size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={handleDeletePress}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: "transparent" }}
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
                style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
              >
                <X size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
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
        {/* Entry Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          {isEditing ? (
            <TextInput
              value={editedTitle}
              onChangeText={setEditedTitle}
              style={{
                fontFamily: "Fraunces_700Bold",
                color: "#FFFFFF",
                fontSize: 24,
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.2),
              }}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              placeholder="Entry title..."
            />
          ) : (
            <Text
              style={{ fontFamily: "Fraunces_700Bold", color: "#FFFFFF" }}
              className="text-2xl mb-2"
            >
              {entry.title}
            </Text>
          )}
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              color: "rgba(255, 255, 255, 0.8)",
            }}
            className="text-sm mb-4"
          >
            {formatDate(entry.createdAt)}
          </Text>

          {/* Meta Info */}
          <View className="flex-row items-center mb-2" style={{ gap: 16 }}>
            <View className="flex-row items-center">
              <Calendar
                size={16}
                color="rgba(255, 255, 255, 0.8)"
                strokeWidth={2}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                className="text-sm ml-2"
              >
                {formatTime(entry.createdAt)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Clock
                size={16}
                color="rgba(255, 255, 255, 0.8)"
                strokeWidth={2}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                className="text-sm ml-2"
              >
                {formatShortDuration(entry.duration)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Activity
                size={16}
                color="rgba(255, 255, 255, 0.8)"
                strokeWidth={2}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                className="text-sm ml-2"
              >
                {entry.emotionIntensity}%
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* AI Reflection (TTS) - shown when available from OpenRouter */}
        {entry.aiReflection && entry.aiReflection.trim().length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="mb-6"
          >
            <Pressable
              onPress={() => toggleSection("reflection")}
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderWidth: 1.5,
                borderColor: hexToRgba(Colors.primary, 0.2),
                overflow: "hidden",
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Volume2 size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                      className="text-base ml-2"
                    >
                      AI Reflection
                    </Text>
                    <View
                      className="ml-2 px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: hexToRgba(Colors.primary, 0.2),
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 9,
                        }}
                      >
                        OPENROUTER
                      </Text>
                    </View>
                  </View>
                  {expandedSection === "reflection" ? (
                    <ChevronUp size={20} color="#FFFFFF" strokeWidth={2} />
                  ) : (
                    <ChevronDown size={20} color="#FFFFFF" strokeWidth={2} />
                  )}
                </View>

                {expandedSection === "reflection" && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        lineHeight: 24,
                        color: "rgba(255, 255, 255, 0.95)",
                        marginBottom: 16,
                      }}
                      className="text-sm"
                    >
                      {entry.aiReflection}
                    </Text>

                    {/* TTS Play/Stop Button */}
                    <Pressable
                      onPress={handleToggleSpeech}
                      className="flex-row items-center justify-center rounded-2xl py-3 px-5"
                      style={{
                        backgroundColor: isSpeaking
                          ? "rgba(239, 68, 68, 0.25)"
                          : hexToRgba(Colors.primary, 0.2),
                        borderWidth: 1,
                        borderColor: isSpeaking
                          ? "rgba(239, 68, 68, 0.5)"
                          : hexToRgba(Colors.primary, 0.25),
                      }}
                    >
                      {isSpeaking ? (
                        <Square size={16} color="#FFFFFF" strokeWidth={2} />
                      ) : (
                        <Play size={16} color="#FFFFFF" strokeWidth={2} />
                      )}
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 13,
                          marginLeft: 8,
                        }}
                      >
                        {isSpeaking ? "Stop Reading" : "Listen to Reflection"}
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Conversation Prompt */}
        {entry.conversationPrompt && (
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mb-6"
          >
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderWidth: 1.5,
                borderColor: hexToRgba(Colors.primary, 0.2),
                overflow: "hidden",
              }}
            >
              
              <View className="flex-row items-center mb-2">
                <MessageSquare
                  size={16}
                  color="rgba(255, 255, 255, 0.8)"
                  strokeWidth={2}
                />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                  className="text-xs uppercase ml-2"
                >
                  Conversation Starter
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "#FFFFFF",
                  lineHeight: 22,
                }}
                className="text-sm italic"
              >
                "{entry.conversationPrompt}"
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Transcript */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <View
            className="rounded-3xl overflow-hidden mb-6"
            style={{
              backgroundColor: hexToRgba(Colors.primary, 0.1),
              borderWidth: 1.5,
              borderColor: hexToRgba(Colors.primary, 0.2),
              overflow: "hidden",
            }}
          >
            <View className="p-5">
              <Text
                style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                className="text-base mb-3"
              >
                Full Transcript
              </Text>
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
                    backgroundColor: hexToRgba(Colors.primary, 0.1),
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 200,
                  }}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              ) : (
                <View>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      lineHeight: 24,
                      color: "rgba(255, 255, 255, 0.95)",
                    }}
                    className="text-sm"
                    numberOfLines={transcriptExpanded ? undefined : 2}
                  >
                    {entry.transcript}
                  </Text>
                  {entry.transcript && entry.transcript.length > 120 && (
                    <Pressable
                      onPress={() => {
                        tapHaptic();
                        setTranscriptExpanded(!transcriptExpanded);
                      }}
                      className="flex-row items-center mt-2"
                    >
                      {transcriptExpanded ? (
                        <ChevronUp
                          size={14}
                          color="#FFFFFF"
                          strokeWidth={2}
                        />
                      ) : (
                        <ChevronDown
                          size={14}
                          color="#FFFFFF"
                          strokeWidth={2}
                        />
                      )}
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#FFFFFF",
                          fontSize: 13,
                          marginLeft: 4,
                        }}
                      >
                        {transcriptExpanded ? "Show less" : "Read more"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Audio Playback */}
        {entry.audioUri && (          <Animated.View
            entering={FadeInDown.delay(350).duration(600)}
            className="mb-6"
          >
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderWidth: 1.5,
                borderColor: hexToRgba(Colors.primary, 0.2),
                overflow: "hidden",
              }}
            >
              <View className="p-5">
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  className="text-base mb-4"
                >
                  Recording
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

        {/* EmotionBreakdownCard — Claude 3.5 Sonnet Plutchik deep analysis */}
        {(entry.aiTopThreeEmotions?.length || entry.aiBlendedEmotions?.length || entry.aiAmbivalenceFlags?.length) ? (
          <View style={{ paddingHorizontal: 0, marginBottom: 4 }}>
            <EmotionBreakdownCard
              aiTopThreeEmotions={entry.aiTopThreeEmotions}
              aiBlendedEmotions={entry.aiBlendedEmotions}
              aiAmbivalenceFlags={entry.aiAmbivalenceFlags}
              themeColor={Colors.primary}
            />
          </View>
        ) : null}

        {/* Emotion Breakdown - Collapsible */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Pressable
            onPress={() => toggleSection("emotions")}
            className="rounded-3xl overflow-hidden mb-6"
            style={{
              backgroundColor: hexToRgba(Colors.primary, 0.1),
              borderWidth: 1.5,
              borderColor: hexToRgba(Colors.primary, 0.2),
              overflow: "hidden",
            }}
          >
            <View className="p-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <BarChart2 size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      color: "#FFFFFF",
                    }}
                    className="text-base ml-2"
                  >
                    Emotion Breakdown
                  </Text>
                  {entry.emotionScores && (
                    <View
                      className="ml-2 px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: hexToRgba(Colors.primary, 0.2),
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 9,
                        }}
                      >
                        TOP 4
                      </Text>
                    </View>
                  )}
                </View>
                {expandedSection === "emotions" ? (
                  <ChevronUp size={20} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <ChevronDown size={20} color="#FFFFFF" strokeWidth={2} />
                )}
              </View>

              {expandedSection === "emotions" && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  exiting={FadeOut.duration(200)}
                >
                  {entry.emotionScores ? (
                    /* Top 4 emotions by score — Plutchik intensity labels */
                    <View style={{ gap: 10 }} onLayout={onBarContainerLayout}>
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "rgba(255, 255, 255, 0.6)",
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                          marginBottom: 4,
                        }}
                      >
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
                          const barWidth =
                            barContainerWidth > 0
                              ? (score / 100) * barContainerWidth
                              : 0;
                          // Prefer user override, then saved AI label, then compute from score
                          const intensityLabel =
                            entry.userOverrideLabels?.[emotion] ??
                            entry.emotionIntensityLabels?.[emotion] ??
                            getEmotionSubLabel(emotion, score);
                          const subLabelMatchesBase =
                            intensityLabel.toLowerCase() ===
                            emotion.toLowerCase();
                          // Opacity steps: 1 → 0.75 → 0.55 → 0.4 for visual hierarchy
                          const barOpacity = [1, 0.75, 0.55, 0.4][rank];
                          return (
                            <View key={emotion}>
                              <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View>
                                    <Text
                                      style={{
                                        fontFamily: isPrimary
                                          ? "Inter_600SemiBold"
                                          : "Inter_400Regular",
                                        color: "#FFFFFF",
                                        fontSize: 13,
                                      }}
                                    >
                                      {intensityLabel}
                                    </Text>
                                    {!subLabelMatchesBase && (
                                      <Text
                                        style={{
                                          fontFamily: "Inter_400Regular",
                                          color: "rgba(255,255,255,0.4)",
                                          fontSize: 9,
                                          textTransform: "uppercase",
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        {emotion}
                                      </Text>
                                    )}
                                  </View>
                                  {isPrimary && (
                                    <View
                                      className="ml-2 px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: `${Colors.primary}40`,
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontFamily: "Inter_600SemiBold",
                                          color: "#FFFFFF",
                                          fontSize: 9,
                                        }}
                                      >
                                        PRIMARY
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontFamily: "Inter_700Bold",
                                    color: "rgba(255,255,255,0.8)",
                                    fontSize: 13,
                                  }}
                                >
                                  {score}
                                </Text>
                              </View>
                              <View
                                className="h-2 rounded-full"
                                style={{
                                  backgroundColor: hexToRgba(
                                    Colors.primary,
                                    0.1,
                                  ),
                                }}
                              >
                                <View
                                  className="h-full rounded-full"
                                  style={{
                                    width: barWidth,
                                    backgroundColor: "#FFFFFF",
                                    opacity: barOpacity,
                                  }}
                                />
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  ) : (
                    /* Fallback: detected emotions only */
                    <View onLayout={onBarContainerLayout}>
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                        className="text-xs uppercase mb-3"
                      >
                        Detected Emotions
                      </Text>
                      <View style={{ gap: 10 }}>
                        {entry.emotions.map((emotion, index) => {
                          const isPrimary = emotion === entry.primaryEmotion;
                          const intensity = isPrimary
                            ? entry.emotionIntensity
                            : Math.round(
                                entry.emotionIntensity * (0.7 - index * 0.1),
                              );
                          const barWidth =
                            barContainerWidth > 0
                              ? (intensity / 100) * barContainerWidth
                              : 0;
                          // Prefer user override, then saved AI label, then compute
                          const subLabel =
                            entry.userOverrideLabels?.[emotion] ??
                            entry.emotionIntensityLabels?.[emotion] ??
                            getEmotionSubLabel(emotion, intensity);
                          const subLabelMatchesBase =
                            subLabel.toLowerCase() === emotion.toLowerCase();

                          return (
                            <View key={emotion}>
                              <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View>
                                    <Text
                                      style={{
                                        fontFamily: isPrimary
                                          ? "Inter_600SemiBold"
                                          : "Inter_400Regular",
                                        color: "#FFFFFF",
                                        fontSize: 13,
                                      }}
                                    >
                                      {subLabel}
                                    </Text>
                                    {!subLabelMatchesBase && (
                                      <Text
                                        style={{
                                          fontFamily: "Inter_400Regular",
                                          color: "rgba(255,255,255,0.4)",
                                          fontSize: 9,
                                          textTransform: "uppercase",
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        {emotion}
                                      </Text>
                                    )}
                                  </View>
                                  {isPrimary && (
                                    <View
                                      className="ml-2 px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: hexToRgba(
                                          Colors.primary,
                                          0.2,
                                        ),
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontFamily: "Inter_600SemiBold",
                                          color: "#FFFFFF",
                                          fontSize: 9,
                                        }}
                                      >
                                        PRIMARY
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontFamily: "Inter_700Bold",
                                    color: "#FFFFFF",
                                    fontSize: 13,
                                  }}
                                >
                                  {intensity}%
                                </Text>
                              </View>
                              <View
                                className="h-2 rounded-full"
                                style={{
                                  backgroundColor: hexToRgba(
                                    Colors.primary,
                                    0.1,
                                  ),
                                }}
                              >
                                <View
                                  className="h-full rounded-full"
                                  style={{
                                    width: barWidth,
                                    backgroundColor: "#FFFFFF",
                                  }}
                                />
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

        {/* Your Reflection Card — valence/arousal, body sensation, grounding */}
        {(entry.valence !== undefined ||
          entry.arousal !== undefined ||
          entry.bodySensation ||
          entry.groundingUsed) && (
          <Animated.View entering={FadeInDown.delay(450).duration(600)}>
            <View
              className="rounded-3xl overflow-hidden mb-6"
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderWidth: 1.5,
                borderColor: hexToRgba(Colors.primary, 0.2),
                overflow: "hidden",
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Heart size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                      className="text-base ml-2"
                    >
                      Your Reflection
                    </Text>
                  </View>
                  {/* User validation chip — always glassmorphic with white text */}
                  {entry.userValidated ? (
                    <View
                      className="flex-row items-center px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.14)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.25)",
                      }}
                    >
                      <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                      >
                        Confirmed
                      </Text>
                    </View>
                  ) : entry.aiCorrected ? (
                    <View
                      className="flex-row items-center px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.14)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.25)",
                      }}
                    >
                      <RefreshCw size={12} color="#FFFFFF" strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: "Inter_600SemiBold",
                          color: "#FFFFFF",
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                      >
                        Adjusted
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Valence & Arousal Bars */}
                {(entry.valence !== undefined ||
                  entry.arousal !== undefined) && (
                  <View style={{ gap: 12, marginBottom: 16 }}>
                    {/* Valence */}
                    {entry.valence !== undefined && (
                      <View>
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: 12,
                            }}
                          >
                            Valence
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "#FFFFFF",
                              fontSize: 12,
                            }}
                          >
                            {entry.valence > 0 ? "+" : ""}
                            {entry.valence}
                          </Text>
                        </View>
                        <View
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{
                            backgroundColor: hexToRgba(Colors.primary, 0.1),
                          }}
                        >
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.abs(entry.valence)}%`,
                              backgroundColor: "#FFFFFF",
                              marginLeft:
                                entry.valence < 0
                                  ? `${100 - Math.abs(entry.valence)}%`
                                  : 0,
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 10,
                            }}
                          >
                            Unpleasant
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 10,
                            }}
                          >
                            Pleasant
                          </Text>
                        </View>
                      </View>
                    )}
                    {/* Arousal */}
                    {entry.arousal !== undefined && (
                      <View>
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: 12,
                            }}
                          >
                            Arousal
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "#FFFFFF",
                              fontSize: 12,
                            }}
                          >
                            {entry.arousal}%
                          </Text>
                        </View>
                        <View
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{
                            backgroundColor: hexToRgba(Colors.primary, 0.1),
                          }}
                        >
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${entry.arousal}%`,
                              backgroundColor: "#FFFFFF",
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 10,
                            }}
                          >
                            Calm
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.4)",
                              fontSize: 10,
                            }}
                          >
                            Activated
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Body Sensation & Grounding Chips */}
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {entry.bodySensation && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: hexToRgba(Colors.primary, 0.15),
                        borderWidth: 1,
                        borderColor: hexToRgba(Colors.primary, 0.2),
                      }}
                    >
                      <AlertTriangle
                        size={12}
                        color="#FFFFFF"
                        strokeWidth={2}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#FFFFFF",
                          fontSize: 11,
                          marginLeft: 6,
                          textTransform: "capitalize",
                        }}
                      >
                        {entry.bodySensation.replace(/_/g, " ")}
                      </Text>
                    </View>
                  )}
                  {entry.groundingUsed && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: `${Colors.primary}30`,
                        borderWidth: 1,
                        borderColor: `${Colors.primary}50`,
                      }}
                    >
                      <Wind size={12} color={Colors.primary} strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#FFFFFF",
                          fontSize: 11,
                          marginLeft: 6,
                        }}
                      >
                        Grounding used
                      </Text>
                    </View>
                  )}
                  {entry.distressLevel && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.22)",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#FFFFFF",
                          fontSize: 11,
                          textTransform: "capitalize",
                        }}
                      >
                        {entry.distressLevel} distress
                      </Text>
                    </View>
                  )}
                  {entry.userValidated && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.22)",
                      }}
                    >
                      <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          color: "#FFFFFF",
                          fontSize: 11,
                          marginLeft: 6,
                        }}
                      >
                        Validated
                      </Text>
                    </View>
                  )}
                </View>

                {/* Body Region Map Results */}
                {entry.bodyRegions && entry.bodyRegions.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 11,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Body regions
                    </Text>
                    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                      {entry.bodyRegions.map((br) => (
                        <View
                          key={br.region}
                          className="flex-row items-center px-2.5 py-1.5 rounded-full"
                          style={{
                            backgroundColor: hexToRgba(Colors.primary, 0.1),
                            borderWidth: 1,
                            borderColor: hexToRgba(Colors.primary, 0.15),
                          }}
                        >
                          <Text style={{ fontSize: 10, marginRight: 4 }}>
                            {BODY_REGION_EMOJIS[br.region]}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              color: "#FFFFFF",
                              fontSize: 10,
                              textTransform: "capitalize",
                            }}
                          >
                            {br.region}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "rgba(255, 255, 255, 0.6)",
                              fontSize: 9,
                              marginLeft: 4,
                            }}
                          >
                            {"●".repeat(br.intensity)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Refine Analysis Button */}
        {!entry.userValidated && (
          <Animated.View
            entering={FadeInDown.delay(480).duration(600)}
            className="mb-6"
          >
            <Pressable
              onPress={() => {
                selectHaptic();
                setShowRefineModal(true);
              }}
              className="flex-row items-center justify-center rounded-3xl py-4 px-5"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderWidth: 2,
                borderColor: "rgba(255, 255, 255, 0.20)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}
            >
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  color: "#FFFFFF",
                  fontSize: 13,
                  marginLeft: 8,
                }}
              >
                Refine Analysis
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* AI Analysis - Collapsible */}
        {entry.aiAnalysis && entry.aiAnalysis.trim().length > 1 && (
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <Pressable
              onPress={() => toggleSection("analysis")}
              className="rounded-3xl overflow-hidden mb-6"
              style={{
                backgroundColor: hexToRgba(Colors.primary, 0.1),
                borderWidth: 1.5,
                borderColor: hexToRgba(Colors.primary, 0.2),
                overflow: "hidden",
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Lightbulb size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                      className="text-base ml-2"
                    >
                      AI Analysis
                    </Text>
                    {entry.aiCorrected && (
                      <View
                        className="ml-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "rgba(234, 179, 8, 0.25)" }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            color: "#EAB308",
                            fontSize: 9,
                          }}
                        >
                          ADJUSTED
                        </Text>
                      </View>
                    )}
                  </View>
                  {expandedSection === "analysis" ? (
                    <ChevronUp size={20} color="#FFFFFF" strokeWidth={2} />
                  ) : (
                    <ChevronDown size={20} color="#FFFFFF" strokeWidth={2} />
                  )}
                </View>

                {expandedSection === "analysis" && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    exiting={FadeOut.duration(200)}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_400Regular",
                        lineHeight: 24,
                        color: "rgba(255, 255, 255, 0.95)",
                      }}
                      className="text-sm"
                    >
                      {entry.aiAnalysis}
                    </Text>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Topics */}
        {entry.topics &&
          entry.topics.length > 0 &&
          entry.topics.some((t) => t && t.trim().length > 0) && (
            <Animated.View entering={FadeInDown.delay(600).duration(600)}>
              <View
                className="rounded-3xl overflow-hidden mb-6"
                style={{
                  backgroundColor: hexToRgba(Colors.primary, 0.1),
                  borderWidth: 1.5,
                  borderColor: hexToRgba(Colors.primary, 0.2),
                  overflow: "hidden",
                }}
              >
                <View className="p-5">
                  <View className="flex-row items-center mb-3">
                    <Target size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: "#FFFFFF",
                      }}
                      className="text-base ml-2"
                    >
                      Topics
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {entry.topics
                      .filter((t) => t && t.trim().length > 0)
                      .map((topic, index) => (
                        <View
                          key={index}
                          className="px-3 py-2 rounded-full"
                          style={{
                            backgroundColor: hexToRgba(Colors.primary, 0.15),
                            borderWidth: 1,
                            borderColor: hexToRgba(Colors.primary, 0.2),
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              color: "#FFFFFF",
                            }}
                            className="text-xs capitalize"
                          >
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={handleDeleteCancel}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={FadeIn.duration(200)}
            className="rounded-3xl overflow-hidden w-full max-w-sm"
          >
            <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
            <LinearGradient
              colors={Gradients.background}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                padding: 24,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: hexToRgba(Colors.primary, 0.15),
              }}
            >
              <View className="items-center mb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                >
                  <Trash2 size={32} color="#EF4444" strokeWidth={2} />
                </View>
                <Text
                  className="text-2xl font-bold mb-2 text-center"
                  style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}
                >
                  Delete Entry?
                </Text>
                <Text
                  className="text-center text-base"
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255, 255, 255, 0.8)",
                    lineHeight: 22,
                  }}
                >
                  This will permanently delete this journal entry. This action
                  cannot be undone.
                </Text>
              </View>

              <View style={{ gap: 12 }}>
                <Pressable
                  onPress={handleDeleteConfirm}
                  className="rounded-2xl overflow-hidden"
                >
                  <LinearGradient
                    colors={["#EF4444", "#DC2626"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ padding: 16, alignItems: "center" }}
                  >
                    <Text
                      className="text-white text-base font-bold"
                      style={{ fontFamily: "Inter_700Bold" }}
                    >
                      Delete Entry
                    </Text>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  onPress={handleDeleteCancel}
                  className="rounded-2xl py-4 items-center"
                  style={{
                    borderWidth: 2,
                    borderColor: Colors.primary,
                    backgroundColor: "transparent",
                  }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{
                      fontFamily: "Inter_700Bold",
                      color: Colors.primary,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      {/* Refine Analysis Modal */}
      {entry && (
        <EmotionCorrectionModal
          visible={showRefineModal}
          entryId={entry.id}
          aiEmotion={entry.primaryEmotion}
          aiValence={entry.valence}
          aiArousal={entry.arousal}
          aiDistress={entry.distressLevel}
          onDismiss={() => {
            tapHaptic();
            setShowRefineModal(false);
          }}
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
              }> = {
                aiCorrected: true,
              };
              if (correction.userEditedEmotion) {
                updates.primaryEmotion = correction.userEditedEmotion;
              }
              if (correction.userEditedValence !== undefined) {
                updates.valence = correction.userEditedValence;
              }
              if (correction.userEditedArousal !== undefined) {
                updates.arousal = correction.userEditedArousal;
              }
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
