import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  BackHandler,
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
  Microphone,
  CaretUp,
  Tag,
  Timer,
  Check,
} from "phosphor-react-native";
import { Funnel } from "phosphor-react-native";
import Animated, {
  FadeIn,
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
import { ConfirmDialog } from "@/components/ConfirmDialog";

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
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [bulkDeleteModalVisible, setBulkDeleteModalVisible] = useState(false);

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

  const handleLongPress = useCallback((entryId: string) => {
    selectHaptic();
    setIsSelectMode(true);
    setSelectedEntries(new Set([entryId]));
  }, []);

  const toggleEntrySelection = useCallback((entryId: string) => {
    tapHaptic();
    setSelectedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      // Exit select mode if nothing is selected anymore
      if (next.size === 0) {
        setIsSelectMode(false);
      }
      return next;
    });
  }, []);

  const selectAllEntries = useCallback(() => {
    tapHaptic();
    setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
  }, [filteredEntries]);

  // The single, canonical way out of selection mode: instantly deselects
  // everything and exits — no scrolling to find a button, no confirmation
  // needed since nothing destructive happens here. Used by the top bar's
  // "Clear" button and by the hardware back button on Android below.
  const handleClearSelection = useCallback(() => {
    tapHaptic();
    setSelectedEntries(new Set());
    setIsSelectMode(false);
  }, []);

  // Android hardware/gesture back while in selection mode should clear the
  // selection and exit selection mode rather than navigating away from the
  // tab — matching the platform convention for contextual action modes
  // (e.g. Gmail, Google Photos). We only intercept while selecting; with no
  // selection active the event passes through to the default behaviour.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (isSelectMode) {
        handleClearSelection();
        return true; // consume — do not navigate away
      }
      return false; // no selection active, let the system handle back as usual
    });
    return () => subscription.remove();
  }, [isSelectMode, handleClearSelection]);

  const handleBulkDeleteRequest = useCallback(() => {
    warningHaptic();
    setBulkDeleteModalVisible(true);
  }, []);

  const handleBulkDeleteConfirm = useCallback(() => {
    confirmHaptic();
    selectedEntries.forEach((id) => {
      deleteEntryMutation.mutate(id);
    });
    setBulkDeleteModalVisible(false);
    setSelectedEntries(new Set());
    setIsSelectMode(false);
  }, [selectedEntries, deleteEntryMutation]);

  const handleBulkDeleteCancel = useCallback(() => {
    tapHaptic();
    setBulkDeleteModalVisible(false);
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

      {/* ── Selection mode top bar ───────────────────────────────────────────
          Fixed above the scroll content (not inside the ScrollView) so the
          live count, Clear, and Delete actions are always on-screen the
          instant selection mode is entered — no scrolling required to reach
          them, matching standard mobile "contextual action bar" UX. */}
      {isSelectMode && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: insets.top + 10,
            paddingBottom: 14,
            paddingHorizontal: 16,
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderBottomWidth: 2,
            borderBottomColor: "rgba(255, 255, 255, 0.20)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Clear selection — labelled, not icon-only, so it's
                discoverable at a glance. Instantly deselects everything and
                exits selection mode; no confirmation needed since nothing
                destructive happens here. Does the same thing as the Android
                hardware back button while selecting, giving iOS an
                equally-effortless, always-visible way out. */}
            <Pressable
              onPress={handleClearSelection}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.10)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
              }}
            >
              <X size={15} color="#FFFFFF" weight="bold" />
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 13 }}>
                Clear
              </Text>
            </Pressable>

            {/* Live selection count — the primary, easy-to-read focal point
                of the bar, always centred and bold. */}
            <Text
              style={{
                fontFamily: "Inter_700Bold",
                color: "#FFFFFF",
                fontSize: 17,
              }}
            >
              {selectedEntries.size} selected
            </Text>

            {/* Delete — theme-consistent glass pill, disabled state when
                nothing is selected yet (long-press seeds one selection, so
                this is mostly a defensive guard). */}
            <Pressable
              onPress={handleBulkDeleteRequest}
              disabled={selectedEntries.size === 0}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: selectedEntries.size > 0 ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: selectedEntries.size > 0 ? "rgba(239,68,68,0.40)" : "rgba(255,255,255,0.15)",
                opacity: selectedEntries.size === 0 ? 0.5 : 1,
              }}
            >
              <Trash size={18} color={selectedEntries.size > 0 ? "#F87171" : "rgba(255,255,255,0.5)"} weight="duotone" />
            </Pressable>
          </View>
        </Animated.View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: isSelectMode ? insets.top + 90 : insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View key={`entries-hdr-${animationKey}`} entering={ENTER_1} className="mb-6">
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
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
          </View>
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

        {/* Selection hint — shown only outside selection mode; the dedicated
            top bar below takes over once selection mode is entered. */}
        {entries.length > 0 && !isSelectMode && (
          <View style={{ alignItems: "center", marginBottom: 16, paddingHorizontal: 4 }}>
            <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", fontSize: 13, fontStyle: "italic" }}>
              Hold an entry to select &amp; bulk delete
            </Text>
          </View>
        )}

        {/* Entry Cards */}
        <Animated.View key={`entries-lst-${animationKey}`} entering={ENTER_3}>
        {filteredEntries.map((entry, index) => (
          <View key={entry.id}>
            {isSelectMode ? (
              <EntryCard
                entry={entry}
                onPress={() => toggleEntrySelection(entry.id)}
                onDelete={() => {}}
                onLongPress={() => {}}
                surfaceElevatedColor={Colors.surfaceElevated}
                primaryColor={Colors.primary}
                isDarkMode={isDarkMode}
                isSelected={selectedEntries.has(entry.id)}
                isSelectMode={true}
              />
            ) : (
              <EntryCard
                entry={entry}
                onPress={() => handleEntryPress(entry)}
                onDelete={() => handleDeleteRequest(entry.id)}
                onLongPress={() => handleLongPress(entry.id)}
                surfaceElevatedColor={Colors.surfaceElevated}
                primaryColor={Colors.primary}
                isDarkMode={isDarkMode}
                isSelected={false}
                isSelectMode={false}
              />
            )}
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

      {/* Delete Confirmation — canonical ConfirmDialog */}
      <ConfirmDialog
        visible={deleteModalVisible}
        icon="trash"
        title="Delete entry?"
        message="This will permanently delete this journal entry. This action cannot be undone."
        confirmLabel="Delete entry"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Bulk Delete Confirmation — canonical ConfirmDialog */}
      <ConfirmDialog
        visible={bulkDeleteModalVisible}
        icon="trash"
        title={`Delete ${selectedEntries.size} ${selectedEntries.size === 1 ? "entry" : "entries"}?`}
        message="This will permanently delete the selected entries. This action cannot be undone."
        confirmLabel={`Delete ${selectedEntries.size} ${selectedEntries.size === 1 ? "entry" : "entries"}`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={handleBulkDeleteCancel}
      />
    </View>
  );
}

interface EntryCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onDelete: () => void;
  onLongPress: () => void;
  surfaceElevatedColor: string;
  primaryColor: string;
  isDarkMode?: boolean;
  isSelected?: boolean;
  isSelectMode?: boolean;
}

