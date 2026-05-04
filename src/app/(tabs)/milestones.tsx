import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { shareMilestone } from "@/lib/share-utils";
import {
  Flame,
  Calendar,
  Award,
  Moon,
  Sun,
  Heart,
  Smile,
  Lock,
  Check,
  Trophy,
  Star,
  Target,
  Zap,
  Crown,
  Sparkles,
  ChevronDown,
  X,
  Share2,
  BookOpen,
  PenTool,
  Book,
  Sunrise,
  MoonStar,
  CalendarCheck,
  Clock,
  Settings,
} from "lucide-react-native";
import Animated, {
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
} from "react-native-reanimated";
import { tapHaptic, selectHaptic, successHaptic } from "@/lib/haptics";
import { router } from "expo-router";
import {
  Colors as StaticColors,
  Gradients as StaticGradients,
  Shadows as StaticShadows,
  BorderRadius,
  getThemeColors,
  getThemeGradients,
  getThemeShadows,
} from "@/lib/theme";
import useBadgesStore from "@/lib/state/badges-store";
import useUserStatsStore from "@/lib/state/user-stats-store";
import useOnboardingStore from "@/lib/state/onboarding-store";
import useSettingsStore from "@/lib/state/settings-store";
import { Badge, BadgeCategory, BadgeRarity } from "@/lib/types";
import { hexToRgba, GlassLayers } from "@/lib/glass";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

// Icon mapping for badges
const BADGE_ICONS: Record<string, typeof Flame> = {
  flame: Flame,
  calendar: Calendar,
  trophy: Trophy,
  crown: Crown,
  award: Award,
  star: Star,
  target: Target,
  sun: Sun,
  moon: Moon,
  heart: Heart,
  smile: Smile,
  zap: Zap,
  sparkles: Sparkles,
  "book-open": BookOpen,
  "pen-tool": PenTool,
  book: Book,
  sunrise: Sunrise,
  "moon-star": MoonStar,
  "calendar-check": CalendarCheck,
  clock: Clock,
};

// Rarity colors and effects
const RARITY_CONFIG: Record<
  BadgeRarity,
  { colors: readonly [string, string]; glow: string; label: string }
> = {
  common: {
    colors: [StaticColors.purple200, StaticColors.purple300] as const,
    glow: StaticColors.purple300,
    label: "Common",
  },
  rare: {
    colors: ["#7B5FE8", "#8E6BFF"] as const,
    glow: "#8E6BFF",
    label: "Rare",
  },
  epic: {
    colors: ["#9D4EDD", "#C77DFF"] as const,
    glow: "#C77DFF",
    label: "Epic",
  },
  legendary: {
    colors: ["#FF6B6B", "#FFD93D"] as const,
    glow: "#FFD93D",
    label: "Legendary",
  },
};

type FilterCategory = "all" | BadgeCategory;

const CATEGORY_OPTIONS: {
  value: FilterCategory;
  label: string;
  icon: typeof Award;
}[] = [
  { value: "all", label: "All Badges", icon: Award },
  { value: "streak", label: "Streak", icon: Flame },
  { value: "entries", label: "Entries", icon: Star },
  { value: "consistency", label: "Consistency", icon: Zap },
  { value: "mood", label: "Mood", icon: Heart },
  { value: "time", label: "Time-Based", icon: Sun },
  { value: "special", label: "Special", icon: Sparkles },
];

