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
  const focusKey = useMemo(() => isFocused ? 'focused' : 'blurred', [isFocused]);

  if (!fontsLoaded) {
    return (
      <View className="flex-1" style={{ backgroundColor: Colors.background }}>
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
              fontFamily: "Fraunces_700Bold",
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
            }}
            className="text-sm text-center mb-4"
          >
            Browse, search, and revisit all your{"\n"}journal entries in one
            place.
          </Text>

          {/* Total Entries */}
          <View className="items-center mb-6">
            <Text
              style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}
              className="text-4xl"
            >
              {filteredEntries.length}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                color: "rgba(255, 255, 255, 0.8)",
              }}
              className="text-xs uppercase tracking-wider"
            >
              Total Entries
            </Text>
          </View>
        </Animated.View>

        {/* Filter & Search Section */}
        <Animated.View entering={getStaggeredFadeIn(1)}>
          <View
            className="rounded-3xl overflow-hidden mb-6"
            style={{
              backgroundColor: hexToRgba(Colors.primary, 0.1),
              borderWidth: 1,
              borderColor: hexToRgba(Colors.primary, 0.15),
            }}
          >
            <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
            <View className="p-4">
              {/* Section Header */}
              <View className="flex-row items-center mb-3">
                <Filter size={16} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  className="text-sm ml-2"
                >
                  FILTER & SEARCH
                </Text>
              </View>

              {/* Search Bar */}
              <View
                className="flex-row items-center rounded-xl px-4 py-3 mb-3"
                style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
              >
                <Search size={18} color="#FFFFFF" strokeWidth={2} />
                <TextInput
                  className="flex-1 ml-3"
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "#FFFFFF",
                  }}
                  placeholder="Search your thoughts..."
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <X size={18} color="#FFFFFF" strokeWidth={2} />
                  </Pressable>
                )}
              </View>

              {/* Filter Dropdowns */}
              <View className="flex-row" style={{ gap: 8 }}>
                {/* Sort Filter */}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setShowSortDropdown(!showSortDropdown);
                    setShowEmotionDropdown(false);
                  }}
                  className="flex-1 flex-row items-center justify-between rounded-xl px-3 py-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
                >
                  <Text
                    style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                    className="text-xs"
                  >
                    {selectedSort}
                  </Text>
                  <ChevronDown size={14} color="#FFFFFF" strokeWidth={2} />
                </Pressable>

                {/* Emotion Filter */}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setShowEmotionDropdown(!showEmotionDropdown);
                    setShowSortDropdown(false);
                  }}
                  className="flex-1 flex-row items-center justify-between rounded-xl px-3 py-3"
                  style={{ backgroundColor: hexToRgba(Colors.primary, 0.15) }}
                >
                  <Text
                    style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                    className="text-xs"
                  >
                    {selectedEmotions.length > 0
                      ? `${selectedEmotions.length} Selected`
                      : "Emotions"}
                  </Text>
                  <ChevronDown size={14} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
              </View>

              {/* Sort Dropdown */}
              {showSortDropdown && (
                <Animated.View
                  exiting={FadeOut.duration(200)}
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: hexToRgba(Colors.primary, 0.1),
                    borderWidth: 1,
                    borderColor: hexToRgba(Colors.primary, 0.15),
                  }}
                >
                  <GlassLayers
                    primaryColor={Colors.primary}
                    borderRadius={16}
                  />
                  {SORT_OPTIONS.map((sort) => (
                    <Pressable
                      key={sort}
                      onPress={() => {
                        tapHaptic();
                        setSelectedSort(sort);
                        setShowSortDropdown(false);
                      }}
                      className="px-3 py-3"
                      style={{
                        backgroundColor:
                          selectedSort === sort
                            ? hexToRgba(Colors.primary, 0.15)
                            : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: hexToRgba(Colors.primary, 0.1),
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 14,
                          color: "#FFFFFF",
                        }}
                      >
                        {sort}
                      </Text>
                    </Pressable>
                  ))}
                </Animated.View>
              )}

              {/* Emotion Dropdown */}
              {showEmotionDropdown && (
                <Animated.View
                  exiting={FadeOut.duration(200)}
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: hexToRgba(Colors.primary, 0.1),
                    borderWidth: 1,
                    borderColor: hexToRgba(Colors.primary, 0.15),
                  }}
                >
                  <GlassLayers
                    primaryColor={Colors.primary}
                    borderRadius={16}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    {EMOTION_FILTERS.map((emotion) => (
                      <Pressable
                        key={emotion}
                        onPress={() => toggleEmotion(emotion)}
                        className="px-3 py-3 rounded-full"
                        style={{
                          backgroundColor: selectedEmotions.includes(emotion)
                            ? hexToRgba(Colors.primary, 0.15)
                            : "transparent",
                          borderBottomWidth: 1,
                          borderBottomColor: hexToRgba(Colors.primary, 0.1),
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            fontSize: 14,
                            color: "#FFFFFF",
                          }}
                        >
                          {emotion}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Entry Cards */}
        {filteredEntries.map((entry, index) => (
          <Animated.View key={entry.id} entering={getStaggeredFadeIn(2 + index)}>
            <EntryCard
              entry={entry}
              onPress={() => handleEntryPress(entry)}
              onDelete={() => handleDeleteRequest(entry.id)}
              surfaceElevatedColor={Colors.surfaceElevated}
              primaryColor={Colors.primary}
              isDarkMode={isDarkMode}
            />
          </Animated.View>
        ))}

        {/* Empty State */}
        {filteredEntries.length === 0 && (
          <Animated.View className="items-center py-8">
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
              className="text-center text-lg mb-2"
            >
              {entries.length === 0 ? "No Entries Yet" : "No Matches Found"}
            </Text>
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255, 255, 255, 0.8)",
              }}
              className="text-center"
            >
              {entries.length === 0
                ? "Start recording your thoughts\nto see them here."
                : "Try adjusting your filters\nto find what you're looking for."}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
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
                  data-testid="confirm-delete-entry-button"
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
                  data-testid="cancel-delete-entry-button"
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
    </View>
  );
}