function EntryCard({
  entry,
  onPress,
  onDelete,
  onLongPress,
  surfaceElevatedColor,
  primaryColor,
  isDarkMode = false,
  isSelected = false,
  isSelectMode = false,
}: EntryCardProps) {
  const updateEntry = useJournalStore((s) => s.updateEntry);

  // ── Title display ──────────────────────────────────────────────────────────
  const displayTitle = useMemo(() => {
    const title = entry.title?.trim();
    if (title && !/^(journal entry|untitled|entry|new entry)$/i.test(title)) {
      return title;
    }
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
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={500} style={{ activeOpacity: 0.85 }}>
      <View
        style={[
          {
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderWidth: 2,
            borderColor: isSelected ? primaryColor : "rgba(255, 255, 255, 0.20)",
            borderRadius: 24,
            marginBottom: 14,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: Platform.OS === "android" ? 0 : 4,
          },
        ]}
      >
        <View style={{ padding: 18 }}>
          {/* Row 1: Title + Duration */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <Text
              style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 16, flex: 1, marginRight: 12 }}
              numberOfLines={1}
            >
              {displayTitle}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Clock size={13} color="rgba(255, 255, 255, 0.6)" weight="duotone" />
              <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255, 255, 255, 0.6)", fontSize: 12 }}>
                {formatShortDuration(entry.duration)}
              </Text>
            </View>
          </View>

          {/* Row 2: Date + time */}
          <Text
            style={{ fontFamily: "Inter_400Regular", color: "rgba(255, 255, 255, 0.55)", fontSize: 12, marginBottom: 10 }}
          >
            {formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}
          </Text>

          {/* Row 3: Primary emotion pill */}
          {entry.primaryEmotion && (
            <View style={{ marginBottom: 10 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.22)",
                  gap: 6,
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 12 }}>
                  {entry.emotionIntensityLabels?.[entry.primaryEmotion] ??
                    getEmotionSubLabel(entry.primaryEmotion, entry.emotionIntensity)}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", fontSize: 10, textTransform: "capitalize" }}>
                  {entry.primaryEmotion}
                </Text>
              </View>
            </View>
          )}

          {/* Row 4: Transcript preview (~80 chars) */}
          <Text
            style={{ fontFamily: "Inter_400Regular", color: "rgba(255, 255, 255, 0.85)", fontSize: 14, lineHeight: 21, marginBottom: 10 }}
            numberOfLines={2}
          >
            {entry.transcript && entry.transcript.length > 80
              ? entry.transcript.slice(0, 80).trimEnd() + "..."
              : entry.transcript}
          </Text>

          {/* Row 5: Topics (max 3 pills) */}
          {entry.topics &&
            entry.topics.length > 0 &&
            entry.topics.some((t) => t && t.trim().length > 0) && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {entry.topics
                  .slice(0, 3)
                  .filter((t) => t && t.trim().length > 0)
                  .map((topic, index) => (
                    <View
                      key={index}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: "rgba(255, 255, 255, 0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.18)",
                      }}
                    >
                      <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255, 255, 255, 0.85)", fontSize: 11, textTransform: "capitalize" }}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                {entry.topics.filter((t) => t && t.trim().length > 0).length > 3 && (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: "rgba(255, 255, 255, 0.10)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.18)",
                    }}
                  >
                    <Text style={{ fontFamily: "Inter_400Regular", color: "rgba(255, 255, 255, 0.85)", fontSize: 11 }}>
                      +{entry.topics.filter((t) => t && t.trim().length > 0).length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Selection indicator */}
          {isSelectMode && (
            <View
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 26,
                height: 26,
                borderRadius: 13,
                borderWidth: 2,
                borderColor: isSelected ? primaryColor : "rgba(255,255,255,0.30)",
                backgroundColor: isSelected ? primaryColor : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSelected && (
                <Check size={14} color="#FFFFFF" weight="bold" />
              )}
            </View>
          )}

          {/* Action row — "View full analysis" + delete icon */}
          {!isSelectMode && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  borderRadius: 999,
                  paddingVertical: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.10)",
                  borderWidth: 1.5,
                  borderColor: "rgba(255, 255, 255, 0.22)",
                }}
              >
                <Text style={{ fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)", fontSize: 13 }}>
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
          )}
        </View>
      </View>
    </Pressable>
  );
}