export default function MilestonesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);

  // Generate dynamic theme colors based on selected theme and dark mode
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  // Get real data from stores
  const getAllBadges = useBadgesStore((s) => s.getAllBadges);
  const getBadgesByCategory = useBadgesStore((s) => s.getBadgesByCategory);
  const unlockedCount = useBadgesStore((s) => s.unlockedCount);
  const referralCode = useBadgesStore((s) => s.referralCode);
  const stats = useUserStatsStore((s) => s.stats);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const allBadges = useMemo(() => getAllBadges(), [getAllBadges]);

  const filteredBadges = useMemo(() => {
    if (selectedCategory === "all") return allBadges;
    return getBadgesByCategory(selectedCategory);
  }, [selectedCategory, allBadges, getBadgesByCategory]);

  const userStats = useMemo(
    () => ({
      currentStreak: stats.currentStreak,
      totalEntries: stats.totalEntries,
      totalBadges: allBadges.length,
      unlockedBadges: unlockedCount,
    }),
    [stats, allBadges.length, unlockedCount],
  );

  const handleCategorySelect = useCallback((category: FilterCategory) => {
    tapHaptic();
    setSelectedCategory(category);
    setDropdownOpen(false);
  }, []);

  const handleBadgePress = useCallback((badge: Badge) => {
    selectHaptic();
    setSelectedBadge(badge);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    tapHaptic();
    setModalVisible(false);
  }, []);

  const handleShare = useCallback(() => {
    if (!selectedBadge?.unlocked) return;
    successHaptic();
    shareMilestone({ badge: selectedBadge, referralCode });
  }, [selectedBadge, referralCode]);

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

  const selectedCategoryOption = CATEGORY_OPTIONS.find(
    (opt) => opt.value === selectedCategory,
  );

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View className="mb-6">
          <View className="flex-row items-center justify-center mb-6">
            <View className="items-center">
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 22,
                }}
                className="mb-2"
              >
                Your Milestones
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  color: "rgba(255, 255, 255, 0.8)",
                }}
                className="text-base"
              >
                Track your progress & earn badges
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats Overview */}
        <Animated.View>
          <StatsOverview stats={userStats} isDarkMode={isDarkMode} />
        </Animated.View>

        {/* Category Dropdown */}
        <Animated.View className="mb-4">
          <CategoryDropdown
            selectedOption={selectedCategoryOption!}
            isOpen={dropdownOpen}
            onToggle={() => {
              tapHaptic();
              setDropdownOpen(!dropdownOpen);
            }}
            onSelect={handleCategorySelect}
            options={CATEGORY_OPTIONS}
            isDarkMode={isDarkMode}
          />
        </Animated.View>

        {/* Badge Grid */}
        <Animated.View>
          <View className="flex-row flex-wrap" style={{ gap: 16 }}>
            {filteredBadges.map((badge, index) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                delay={index * 50}
                onPress={() => handleBadgePress(badge)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Empty State */}
        {filteredBadges.length === 0 && (
          <Animated.View
            className="items-center justify-center"
            style={{ paddingVertical: 60 }}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                color: "rgba(255, 255, 255, 0.8)",
              }}
              className="text-center"
            >
              No badges in this category yet
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Badge Detail Modal */}
      <BadgeModal
        visible={modalVisible}
        badge={selectedBadge}
        onClose={handleCloseModal}
        onShare={handleShare}
      />
    </View>
  );
}

// Stats Overview Component
interface StatsOverviewProps {
  stats: {
    currentStreak: number;
    totalEntries: number;
    totalBadges: number;
    unlockedBadges: number;
  };
  isDarkMode?: boolean;
}

function StatsOverview({ stats, isDarkMode = false }: StatsOverviewProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const darkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, darkMode);

  return (
    <View
      className="mb-6"
      style={{
        backgroundColor: hexToRgba(Colors.primary, 0.1),
        borderWidth: 1,
        borderColor: hexToRgba(Colors.primary, 0.15),
        borderRadius: BorderRadius.xxlarge,
        overflow: "hidden",
        ...StaticShadows.medium,
      }}
    >
      <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
      <View className="p-5">
        <View className="flex-row justify-between">
          <StatItem
            icon={Flame}
            label="Current Streak"
            value={`${stats.currentStreak} ${stats.currentStreak === 1 ? "day" : "days"}`}
            color="#FFFFFF"
            isDarkMode={isDarkMode}
          />
          <StatItem
            icon={Award}
            label="Total Entries"
            value={stats.totalEntries.toString()}
            color="#FFFFFF"
            isDarkMode={isDarkMode}
          />
          <StatItem
            icon={Trophy}
            label="Badges"
            value={`${stats.unlockedBadges}/${stats.totalBadges}`}
            color="#FFFFFF"
            isDarkMode={isDarkMode}
          />
        </View>
      </View>
    </View>
  );
}

interface StatItemProps {
  icon: typeof Flame;
  label: string;
  value: string;
  color: string;
  isDarkMode?: boolean;
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
  isDarkMode = false,
}: StatItemProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const darkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, darkMode);

  return (
    <View className="items-center flex-1">
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: BorderRadius.large,
          backgroundColor: hexToRgba(Colors.primary, 0.15),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Icon size={24} color="#FFFFFF" strokeWidth={2} />
      </View>
      <Text
        style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF" }}
        className="text-base mb-1"
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter_400Regular",
          color: "rgba(255, 255, 255, 0.8)",
        }}
        className="text-xs text-center"
      >
        {label}
      </Text>
    </View>
  );
}

