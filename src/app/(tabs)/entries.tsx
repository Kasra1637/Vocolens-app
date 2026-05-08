import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Filter,
  Search,
  Calendar,
  Clock,
  ChevronDown,
  Trash2,
  X,
  BookOpen,
  Activity,
  Mic,
  ChevronUp,
} from "lucide-react-native";
import Animated, {
  FadeOut,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  tapHaptic,
  selectHaptic,
  warningHaptic,
  confirmHaptic,
} from "@/lib/haptics";
import {
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import useJournalStore from "@/lib/state/journal-store";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { useDeleteEntry } from "@/lib/hooks";
import { useClickSound } from "@/lib/hooks/useClickSound";
import {
  JournalEntry,
  EmotionType,
  formatShortDuration,
  getEmotionSubLabel,
  RankedEmotion,
  BlendedEmotionType,
  EMOTION_COLORS,
} from "@/lib/types";
import { AudioPlayer } from "@/components/AudioPlayer";
import { hexToRgba, GlassLayers } from "@/lib/glass";
import { ScreenWrapper } from "@/components/ScreenWrapper";
import {
  getStaggeredFadeIn,
  BUTTON_PRESS_SCALE,
  BUTTON_RELEASE_DURATION,
} from "@/lib/animations";

// Display types for UI (capitalized versions)
type DisplayEmotion = "Happiness" | "Sadness" | "Anger" | "Disgust";

const EMOTION_FILTERS: DisplayEmotion[] = [
  "Happiness",
  "Sadness",
  "Anger",
  "Disgust",
];

const SORT_OPTIONS = ["Newest First", "Oldest First"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

// Helper to convert stored emotion to display emotion
const toDisplayEmotion = (emotion: EmotionType): DisplayEmotion => {
  return (emotion.charAt(0).toUpperCase() + emotion.slice(1)) as DisplayEmotion;
};

// Helper to convert display emotion back to store type
const fromDisplayEmotion = (emotion: DisplayEmotion): EmotionType => {
  return emotion.toLowerCase() as EmotionType;
};

export default function EntriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const playClickSound = useClickSound();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<SortOption>("Newest First");
  const [selectedEmotions, setSelectedEmotions] = useState<DisplayEmotion[]>(
    [],
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showEmotionDropdown, setShowEmotionDropdown] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Get selected theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);
  const tintColor = THEME_COLORS[selectedTheme].backgroundGradient[2];

  // Get entries from store
  const entries = useJournalStore((s) => s.entries);
  const deleteEntryMutation = useDeleteEntry();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.transcript.toLowerCase().includes(query) ||
          entry.title.toLowerCase().includes(query),
      );
    }

    // Filter by emotions
    if (selectedEmotions.length > 0) {
      const emotionFilters = selectedEmotions.map(fromDisplayEmotion);
      filtered = filtered.filter((entry) =>
        emotionFilters.some((emotion) => entry.emotions.includes(emotion)),
      );
    }

    // Sort
    if (selectedSort === "Newest First") {
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      filtered.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    return filtered;
  }, [entries, searchQuery, selectedSort, selectedEmotions]);

  const toggleEmotion = useCallback((emotion: DisplayEmotion) => {
    tapHaptic();
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion],
    );
  }, []);

  const handleEntryPress = useCallback(
    (entry: JournalEntry) => {
      playClickSound();
      tapHaptic();
      router.push({
        pathname: "/entry-detail",
        params: { id: entry.id },
      });
    },
    [router, playClickSound],
  );

  const handleDeleteRequest = useCallback((entryId: string) => {
    warningHaptic();
    setEntryToDelete(entryId);
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!entryToDelete) return;
    confirmHaptic();
    deleteEntryMutation.mutate(entryToDelete);
    setDeleteModalVisible(false);
    setEntryToDelete(null);
  }, [entryToDelete, deleteEntryMutation]);

  const handleDeleteCancel = useCallback(() => {
    tapHaptic();
    setDeleteModalVisible(false);
    setEntryToDelete(null);
  }, []);

  const isFocused = useIsFocused();
  const focusKey = useMemo(() => (isFocused ? "focused" : "blurred"), [
    isFocused,
  ]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <LinearGradient
          colors={Gradients.background}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>
    );
  }

  return (
    <ScreenWrapper style={{ backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView
        key={focusKey}
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={getStaggeredFadeIn(0)}>
          <Text
            style={{
              fontFamily: "Inter_700Bold",
              color: "#FFFFFF",
              fontSize: 22,
            }}
            className="text-center mb-2"
          >
            Your Journal Entries
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: 16,
            }}
            className="text-center mb-4"
          >
            Browse, search, and revisit all your thoughts in one place.
          </Text>

          {
            /* Total Entries */
            <View className="items-center mb-6">
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  color: "#FFFFFF",
                  fontSize: 40,
                }}
                className="text-4xl"
              >
                {filteredEntries.length}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Total Entries
              </Text>
            </View>
          }
        </Animated.View>

        {/* Filter & Search Section */}
        <Animated.View entering={getStaggeredFadeIn(1)} className="mb-6">
          <View className="rounded-3xl overflow-hidden">
            <GlassLayers
              primaryColor={Colors.primary}
              tintColor={tintColor}
              borderRadius={24}
            />
            <View className="p-4">
              <View className="flex-row items-center mb-3">
                <Filter size={16} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                  className="text-sm ml-2"
                >
                  FILTER & SEARCH
                </Text>
              </View>

              {/* Search Bar */}
              <View
                className="flex-row items-center rounded-xl px-4 py-3 mb-3"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <Search size={18} color="#FFFFFF" strokeWidth={2} />
                <TextInput
                  className="flex-1 ml-3"
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "#FFFFFF",
                    fontSize: 15,
                  }}
                  placeholder="Search your thoughts..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <X size={18} color="#FFFFFF" />
                  </Pressable>
                )}
              </View>

              {/* Sort + Emotion Filters */}
              <View className="flex-row gap-3">
                {/* Sort Dropdown */}
                <Pressable
                  className="flex-1 flex-row items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  onPress={() => {
                    tapHaptic();
                    setShowSortDropdown(!showSortDropdown);
                    setShowEmotionDropdown(false);
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      color: "#FFFFFF",
                      fontSize: 14,
                    }}
                  >
                    {selectedSort}
                  </Text>
                  <ChevronDown size={16} color="#FFFFFF" />
                </Pressable>

                {/* Emotion Filter */}
                <Pressable
                  className="flex-1 flex-row items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  onPress={() => {
                    tapHaptic();
                    setShowEmotionDropdown(!showEmotionDropdown);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      color: "#FFFFFF",
                      fontSize: 14,
                    }}
                  >
                    {selectedEmotions.length > 0
                      ? `${selectedEmotions.length} Selected`
                      : "Emotions"}
                  </Text>
                  <ChevronDown size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Entries */}
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry, index) => {
            const displayTitle = entry.title || "Untitled Reflection";
            const primaryColor = EMOTION_COLORS[entry.primaryEmotion] || "#A855F7";

            return (
              <Animated.View
                key={entry.id}
                entering={getStaggeredFadeIn(2 + index)}
              >
                <Pressable
                  className="mb-6 rounded-3xl overflow-hidden relative"
                  style={{
                    shadowColor: tintColor,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.35,
                    shadowRadius: 24,
                    elevation: 8,
                  }}
                  onPress={() => handleEntryPress(entry)}
                >
                  <GlassLayers
                    primaryColor={primaryColor}
                    tintColor={tintColor}
                    borderRadius={24}
                  />

                  <View className="p-5">
                    {/* Header */}
                    <View className="flex-row items-start justify-between mb-4">
                      <View className="flex-1 pr-3">
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            color: "#FFFFFF",
                            fontSize: 18,
                            lineHeight: 24,
                          }}
                          numberOfLines={2}
                        >
                          {displayTitle}
                        </Text>
                      </View>

                      {/* Mini stats */}
                      <View className="items-end">
                        <View className="flex-row items-center mb-1">
                          <Calendar size={14} color="#FFFFFF" />
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 12,
                              marginLeft: 4,
                            }}
                          >
                            {new Date(entry.createdAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" },
                            )}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Activity size={14} color="#FFFFFF" />
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.6)",
                              fontSize: 12,
                              marginLeft: 4,
                            }}
                          >
                            {formatShortDuration(entry.duration)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* AI Emotion Detection — Top 3 Ranked Emotions */}
                    {(entry.aiTopThreeEmotions &&
                      entry.aiTopThreeEmotions.length > 0) ? (
                      <View className="mb-3" style={{ gap: 6 }}>
                        {entry.aiTopThreeEmotions.slice(0, 3).map((item: RankedEmotion) => {
                          const color = EMOTION_COLORS[item.emotion] || primaryColor;
                          const rankLabel = item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉";
                          return (
                            <View
                              key={item.emotion}
                              className="flex-row items-center self-start px-3 py-1.5 rounded-full"
                              style={{ backgroundColor: hexToRgba(color, 0.15), gap: 6 }}
                            >
                              <Text
                                style={{ fontFamily: "Inter_600SemiBold", fontSize: 10, color }}
                              >
                                {rankLabel} {item.intensityLabel}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "Inter_400Regular",
                                  color: "rgba(255,255,255,0.5)",
                                  fontSize: 10,
                                  textTransform: "capitalize",
                                }}
                              >
                                {item.emotion}
                              </Text>
                              <View
                                className="px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: hexToRgba(color, 0.25) }}
                              >
                                <Text
                                  style={{
                                    fontFamily: "Inter_600SemiBold",
                                    color,
                                    fontSize: 9,
                                  }}
                                >
                                  {item.score}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : entry.primaryEmotion ? (
                      /* Legacy fallback for entries without aiTopThreeEmotions */
                      <View className="mb-3">
                        <View
                          className="px-3 py-1.5 rounded-full self-start flex-row items-center"
                          style={{ backgroundColor: hexToRgba(primaryColor, 0.15), gap: 6 }}
                        >
                          <Text
                            style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 12 }}
                          >
                            {entry.emotionIntensityLabels?.[entry.primaryEmotion] ??
                              getEmotionSubLabel(entry.primaryEmotion, entry.emotionIntensity)}
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.5)",
                              fontSize: 10,
                              textTransform: "capitalize",
                            }}
                          >
                            {entry.primaryEmotion}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {/* Conversation Prompt */}
                    {entry.conversationPrompt && (
                      <View className="mb-3">
                        <View
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: hexToRgba(primaryColor, 0.08) }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255, 255, 255, 0.8)",
                            }}
                            className="text-xs italic"
                            numberOfLines={2}
                          >
                            "{entry.conversationPrompt}"
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Transcript Preview - Collapsible */}
                    <View className="mb-3">
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "#FFFFFF",
                          lineHeight: 22,
                        }}
                        className="text-sm"
                        numberOfLines={3}
                      >
                        {entry.transcript}
                      </Text>
                    </View>

                    {/* Topics */}
                    {entry.topics &&
                      entry.topics.length > 0 &&
                      entry.topics.some((t) => t && t.trim().length > 0) && (
                        <View className="mb-4">
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "rgba(255, 255, 255, 0.8)",
                              fontSize: 12,
                              marginBottom: 8,
                            }}
                          >
                            Topics
                          </Text>
                          <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                            {entry.topics
                              .slice(0, 3)
                              .filter((t) => t && t.trim().length > 0)
                              .map((topic, idx) => (
                                <View
                                  key={idx}
                                  className="px-3 py-1 rounded-full"
                                  style={{ backgroundColor: hexToRgba(primaryColor, 0.15) }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: "Inter_400Regular",
                                      color: "rgba(255,255,255,0.85)",
                                      fontSize: 12,
                                    }}
                                  >
                                    {topic}
                                  </Text>
                                </View>
                              ))}
                          </View>
                        </View>
                      )}

                    {/* AI Analysis Snippet */}
                    {entry.aiAnalysis && (
                      <View
                        className="px-4 py-3 rounded-2xl mb-4"
                        style={{ backgroundColor: "rgba(124, 58, 237, 0.1)" }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            color: "rgba(216, 180, 232, 0.95)",
                            lineHeight: 20,
                            fontSize: 13.5,
                          }}
                          numberOfLines={2}
                        >
                          {entry.aiAnalysis}
                        </Text>
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row items-center justify-between pt-1">
                      <Pressable
                        className="flex-row items-center px-5 py-3 rounded-2xl flex-1 justify-center"
                        style={{
                          backgroundColor: primaryColor,
                        }}
                        onPress={() => handleEntryPress(entry)}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            color: "#FFFFFF",
                            fontSize: 14,
                          }}
                        >
                          View Full Analysis
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteRequest(entry.id)}
                        className="ml-3 w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: "rgba(255,107,107,0.15)" }}
                      >
                        <Trash2 size={22} color="#FF6B6B" />
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })
        ) : (
          <Animated.View
            entering={getStaggeredFadeIn(3)}
            className="items-center py-12"
          >
            <View
              className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              <BookOpen size={42} color="#FFFFFF" strokeWidth={1.5} />
            </View>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: "#FFFFFF",
                fontSize: 18,
              }}
              className="mb-2"
            >
              {entries.length === 0
                ? "No Entries Yet"
                : "No Matching Entries"}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.6)",
                fontSize: 15,
                textAlign: "center",
                lineHeight: 22,
                maxWidth: 260,
              }}
            >
              {entries.length === 0
                ? "Start recording your first voice journal to begin tracking your emotional growth."
                : "Try adjusting your filters or search terms to find what you're looking for."}
            </Text>
          </Animated.View>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleDeleteCancel}
        >
          <View className="flex-1 bg-black/70 items-center justify-center px-6">
            <Animated.View
              entering={FadeIn.duration(250)}
              className="w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden"
              style={{ shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 30 }}
            >
              <View className="p-8 items-center">
                <View className="w-16 h-16 rounded-2xl bg-red-500/10 items-center justify-center mb-6">
                  <Trash2 size={36} color="#EF4444" />
                </View>

                <Text
                  className="text-2xl text-white font-bold text-center mb-2"
                  style={{ fontFamily: "Inter_700Bold" }}
                >
                  Delete Entry?
                </Text>

                <Text
                  className="text-zinc-400 text-center leading-6 mb-8"
                  style={{ fontFamily: "Inter_400Regular" }}
                >
                  This action cannot be undone. The journal entry and its analysis
                  will be permanently removed.
                </Text>

                <View className="w-full gap-3">
                  <Pressable
                    onPress={handleDeleteConfirm}
                    className="bg-red-500 py-4 rounded-2xl items-center"
                  >
                    <Text
                      className="text-white font-semibold text-base"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      Yes, Delete Entry
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteCancel}
                    className="border border-zinc-700 py-4 rounded-2xl items-center"
                  >
                    <Text
                      className="text-zinc-300 font-medium"
                      style={{ fontFamily: "Inter_500Medium" }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenWrapper>
  );
}
