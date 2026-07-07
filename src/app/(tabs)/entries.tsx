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
import { useRouter, useIsFocused } from "expo-router";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  MagnifyingGlass,
  Calendar,
  Clock,
  CaretDown,
  Trash,
  X,
  BookOpen,
  Pulse,
  Microphone,
  CaretUp,
  Tag,
  Timer,
} from "phosphor-react-native";
import { Funnel } from "phosphor-react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  Easing,
} from "react-native-reanimated";
import {
  TAB_ENTER_1 as ENTER_1,
  TAB_ENTER_2 as ENTER_2,
  TAB_ENTER_3 as ENTER_3,
} from "@/lib/tabAnimations";
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
import { RecommendationCard } from "@/components/RecommendationCard";
// generateRecommendation removed — recommendation comes from /api/analyze response

// Display types for UI (capitalized versions)
type DisplayEmotion =
  | "Happiness"
  | "Sadness"
  | "Anger"
  | "Disgust"
  | "Fear"
  | "Surprise"
  | "Trust"
  | "Anticipation";

const EMOTION_FILTERS: DisplayEmotion[] = [
  "Happiness",
  "Sadness",
  "Anger",
  "Disgust",
  "Fear",
  "Surprise",
  "Trust",
  "Anticipation",
];

const SORT_OPTIONS = ["Newest first", "Oldest first"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

type DurationFilter = "Any" | "Short" | "Medium" | "Long";
const DURATION_FILTERS: { label: string; value: DurationFilter }[] = [
  { label: "Any length", value: "Any" },
  { label: "Short (<1 min)", value: "Short" },
  { label: "Medium (1–3 min)", value: "Medium" },
  { label: "Long (3+ min)", value: "Long" },
];

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
  const isFocused = useIsFocused();
  const [animationKey, setAnimationKey] = useState(0);
  const playClickSound = useClickSound();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<SortOption>("Newest first");
  const [selectedEmotions, setSelectedEmotions] = useState<DisplayEmotion[]>(
    [],
  );
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showEmotionDropdown, setShowEmotionDropdown] = useState(false);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<DurationFilter>("Any");
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

  // Replay entrance animations every time this tab gains focus
  useEffect(() => {
    if (isFocused) setAnimationKey((k) => k + 1);
  }, [isFocused]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Derive available topics from all entries
  const availableTopics = useMemo(() => {
    const topicSet = new Set<string>();
    entries.forEach((e) => {
      (e.topics ?? []).forEach((t) => {
        if (t && t.trim().length > 0) topicSet.add(t.trim().toLowerCase());
      });
    });
    return Array.from(topicSet).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let filtered = [...entries];

    // Filter by search query (searches transcript, title, AND topics)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.transcript.toLowerCase().includes(query) ||
          entry.title.toLowerCase().includes(query) ||
          (entry.topics ?? []).some((t) => t.toLowerCase().includes(query)),
      );
    }

    // Filter by emotions
    if (selectedEmotions.length > 0) {
      const emotionFilters = selectedEmotions.map(fromDisplayEmotion);
      filtered = filtered.filter((entry) =>
        emotionFilters.some((emotion) => entry.emotions.includes(emotion)),
      );
    }

    // Filter by topics
    if (selectedTopics.length > 0) {
      filtered = filtered.filter((entry) =>
        selectedTopics.some((topic) =>
          (entry.topics ?? []).some((t) => t.toLowerCase() === topic),
        ),
      );
    }

    // Filter by duration
    if (selectedDuration !== "Any") {
      filtered = filtered.filter((entry) => {
        const dur = entry.duration ?? 0;
        if (selectedDuration === "Short") return dur < 60;
        if (selectedDuration === "Medium") return dur >= 60 && dur < 180;
        return dur >= 180; // Long
      });
    }

    // Sort
    if (selectedSort === "Newest first") {
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
  }, [entries, searchQuery, selectedSort, selectedEmotions, selectedTopics, selectedDuration]);

  const toggleEmotion = useCallback((emotion: DisplayEmotion) => {
    tapHaptic();
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion],
    );
  }, []);

  const toggleTopic = useCallback((topic: string) => {
    tapHaptic();
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic],
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

  if (!fontsLoaded) {
    return (
      <View className="flex-1" style={{ backgroundColor: Gradients.background[1] }}>
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
    <View className="flex-1" style={{ backgroundColor: Gradients.background[2] }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View key={`entries-hdr-${animationKey}`} entering={ENTER_1} className="mb-6">
          <Text
            style={{
              fontFamily: "Fraunces_700Bold",
              color: "#FFFFFF",
              fontSize: 30,
            }}
            className="text-center mb-2"
          >
            Your journal entries
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
              className="text-xs tracking-wider"
            >
              Total entries
            </Text>
          </View>
        </Animated.View>

        {/* Filter & Search Section */}
        <Animated.View key={`entries-flt-${animationKey}`} entering={ENTER_2}>
          <View
            className="rounded-3xl overflow-hidden mb-6"
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
            <View className="p-4">
              {/* Section Header */}
              <View className="flex-row items-center mb-3">
                <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0, marginRight: 10 }}>
                  <LinearGradient colors={["rgba(255,255,255,0.20)", "rgba(255,255,255,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
                  <Funnel size={24} color="#FFFFFF" weight="duotone" />
                </View>
                <Text
                  style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
                  className="text-sm ml-2"
                >
                  Filter & search
                </Text>
              </View>

              {/* Search Bar */}
              <View
                className="flex-row items-center rounded-xl px-4 py-3 mb-3"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.10)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.15)",
                }}
              >
                <MagnifyingGlass size={18} color="#FFFFFF" weight="duotone" />
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
                    <X size={18} color="#FFFFFF" weight="duotone" />
                  </Pressable>
                )}
              </View>

              {/* Filter Dropdowns — row 1 */}
              <View className="flex-row" style={{ gap: 8 }}>
                {/* Sort Filter */}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setShowSortDropdown(!showSortDropdown);
                    setShowEmotionDropdown(false);
                    setShowTopicDropdown(false);
                    setShowDurationDropdown(false);
                  }}
                  className="flex-1 flex-row items-center justify-between rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Text
                    style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                    className="text-xs"
                  >
                    {selectedSort}
                  </Text>
                  <CaretDown size={14} color="#FFFFFF" weight="duotone" />
                </Pressable>

                {/* Emotion Filter */}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setShowEmotionDropdown(!showEmotionDropdown);
                    setShowSortDropdown(false);
                    setShowTopicDropdown(false);
                    setShowDurationDropdown(false);
                  }}
                  className="flex-1 flex-row items-center justify-between rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    borderWidth: 1,
                    borderColor: selectedEmotions.length > 0 ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Text
                    style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                    className="text-xs"
                  >
                    {selectedEmotions.length > 0
                      ? `${selectedEmotions.length} Emotion${selectedEmotions.length > 1 ? "s" : ""}`
                      : "Emotions"}
                  </Text>
                  <CaretDown size={14} color="#FFFFFF" weight="duotone" />
                </Pressable>
              </View>

              {/* Filter Dropdowns — row 2 */}
              <View className="flex-row mt-2" style={{ gap: 8 }}>
                {/* Topics Filter */}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setShowTopicDropdown(!showTopicDropdown);
                    setShowSortDropdown(false);
                    setShowEmotionDropdown(false);
                    setShowDurationDropdown(false);
                  }}
                  className="flex-1 flex-row items-center justify-between rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    borderWidth: 1,
                    borderColor: selectedTopics.length > 0 ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Text
                    style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                    className="text-xs"
                  >
                    {selectedTopics.length > 0
                      ? `${selectedTopics.length} Topic${selectedTopics.length > 1 ? "s" : ""}`
                      : "Topics"}
                  </Text>
                  <CaretDown size={14} color="#FFFFFF" weight="duotone" />
                </Pressable>

                {/* Duration Filter */}
                <Pressable
                  onPress={() => {
                    tapHaptic();
                    setShowDurationDropdown(!showDurationDropdown);
                    setShowSortDropdown(false);
                    setShowEmotionDropdown(false);
                    setShowTopicDropdown(false);
                  }}
                  className="flex-1 flex-row items-center justify-between rounded-xl px-3 py-3"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.10)",
                    borderWidth: 1,
                    borderColor: selectedDuration !== "Any" ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.15)",
                  }}
                >
                  <Text
                    style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
                    className="text-xs"
                  >
                    {selectedDuration === "Any" ? "Duration" : DURATION_FILTERS.find(d => d.value === selectedDuration)?.label}
                  </Text>
                  <CaretDown size={14} color="#FFFFFF" weight="duotone" />
                </Pressable>
              </View>

              {/* Sort Dropdown */}
              {showSortDropdown && (
                <View
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  }}
                >
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
                            ? "rgba(255, 255, 255, 0.15)"
                            : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(255, 255, 255, 0.10)",
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
                </View>
              )}

              {/* Emotion Dropdown */}
              {showEmotionDropdown && (
                <View
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  }}
                >
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
                        className="px-3 py-2 rounded-full"
                        style={{
                          backgroundColor: selectedEmotions.includes(emotion)
                            ? "rgba(255, 255, 255, 0.22)"
                            : "rgba(255, 255, 255, 0.08)",
                          borderWidth: 1,
                          borderColor: selectedEmotions.includes(emotion)
                            ? "rgba(255, 255, 255, 0.35)"
                            : "rgba(255, 255, 255, 0.15)",
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
                </View>
              )}

              {/* Topics Dropdown */}
              {showTopicDropdown && (
                <View
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  }}
                >
                  {availableTopics.length > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      {availableTopics.map((topic) => (
                        <Pressable
                          key={topic}
                          onPress={() => toggleTopic(topic)}
                          className="px-3 py-2 rounded-full"
                          style={{
                            backgroundColor: selectedTopics.includes(topic)
                              ? "rgba(255, 255, 255, 0.22)"
                              : "rgba(255, 255, 255, 0.08)",
                            borderWidth: 1,
                            borderColor: selectedTopics.includes(topic)
                              ? "rgba(255, 255, 255, 0.35)"
                              : "rgba(255, 255, 255, 0.15)",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              fontSize: 14,
                              color: "#FFFFFF",
                              textTransform: "capitalize",
                            }}
                          >
                            {topic}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={{ padding: 16, alignItems: "center" }}>
                      <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
                        Topics will appear here after you record entries
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Duration Dropdown */}
              {showDurationDropdown && (
                <View
                  className="mt-2 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 2,
                    borderColor: "rgba(255, 255, 255, 0.20)",
                  }}
                >
                  {DURATION_FILTERS.map((dur) => (
                    <Pressable
                      key={dur.value}
                      onPress={() => {
                        tapHaptic();
                        setSelectedDuration(dur.value);
                        setShowDurationDropdown(false);
                      }}
                      className="px-3 py-3"
                      style={{
                        backgroundColor:
                          selectedDuration === dur.value
                            ? "rgba(255, 255, 255, 0.15)"
                            : "transparent",
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(255, 255, 255, 0.10)",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_500Medium",
                          fontSize: 14,
                          color: "#FFFFFF",
                        }}
                      >
                        {dur.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Entry Cards */}
        <Animated.View key={`entries-lst-${animationKey}`} entering={ENTER_3}>
        {filteredEntries.map((entry, index) => (
          <View key={entry.id}>
            <EntryCard
              entry={entry}
              onPress={() => handleEntryPress(entry)}
              onDelete={() => handleDeleteRequest(entry.id)}
              surfaceElevatedColor={Colors.surfaceElevated}
              primaryColor={Colors.primary}
              isDarkMode={isDarkMode}
            />
          </View>
        ))}

        {/* Empty State */}
        {filteredEntries.length === 0 && (
          <View className="items-center py-8">
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
              className="text-center text-lg mb-2"
            >
              {entries.length === 0 ? "No entries yet" : "No matches found"}
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
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleDeleteCancel}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="rounded-3xl overflow-hidden w-full max-w-sm"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderWidth: 2,
              borderColor: "rgba(255, 255, 255, 0.20)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
            }}
          >
            <LinearGradient
              colors={Gradients.background}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                padding: 24,
                borderRadius: 24,
              }}
            >
              <View className="items-center mb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-4"
                  style={{ backgroundColor: "rgba(239, 68, 68, 0.15)" }}
                >
                  <Trash size={32} color="#FFFFFF" weight="duotone" />
                </View>
                <Text
                  className="text-2xl font-bold mb-2 text-center"
                  style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}
                >
                  Delete entry?
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
                      Delete entry
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
                      color: "#FFFFFF",
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
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
  // ── Recommendation state ───────────────────────────────────────────────────
  // Recommendation text is always populated from the /api/analyze response's
  // recommendation field at save time — no separate /api/recommend call needed.
  const [recommendationText] = useState<string | null>(
    entry.aiReflection?.trim() || null,
  );
  const isGenerating = false;

  const updateEntry = useJournalStore((s) => s.updateEntry);

  // ── Title display ──────────────────────────────────────────────────────────
  // Display the AI-generated title stored on the entry.
  // For legacy entries that still have the generic "Journal Entry" placeholder,
  // fall back to the first 50 chars of the transcript so they still look meaningful.
  const displayTitle = useMemo(() => {
    const title = entry.title?.trim();
    if (title && !/^(journal entry|untitled|entry|new entry)$/i.test(title)) {
      return title;
    }
    // Legacy fallback: derive a title from the transcript
    const firstSentence = (entry.transcript || "").split(/[.!?\n]/)[0]?.trim() ?? "";
    if (firstSentence.length > 0) {
      return firstSentence.length > 50
        ? firstSentence.slice(0, 50).trimEnd() + "..."
        : firstSentence;
    }
    return "Journal entry";
  }, [entry.title, entry.transcript]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Pressable onPress={onPress} style={{ activeOpacity: 0.85 }}>
      <View
        style={[
          {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: "rgba(255, 255, 255, 0.20)",
            borderRadius: 24,
            marginBottom: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: Platform.OS === "android" ? 0 : 4,
          },
        ]}
      >
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
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.20)",
                    }}
                  >
                    <Microphone size={12} color="rgba(255,255,255,0.85)" weight="duotone" />
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
                weight="duotone"
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
              <Pulse
                size={14}
                color="rgba(255, 255, 255, 0.7)"
                weight="duotone"
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
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.22)",
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
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                }}
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

          {/* Transcript Preview */}
          <View className="mb-3">
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "#FFFFFF",
                lineHeight: 22,
              }}
              className="text-sm"
            >
              {entry.transcript && entry.transcript.length > 60
                ? entry.transcript.slice(0, 60).trimEnd() + "..."
                : entry.transcript}
            </Text>
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
                  className="text-xs mb-2"
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
                          backgroundColor: "rgba(255, 255, 255, 0.10)",
                          borderWidth: 1,
                          borderColor: "rgba(255, 255, 255, 0.18)",
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
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.18)",
                      }}
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

          {/* Recommendation Card (compact inline) */}
          {entry.transcript && entry.transcript.trim().length > 0 && (
            <View className="mb-4">
              <RecommendationCard
                advice={recommendationText}
                isGenerating={isGenerating}
                themeColor={primaryColor}
                compact
              />
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

          {/* Action row — delete only; whole card is tappable to open */}
          <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
            <View
              className="flex-1 rounded-full py-3 items-center flex-row justify-center"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.10)",
                borderWidth: 1.5,
                borderColor: "rgba(255, 255, 255, 0.22)",
                gap: 6,
              }}
            >
              <Text
                style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" }}
                className="text-sm"
              >
                View full analysis
              </Text>
            </View>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Trash size={20} color="#FFFFFF" weight="duotone" />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