// Category Dropdown Component
interface CategoryDropdownProps {
  selectedOption: { value: FilterCategory; label: string; icon: typeof Award };
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (category: FilterCategory) => void;
  options: typeof CATEGORY_OPTIONS;
  isDarkMode?: boolean;
}

function CategoryDropdown({
  selectedOption,
  isOpen,
  onToggle,
  onSelect,
  options,
  isDarkMode = false,
}: CategoryDropdownProps) {
  const Icon = selectedOption.icon;

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const darkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, darkMode);

  return (
    <View style={{ position: "relative", zIndex: 100 }}>
      <Pressable
        onPress={onToggle}
        style={{
          backgroundColor: hexToRgba(Colors.primary, 0.1),
          borderWidth: 1,
          borderColor: hexToRgba(Colors.primary, 0.15),
          borderRadius: BorderRadius.large,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          overflow: "hidden",
          ...StaticShadows.small,
        }}
      >
        <GlassLayers primaryColor={Colors.primary} borderRadius={16} />
        <View className="flex-row items-center">
          <Icon size={20} color="#FFFFFF" strokeWidth={2} />
          <Text
            style={{ fontFamily: "Inter_500Medium", color: "#FFFFFF" }}
            className="text-base ml-2"
          >
            {selectedOption.label}
          </Text>
        </View>
        <ChevronDown
          size={20}
          color="rgba(255, 255, 255, 0.8)"
          strokeWidth={2}
          style={{ transform: [{ rotate: isOpen ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {isOpen && (
        <Animated.View
          exiting={FadeOut.duration(200)}
          className="mt-2 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: hexToRgba(Colors.primary, 0.1),
            borderWidth: 1,
            borderColor: hexToRgba(Colors.primary, 0.15),
            ...StaticShadows.small,
          }}
        >
          <GlassLayers primaryColor={Colors.primary} borderRadius={16} />
          {options.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === selectedOption.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                className="px-3 py-3"
                style={{
                  backgroundColor: isSelected
                    ? hexToRgba(Colors.primary, 0.15)
                    : "transparent",
                  borderBottomWidth: 1,
                  borderBottomColor: hexToRgba(Colors.primary, 0.1),
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <OptionIcon size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: "Inter_500Medium",
                      color: "#FFFFFF",
                      marginLeft: 12,
                      fontSize: 13,
                    }}
                  >
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

// Badge Card Component
interface BadgeCardProps {
  badge: Badge;
  delay: number;
  onPress: () => void;
}

function BadgeCard({ badge, delay, onPress }: BadgeCardProps) {
  const scale = useSharedValue(1);
  const Icon = BADGE_ICONS[badge.icon] || Award;
  const rarityConfig = RARITY_CONFIG[badge.rarity];

  // Get theme colors for dark mode support
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const formatUnlockDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Animated.View style={[{ width: CARD_WIDTH }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={{
            backgroundColor: hexToRgba(Colors.primary, 0.1),
            borderWidth: 1,
            borderColor: hexToRgba(Colors.primary, 0.15),
            borderRadius: BorderRadius.xlarge,
            padding: 16,
            opacity: 1,
            overflow: "hidden",
            ...StaticShadows.medium,
          }}
        >
          <GlassLayers primaryColor={Colors.primary} borderRadius={20} />
          {/* Badge Icon */}
          <View className="items-center mb-3">
            <View
              style={{
                position: "relative",
                width: 64,
                height: 64,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: hexToRgba(Colors.primary, 0.2),
                  }}
                />
                <View style={{ zIndex: 1 }}>
                  <Icon size={32} color="#FFFFFF" strokeWidth={2} />
                </View>
              </View>

              {/* Lock/Unlock Indicator */}
              <View
                style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: isDarkMode
                    ? hexToRgba(Colors.primary, 0.2)
                    : "#FFFFFF",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: Platform.OS === "android" ? 0 : 3,
                }}
              >
                {badge.unlocked ? (
                  <Check size={14} color={Colors.primary} strokeWidth={3} />
                ) : (
                  <Lock size={14} color={Colors.primary} strokeWidth={2} />
                )}
              </View>
            </View>
          </View>

          {/* Badge Title */}
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
              textAlign: "center",
              fontSize: 14,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {badge.title}
          </Text>

          {/* Badge Rarity */}
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
              fontSize: 10,
              marginBottom: 8,
            }}
          >
            {rarityConfig.label}
          </Text>

          {/* Progress Bar or Unlock Date */}
          {badge.unlocked ? (
            <View className="items-center">
              <View className="flex-row items-center">
                <Check size={12} color="#FFFFFF" strokeWidth={2.5} />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 10,
                    marginLeft: 4,
                  }}
                >
                  {formatUnlockDate(badge.unlockDate)}
                </Text>
              </View>
            </View>
          ) : badge.progress > 0 ? (
            <View>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: hexToRgba(Colors.primary, 0.15),
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.round(badge.progress)}%`,
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </View>
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: 10,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {Math.min(Math.round(badge.progress), 999)}%
              </Text>
            </View>
          ) : (
            <View style={{ height: 6 }} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Badge Detail Modal
interface BadgeModalProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
  onShare: () => void;
}

function BadgeModal({ visible, badge, onClose, onShare }: BadgeModalProps) {
  // Get theme colors - must be before any early returns
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);

  React.useEffect(() => {
    // No glow animation needed for unlocked badges
  }, [visible, badge]);

  if (!badge) return null;

  const Icon = BADGE_ICONS[badge.icon] || Award;
  const rarityConfig = RARITY_CONFIG[badge.rarity];

  const formatUnlockDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Animated.View
          style={{
            backgroundColor: hexToRgba(Colors.primary, 0.1),
            borderRadius: BorderRadius.xxlarge,
            padding: 28,
            width: "100%",
            maxWidth: 400,
            borderWidth: 1,
            borderColor: hexToRgba(Colors.primary, 0.15),
            overflow: "hidden",
            ...StaticShadows.large,
          }}
        >
          <GlassLayers primaryColor={Colors.primary} borderRadius={24} />
          {/* Close Button */}
          <Pressable
            onPress={onClose}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "transparent",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0,
            }}
          >
            <X size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>

          {/* Badge Icon with Glow */}
          <View className="items-center mb-6">
            <View style={{ position: "relative" }}>
              <View
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  elevation: Platform.OS === "android" ? 0 : 8,
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: Colors.primary,
                    borderWidth: 2,
                    borderColor: Colors.primary,
                  }}
                />
                <View style={{ zIndex: 1 }}>
                  <Icon size={50} color="#FFFFFF" strokeWidth={2} />
                </View>
              </View>
            </View>
          </View>

          {/* Badge Title & Rarity */}
          <Text
            style={{
              fontFamily: "Fraunces_700Bold",
              color: "#FFFFFF",
              textAlign: "center",
              fontSize: 24,
              marginBottom: 8,
            }}
          >
            {badge.title}
          </Text>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {rarityConfig.label}
          </Text>

          {/* Description */}
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              color: "rgba(255, 255, 255, 0.7)",
              textAlign: "center",
              fontSize: 15,
              lineHeight: 22,
              marginBottom: 20,
            }}
          >
            {badge.description}
          </Text>

          {/* Requirement */}
          <View
            style={{
              borderRadius: BorderRadius.large,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: hexToRgba(Colors.primary, 0.15),
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 10,
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              REQUIREMENT
            </Text>
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {badge.requirement}
            </Text>
          </View>

          {/* Tip */}
          <View
            style={{
              backgroundColor: hexToRgba(Colors.primary, 0.08),
              borderRadius: BorderRadius.large,
              padding: 14,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: Colors.primary,
              borderWidth: 1,
              borderColor: hexToRgba(Colors.primary, 0.1),
            }}
          >
            <Text
              style={{
                fontFamily: "Inter_600SemiBold",
                color: Colors.primary,
                fontSize: 10,
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              TIP
            </Text>
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 13,
                lineHeight: 21,
              }}
            >
              {badge.tip}
            </Text>
          </View>

          {/* Unlock Date */}
          {badge.unlocked && badge.unlockDate && (
            <View className="items-center mb-6">
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  color: StaticColors.textTertiary,
                  fontSize: 12,
                }}
              >
                Unlocked on {formatUnlockDate(badge.unlockDate)}
              </Text>
            </View>
          )}

          {/* Share Button */}
          {badge.unlocked && (
            <Pressable
              onPress={onShare}
              style={{
                borderRadius: BorderRadius.large,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={StaticGradients.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Share2 size={18} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  Share Milestone
                </Text>
              </LinearGradient>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