interface EntryCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onDelete: () => void;
  surfaceElevatedColor: string;
  primaryColor: string;
  isDarkMode?: boolean;
}

function EntryCard({
  entry,
  onPress,
  onDelete,
  surfaceElevatedColor,
  primaryColor,
  isDarkMode = false,
}: EntryCardProps) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: withTiming(0.1 + glow.value * 0.3),
    shadowRadius: withTiming(20 + glow.value * 8),
  }));

  const handlePressIn = () => {
    scale.value = withTiming(BUTTON_PRESS_SCALE, { duration: 0 });
    glow.value = withTiming(1, { duration: 50 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: BUTTON_RELEASE_DURATION });
    glow.value = withTiming(0, { duration: BUTTON_RELEASE_DURATION });
  };
// ...
      <Animated.View
        style={[
          {
            backgroundColor: hexToRgba(primaryColor, 0.1),
            borderWidth: 1,
            borderColor: hexToRgba(primaryColor, 0.15),
            borderRadius: 24,
            marginBottom: 16,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 20,
            elevation: Platform.OS === "android" ? 0 : 6,
          },
          animatedStyle,
        ]}
      >

        <GlassLayers primaryColor={primaryColor} borderRadius={24} />
        <View className="p-5">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  className="text-lg flex-1"
                  numberOfLines={1}
                >
                  {displayTitle}
                </Text>
                {entry.audioUri && (
                  <View
                    className="px-2 py-1 rounded-full flex-row items-center"
                    style={{ backgroundColor: `${primaryColor}30` }}
                  >
                    <Mic size={12} color={primaryColor} strokeWidth={2.5} />
                  </View>
                )}
              </View>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
                className="text-xs"
              >
                {formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}
              </Text>
            </View>
          </View>

          {/* Date & Duration */}
          <View className="flex-row items-center mb-3" style={{ gap: 12 }}>
            <View className="flex-row items-center">
              <Clock
                size={14}
                color="rgba(255, 255, 255, 0.7)"
                strokeWidth={2}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
                className="text-xs ml-1"
              >
                {formatShortDuration(entry.duration)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Activity
                size={14}
                color="rgba(255, 255, 255, 0.7)"
                strokeWidth={2}
              />
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.7)",
                }}
                className="text-xs ml-1"
              >
                {entry.emotionIntensity}% intensity
              </Text>
            </View>
          </View>

          {/* Primary Emotion */}
          {entry.primaryEmotion && (
            <View className="mb-3">
              <View
                className="px-3 py-1.5 rounded-full self-start flex-row items-center"
                style={{
                  backgroundColor: hexToRgba(primaryColor, 0.15),
                  gap: 6,
                }}
              >
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  className="text-xs"
                >
                  {/* Show intensity-adjusted sub-label from saved labels, or compute on-the-fly */}
                  {entry.emotionIntensityLabels?.[entry.primaryEmotion] ??
                    getEmotionSubLabel(
                      entry.primaryEmotion,
                      entry.emotionIntensity,
                    )}
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
          )}

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

          {/* Transcript Preview — Collapsible */}
          <View className="mb-3">
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "#FFFFFF",
                lineHeight: 22,
              }}
              className="text-sm"
              numberOfLines={transcriptExpanded ? undefined : 2}
            >
              {entry.transcript}
            </Text>
            {entry.transcript && entry.transcript.length > 100 && (
              <Pressable
                onPress={() => {
                  tapHaptic();
                  setTranscriptExpanded(!transcriptExpanded);
                }}
                className="mt-1"
              >
                <Text
                  style={{
                    fontFamily: "Inter_500Medium",
                    color: primaryColor,
                    fontSize: 13,
                  }}
                >
                  {transcriptExpanded ? "Show less" : "Read more"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Topics */}
          {entry.topics &&
            entry.topics.length > 0 &&
            entry.topics.some((t) => t && t.trim().length > 0) && (
              <View className="mb-3">
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "rgba(255, 255, 255, 0.8)",
                  }}
                  className="text-xs uppercase mb-2"
                >
                  Topics
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {entry.topics
                    .slice(0, 3)
                    .filter((t) => t && t.trim().length > 0)
                    .map((topic, index) => (
                      <View
                        key={index}
                        className="px-2 py-1 rounded-full"
                        style={{
                          backgroundColor: hexToRgba(primaryColor, 0.1),
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            color: "rgba(255, 255, 255, 0.9)",
                          }}
                          className="text-xs capitalize"
                        >
                          {topic}
                        </Text>
                      </View>
                    ))}
                  {entry.topics.filter((t) => t && t.trim().length > 0).length >
                    3 && (
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: hexToRgba(primaryColor, 0.1) }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255, 255, 255, 0.9)",
                        }}
                        className="text-xs"
                      >
                        +
                        {entry.topics.filter((t) => t && t.trim().length > 0)
                          .length - 3}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

          {/* AI Analysis Snippet */}
          {entry.aiAnalysis && entry.aiAnalysis.trim().length > 1 && (
            <View className="mb-4">
              <View
                className="p-3 rounded-lg"
                style={{
                  backgroundColor: hexToRgba(primaryColor, 0.08),
                  borderWidth: 1,
                  borderColor: hexToRgba(primaryColor, 0.12),
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255, 255, 255, 0.9)",
                    lineHeight: 22,
                  }}
                  className="text-xs"
                  numberOfLines={2}
                >
                  {entry.aiAnalysis}
                </Text>
              </View>
            </View>
          )}

          {/* Audio Player */}
          {entry.audioUri && (
            <View className="mb-4">
              <AudioPlayer
                audioUri={entry.audioUri}
                primaryColor={primaryColor}
                isDarkMode={isDarkMode}
              />
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row items-center" style={{ gap: 12 }}>
            <Pressable
              onPress={onPress}
              className="flex-1 rounded-full py-3 items-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Text
                style={{ fontFamily: "Inter_600SemiBold" }}
                className="text-sm text-white"
              >
                View Full Analysis
              </Text>
            </Pressable>
            <Pressable onPress={onDelete}>
              <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}
