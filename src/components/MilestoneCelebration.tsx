/**
 * MilestoneCelebration
 *
 * Full-screen badge unlock celebration modal. Enhancements over the original:
 *
 * THEME INTEGRATION
 *  - Confetti colours are seeded from the active theme's gradient palette so
 *    the burst always feels in-brand rather than generic rainbow.
 *  - Card uses a real LinearGradient drawn from backgroundGradient instead of
 *    the flat near-black tile.
 *  - Overlay scrim blends the theme's gradient end colour with a dark base.
 *
 * RARITY SYSTEM
 *  - Four distinct rarity tiers (Common / Rare / Epic / Legendary) each carry
 *    their own gradient pair, glow colour, and label colour applied to the
 *    icon ring, the chip, the top accent bar and the glow shadow.
 *  - Legendary tier adds a slow, continuous golden shimmer / pulse on the icon
 *    ring so it reads as truly special.
 *
 * BADGE ICON
 *  - The icon circle is filled with the rarity gradient (LinearGradient).
 *  - For streak-category badges the AnimatedStreakFlame component replaces the
 *    static icon, giving it its breathing + glow-ring behaviour.
 *  - Non-streak badges get a continuous gentle pulse on the icon circle
 *    (scale 1.0 → 1.06 → 1.0, 2 s loop) so the visual never goes dead.
 *
 * TOP ACCENT BAR
 *  - Replaced the 3 px flat strip with a 6 px LinearGradient bar that uses
 *    the rarity gradient colours, giving each tier a distinct look.
 *
 * BUTTONS
 *  - Share button uses the theme's micButtonGradient (3-stop) instead of the
 *    single flat themeColor fill.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, Modal, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { celebrationHaptic, tapHaptic, selectHaptic } from "@/lib/haptics";
import {
  Share2,
  X,
  Flame,
  Calendar,
  Award,
  Moon,
  Sun,
  Heart,
  Trophy,
  Star,
  Target,
  Zap,
  Crown,
  Sparkles,
  BookOpen,
  PenTool,
  Book,
  Sunrise,
  MoonStar,
  CalendarCheck,
  Clock,
  Scale,
  Library,
  Mic,
  Activity,
  Compass,
} from "lucide-react-native";
import useBadgesStore from "@/lib/state/badges-store";
import { shareMilestone } from "@/lib/share-utils";
import { useMilestoneSound } from "@/lib/hooks/useMilestoneSound";
import { Badge, BadgeRarity } from "@/lib/types";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { AnimatedStreakFlame } from "@/components/AnimatedStreakFlame";
import useUserStatsStore from "@/lib/state/user-stats-store";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Icon map ─────────────────────────────────────────────────────────────────

const BADGE_ICONS: Record<
  string,
  React.ComponentType<{ size: number; color: string; strokeWidth: number }>
> = {
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
  zap: Zap,
  sparkles: Sparkles,
  "book-open": BookOpen,
  "pen-tool": PenTool,
  book: Book,
  library: Library,
  sunrise: Sunrise,
  "moon-star": MoonStar,
  "calendar-check": CalendarCheck,
  clock: Clock,
  scale: Scale,
  mic: Mic,
  activity: Activity,
  compass: Compass,
};

// ─── Rarity visual config ─────────────────────────────────────────────────────

const RARITY_CONFIG: Record<
  BadgeRarity,
  {
    gradient: readonly [string, string];
    glow: string;
    chipBg: string;
    chipBorder: string;
    chipText: string;
    label: string;
  }
> = {
  common: {
    gradient: ["#9B8FD4", "#7B68C8"] as const,
    glow: "#9B8FD4",
    chipBg: "rgba(155, 143, 212, 0.18)",
    chipBorder: "rgba(155, 143, 212, 0.45)",
    chipText: "#C4B9F0",
    label: "Common",
  },
  rare: {
    gradient: ["#7B5FE8", "#5A3FC0"] as const,
    glow: "#8E6BFF",
    chipBg: "rgba(123, 95, 232, 0.20)",
    chipBorder: "rgba(142, 107, 255, 0.50)",
    chipText: "#B09CFF",
    label: "Rare",
  },
  epic: {
    gradient: ["#C77DFF", "#9D4EDD"] as const,
    glow: "#C77DFF",
    chipBg: "rgba(199, 125, 255, 0.20)",
    chipBorder: "rgba(199, 125, 255, 0.50)",
    chipText: "#DDA8FF",
    label: "Epic",
  },
  legendary: {
    gradient: ["#FFD93D", "#FF6B6B"] as const,
    glow: "#FFD93D",
    chipBg: "rgba(255, 217, 61, 0.18)",
    chipBorder: "rgba(255, 217, 61, 0.50)",
    chipText: "#FFE580",
    label: "Legendary",
  },
};

// ─── Confetti — theme-tinted particles ────────────────────────────────────────

function buildParticles(themeGradStart: string, themeGradEnd: string, themeAccent: string) {
  // Mix theme colours with a couple of neutral brights for variety
  const palette = [
    themeGradStart,
    themeGradEnd,
    themeAccent,
    "#FFFFFF",
    "#FFD93D",
    themeGradStart + "CC",
    themeAccent + "AA",
    themeGradEnd + "DD",
  ];
  return Array.from({ length: 26 }, (_, i) => ({
    id: i,
    x: (i / 26) * SW + ((i % 3) - 1) * 18,
    color: palette[i % palette.length],
    delay: i * 48,
    duration: 1800 + (i % 5) * 200,
    driftX: ((i % 4) - 1.5) * 60,
    rot: (i % 2 === 0 ? 1 : -1) * (190 + i * 14),
    size: i % 3 === 0 ? 11 : 7,
    shape: i % 4 === 0 ? "circle" : "rect",
  }));
}

function Particle({
  cfg,
  run,
}: {
  cfg: ReturnType<typeof buildParticles>[0];
  run: boolean;
}) {
  const y = useSharedValue(-20);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!run) return;
    y.value = withDelay(cfg.delay, withTiming(SH + 40, { duration: cfg.duration }));
    x.value = withDelay(cfg.delay, withTiming(cfg.driftX, { duration: cfg.duration }));
    rot.value = withDelay(cfg.delay, withTiming(cfg.rot, { duration: cfg.duration }));
    opacity.value = withDelay(
      cfg.delay,
      withSequence(
        withTiming(0.95, { duration: 100 }),
        withDelay(cfg.duration - 600, withTiming(0, { duration: 500 })),
      ),
    );
  }, [run]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { translateX: x.value },
      { rotate: `${rot.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: "absolute",
          top: 0,
          left: cfg.x,
          width: cfg.size,
          height: cfg.shape === "circle" ? cfg.size : cfg.size * 1.6,
          borderRadius: cfg.shape === "circle" ? cfg.size / 2 : 2,
          backgroundColor: cfg.color,
        },
      ]}
    />
  );
}

// ─── Icon circle with gradient + optional animated streak flame ──────────────

interface BadgeIconCircleProps {
  badge: Badge;
  rarity: (typeof RARITY_CONFIG)[BadgeRarity];
  currentStreak: number;
  emojiStyle: ReturnType<typeof useAnimatedStyle>;
}

function BadgeIconCircle({ badge, rarity, currentStreak, emojiStyle }: BadgeIconCircleProps) {
  // Continuous gentle pulse on the icon circle (non-legendary)
  const ringPulse = useSharedValue(1);
  // Legendary: slower, more dramatic glow pulse
  const legendaryPulse = useSharedValue(0.7);

  const isLegendary = badge.rarity === "legendary";

  useEffect(() => {
    cancelAnimation(ringPulse);
    cancelAnimation(legendaryPulse);
    if (isLegendary) {
      legendaryPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      ringPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }
  }, [isLegendary]);

  const pulseBorderStyle = useAnimatedStyle(() => ({
    opacity: isLegendary ? legendaryPulse.value : 1,
    transform: [{ scale: isLegendary ? 1 + (1 - legendaryPulse.value) * 0.08 : ringPulse.value }],
  }));

  const isStreakBadge = badge.category === "streak";

  return (
    <Animated.View style={[emojiStyle, { alignItems: "center", justifyContent: "center" }]}>
      {/* Outer glow ring — pulses on legendary, breathes on others */}
      <Animated.View
        pointerEvents="none"
        style={[
          pulseBorderStyle,
          {
            position: "absolute",
            width: 104,
            height: 104,
            borderRadius: 52,
            borderWidth: isLegendary ? 2 : 1.5,
            borderColor: rarity.glow + (isLegendary ? "AA" : "55"),
          },
        ]}
      />

      {/* Gradient-filled icon circle */}
      <View
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: rarity.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 20,
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={rarity.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            width: 88,
            height: 88,
            borderRadius: 44,
          }}
        />
        {isStreakBadge ? (
          <AnimatedStreakFlame
            streak={currentStreak}
            size={36}
            badgeSize={72}
            badgeRadius={36}
            badgeColor="transparent"
            glowColor={rarity.glow + "88"}
            iconColor="#FFFFFF"
            strokeWidth={1.8}
          />
        ) : (
          (() => {
            const BadgeIcon = BADGE_ICONS[badge.icon] ?? Award;
            return <BadgeIcon size={42} color="#FFFFFF" strokeWidth={1.5} />;
          })()
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MilestoneCelebration() {
  const pendingCelebrations = useBadgesStore((s) => s.pendingCelebrations);
  const referralCode = useBadgesStore((s) => s.referralCode);
  const dequeueCelebration = useBadgesStore((s) => s.dequeueCelebration);
  const getBadgeWithState = useBadgesStore((s) => s.getBadgeWithState);
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const currentStreak = useUserStatsStore((s) => s.stats.currentStreak);

  const { playCelebration, playBadgePop } = useMilestoneSound();

  const [visible, setVisible] = React.useState(false);
  const [badge, setBadge] = React.useState<Badge | null>(null);
  const [confettiOn, setConfettiOn] = React.useState(false);
  const [particles, setParticles] = React.useState(() =>
    buildParticles(
      THEME_COLORS.darkMode.gradientStart,
      THEME_COLORS.darkMode.gradientEnd,
      THEME_COLORS.darkMode.accent,
    ),
  );

  // Animations
  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.5);
  const cardOpacity = useSharedValue(0);
  const emojiScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  const theme = THEME_COLORS[selectedTheme] ?? THEME_COLORS.darkMode;
  // Use the active theme color for all badge accents — matches the Awards screen
  const themeColor = theme.accent;
  const rarity = badge ? {
    gradient: [themeColor, themeColor + "BB"] as readonly [string, string],
    glow: themeColor,
    chipBg: themeColor + "2E",
    chipBorder: themeColor + "80",
    chipText: "#FFFFFF",
    label: RARITY_CONFIG[badge.rarity].label,
  } : {
    gradient: [themeColor, themeColor + "BB"] as readonly [string, string],
    glow: themeColor,
    chipBg: themeColor + "2E",
    chipBorder: themeColor + "80",
    chipText: "#FFFFFF",
    label: "Common",
  };

  // Watch for new celebrations
  useEffect(() => {
    if (pendingCelebrations.length > 0 && !visible) {
      const badgeId = dequeueCelebration();
      if (!badgeId) return;
      const fullBadge = getBadgeWithState(badgeId);
      if (!fullBadge) return;

      // Build theme-tinted confetti for this celebration
      setParticles(
        buildParticles(theme.gradientStart, theme.gradientEnd, theme.accent),
      );

      setBadge(fullBadge);
      setVisible(true);
    }
  }, [pendingCelebrations.length]);

  // Entrance animation
  useEffect(() => {
    if (!visible) return;

    overlayOpacity.value = 0;
    cardScale.value = 0.5;
    cardOpacity.value = 0;
    emojiScale.value = 0;
    contentOpacity.value = 0;

    playCelebration();
    setTimeout(() => playBadgePop(), 350);
    setTimeout(() => setConfettiOn(true), 50);

    overlayOpacity.value = withTiming(1, { duration: 300 });
    cardScale.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 160 }));
    cardOpacity.value = withDelay(100, withTiming(1, { duration: 250 }));
    emojiScale.value = withDelay(
      320,
      withSequence(
        withSpring(1.3, { damping: 6, stiffness: 300 }),
        withSpring(1.0, { damping: 10, stiffness: 200 }),
      ),
    );
    contentOpacity.value = withDelay(420, withTiming(1, { duration: 300 }));

    celebrationHaptic();
  }, [visible]);

  const handleDismiss = () => {
    tapHaptic();
    overlayOpacity.value = withTiming(0, { duration: 250 });
    cardScale.value = withTiming(0.85, { duration: 220 });
    cardOpacity.value = withTiming(0, { duration: 220 }, () => {
      runOnJS(closeModal)();
    });
  };

  const closeModal = () => {
    setVisible(false);
    setConfettiOn(false);
    setBadge(null);
  };

  const handleShare = async () => {
    if (!badge) return;
    selectHaptic();
    await shareMilestone({ badge, referralCode });
  };

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Confetti layer — theme-tinted */}
      <View
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      >
        {particles.map((p) => (
          <Particle key={p.id} cfg={p} run={confettiOn} />
        ))}
      </View>

      {/* Scrim — blends theme gradient-end with deep dark */}
      <Animated.View
        style={[
          overlayStyle,
          { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
        ]}
      >
        {/* Theme-tinted overlay gradient */}
        <LinearGradient
          colors={[
            theme.gradientEnd + "E8",
            "rgba(4,2,12,0.92)",
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Close button */}
        <Pressable
          onPress={handleDismiss}
          style={{
            position: "absolute",
            top: 56,
            right: 24,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        {/* Card */}
        <Animated.View
          style={[
            cardStyle,
            {
              width: "100%",
              maxWidth: 360,
              borderRadius: 28,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: rarity.glow + "55",
              shadowColor: rarity.glow,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 36,
              elevation: 20,
            },
          ]}
        >
          {/* Card background — theme gradient */}
          <LinearGradient
            colors={[theme.backgroundGradient[0], theme.backgroundGradient[1]]}
            start={{ x: 0.3, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />

          {/* Top accent bar — rarity gradient */}
          <LinearGradient
            colors={rarity.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 6, width: "100%" }}
          />

          <View style={{ padding: 28, alignItems: "center" }}>
            {/* Rarity chip */}
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: rarity.chipBg,
                borderWidth: 1,
                borderColor: rarity.chipBorder,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 10,
                  color: rarity.chipText,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                }}
              >
                {rarity.label} Milestone
              </Text>
            </View>

            {/* Badge icon circle */}
            <View style={{ marginBottom: 20 }}>
              <BadgeIconCircle
                badge={badge}
                rarity={rarity}
                currentStreak={currentStreak}
                emojiStyle={emojiStyle}
              />
            </View>

            {/* Text content */}
            <Animated.View style={[contentStyle, { alignItems: "center", width: "100%" }]}>
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  fontSize: 22,
                  color: "#FFFFFF",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {badge.title}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: "rgba(255,255,255,0.65)",
                  textAlign: "center",
                  lineHeight: 22,
                  marginBottom: 6,
                }}
              >
                {badge.description}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 13,
                  color: rarity.chipText,
                  textAlign: "center",
                  marginBottom: 28,
                }}
              >
                {badge.tip}
              </Text>

              {/* Buttons */}
              <View style={{ width: "100%", gap: 10 }}>
                {/* Share — theme mic gradient */}
                <Pressable
                  onPress={handleShare}
                  style={{ borderRadius: 16, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={theme.micButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 15,
                      gap: 8,
                    }}
                  >
                    <Share2 size={17} color="#FFFFFF" strokeWidth={2.5} />
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                        color: "#FFFFFF",
                      }}
                    >
                      Share Milestone
                    </Text>
                  </LinearGradient>
                </Pressable>

                {/* Continue */}
                <Pressable
                  onPress={handleDismiss}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    paddingVertical: 13,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 15,
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    Keep Going
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
