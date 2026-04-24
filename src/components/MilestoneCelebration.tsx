import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { celebrationHaptic, tapHaptic, selectHaptic } from '@/lib/haptics';
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
} from 'lucide-react-native';
import useBadgesStore from '@/lib/state/badges-store';
import { shareMilestone } from '@/lib/share-utils';
import { useMilestoneSound } from '@/lib/hooks/useMilestoneSound';
import { Badge, BadgeRarity } from '@/lib/types';
import useOnboardingStore from '@/lib/state/onboarding-store';
import { THEME_COLORS } from '@/lib/state/onboarding-store';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Config ───────────────────────────────────────────────────────────────────

// Same icon map used by the badge screen — keeps both in sync
const BADGE_ICONS: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
  'flame':          Flame,
  'calendar':       Calendar,
  'trophy':         Trophy,
  'crown':          Crown,
  'award':          Award,
  'star':           Star,
  'target':         Target,
  'sun':            Sun,
  'moon':           Moon,
  'heart':          Heart,
  'zap':            Zap,
  'sparkles':       Sparkles,
  'book-open':      BookOpen,
  'pen-tool':       PenTool,
  'book':           Book,
  'library':        Library,
  'sunrise':        Sunrise,
  'moon-star':      MoonStar,
  'calendar-check': CalendarCheck,
  'clock':          Clock,
  'scale':          Scale,
};

const RARITY_CONFIG: Record<BadgeRarity, { label: string; color: string; glow: string }> = {
  common:    { label: 'Common',    color: '#8BA888', glow: 'rgba(139,168,136,0.35)' },
  rare:      { label: 'Rare',      color: '#7BA7D4', glow: 'rgba(123,167,212,0.40)' },
  epic:      { label: 'Epic',      color: '#A47FC4', glow: 'rgba(164,127,196,0.45)' },
  legendary: { label: 'Legendary', color: '#F4C542', glow: 'rgba(244,197,66,0.50)'  },
};

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#A78BFA', '#FF9FF3', '#FFA94D', '#63E6BE',
];

// Pre-computed particle layout (stable across renders)
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id:       i,
  x:        (i / 22) * SW + ((i % 3) - 1) * 18,
  color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay:    i * 55,
  duration: 1900 + (i % 5) * 180,
  driftX:   ((i % 4) - 1.5) * 55,
  rot:      (i % 2 === 0 ? 1 : -1) * (200 + i * 15),
  size:     i % 3 === 0 ? 10 : 7,
  shape:    i % 4 === 0 ? 'circle' : 'rect',
}));

// ─── Confetti particle ────────────────────────────────────────────────────────

function Particle({ cfg, run }: { cfg: typeof PARTICLES[0]; run: boolean }) {
  const y       = useSharedValue(-20);
  const x       = useSharedValue(0);
  const rot     = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!run) return;
    opacity.value = withDelay(cfg.delay, withTiming(1, { duration: 80 }));
    y.value       = withDelay(cfg.delay, withTiming(SH + 40, { duration: cfg.duration }));
    x.value       = withDelay(cfg.delay, withTiming(cfg.driftX, { duration: cfg.duration }));
    rot.value     = withDelay(cfg.delay, withTiming(cfg.rot, { duration: cfg.duration }));
    opacity.value = withDelay(
      cfg.delay,
      withSequence(
        withTiming(0.95, { duration: 100 }),
        withDelay(cfg.duration - 600, withTiming(0, { duration: 500 }))
      )
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
          position:        'absolute',
          top:             0,
          left:            cfg.x,
          width:           cfg.size,
          height:          cfg.shape === 'circle' ? cfg.size : cfg.size * 1.6,
          borderRadius:    cfg.shape === 'circle' ? cfg.size / 2 : 2,
          backgroundColor: cfg.color,
        },
      ]}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MilestoneCelebration() {
  const pendingCelebrations = useBadgesStore((s) => s.pendingCelebrations);
  const referralCode        = useBadgesStore((s) => s.referralCode);
  const dequeueCelebration  = useBadgesStore((s) => s.dequeueCelebration);
  const selectedTheme       = useOnboardingStore((s) => s.selectedTheme);

  const { playCelebration, playBadgePop } = useMilestoneSound();

  const [visible,    setVisible]    = useState(false);
  const [badge,      setBadge]      = useState<Badge | null>(null);
  const [confettiOn, setConfettiOn] = useState(false);

  // Animations
  const overlayOpacity  = useSharedValue(0);
  const cardScale       = useSharedValue(0.5);
  const cardOpacity     = useSharedValue(0);
  const emojiScale      = useSharedValue(0);
  const contentOpacity  = useSharedValue(0);

  const themeColor = THEME_COLORS[selectedTheme]?.primary ?? '#9370DB';

  const getBadgeWithState = useBadgesStore((s) => s.getBadgeWithState);

  // Watch for new celebrations
  useEffect(() => {
    if (pendingCelebrations.length > 0 && !visible) {
      const badgeId = dequeueCelebration();
      if (!badgeId) return;
      // Use the same store method as the badge screen for consistent data
      const fullBadge = getBadgeWithState(badgeId);
      if (!fullBadge) return;

      setBadge(fullBadge);
      setVisible(true);
    }
  }, [pendingCelebrations.length]);

  // Entrance animation when visible
  useEffect(() => {
    if (!visible) return;

    // Reset
    overlayOpacity.value = 0;
    cardScale.value      = 0.5;
    cardOpacity.value    = 0;
    emojiScale.value     = 0;
    contentOpacity.value = 0;

    // Play sounds with stagger
    playCelebration();
    setTimeout(() => playBadgePop(), 350);
    setTimeout(() => setConfettiOn(true), 50);

    // Animate overlay
    overlayOpacity.value = withTiming(1, { duration: 300 });

    // Card entrance
    cardScale.value   = withDelay(100, withSpring(1, { damping: 14, stiffness: 160 }));
    cardOpacity.value = withDelay(100, withTiming(1, { duration: 250 }));

    // Emoji bounce in
    emojiScale.value = withDelay(
      320,
      withSequence(
        withSpring(1.3, { damping: 6,  stiffness: 300 }),
        withSpring(1.0, { damping: 10, stiffness: 200 })
      )
    );

    // Content fade in
    contentOpacity.value = withDelay(420, withTiming(1, { duration: 300 }));

    celebrationHaptic();
  }, [visible]);

  const handleDismiss = () => {
    tapHaptic();
    overlayOpacity.value  = withTiming(0, { duration: 250 });
    cardScale.value       = withTiming(0.85, { duration: 220 });
    cardOpacity.value     = withTiming(0, { duration: 220 }, () => {
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
  const cardStyle    = useAnimatedStyle(() => ({
    opacity:   cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const emojiStyle   = useAnimatedStyle(() => ({ transform: [{ scale: emojiScale.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));

  if (!badge) return null;

  const rarity     = RARITY_CONFIG[badge.rarity];
  const BadgeIcon  = BADGE_ICONS[badge.icon] ?? Award;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Confetti layer */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        {PARTICLES.map((p) => (
          <Particle key={p.id} cfg={p} run={confettiOn} />
        ))}
      </View>

      {/* Overlay */}
      <Animated.View
        style={[
          overlayStyle,
          {
            flex:            1,
            backgroundColor: 'rgba(8,4,18,0.82)',
            alignItems:      'center',
            justifyContent:  'center',
            paddingHorizontal: 28,
          },
        ]}
      >
        {/* Close button */}
        <Pressable
          onPress={handleDismiss}
          style={{
            position:        'absolute',
            top:             56,
            right:           24,
            width:           36,
            height:          36,
            borderRadius:    18,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <X size={16} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        {/* Card */}
        <Animated.View
          style={[
            cardStyle,
            {
              width:           '100%',
              maxWidth:        360,
              borderRadius:    28,
              backgroundColor: 'rgba(18,10,36,0.96)',
              borderWidth:     1.5,
              borderColor:     rarity.color + '60',
              overflow:        'hidden',
              // Rarity glow
              shadowColor:     rarity.color,
              shadowOffset:    { width: 0, height: 0 },
              shadowOpacity:   0.6,
              shadowRadius:    32,
              elevation:       20,
            },
          ]}
        >
          {/* Top glow band */}
          <View
            style={{
              height:          3,
              backgroundColor: rarity.color,
              opacity:         0.9,
            }}
          />

          <View style={{ padding: 28, alignItems: 'center' }}>
            {/* Rarity chip */}
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical:   4,
                borderRadius:      20,
                backgroundColor:   rarity.color + '22',
                borderWidth:       1,
                borderColor:       rarity.color + '55',
                marginBottom:      20,
              }}
            >
              <Text
                style={{
                  fontFamily:    'Comfortaa_700Bold',
                  fontSize:      10,
                  color:         rarity.color,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                }}
              >
                {rarity.label} Milestone
              </Text>
            </View>

            {/* Emoji / icon */}
            <Animated.View
              style={[
                emojiStyle,
                {
                  width:           88,
                  height:          88,
                  borderRadius:    44,
                  backgroundColor: rarity.glow,
                  alignItems:      'center',
                  justifyContent:  'center',
                  marginBottom:    18,
                  borderWidth:     1.5,
                  borderColor:     rarity.color + '40',
                },
              ]}
            >
              <BadgeIcon size={42} color="#FFFFFF" strokeWidth={1.5} />
            </Animated.View>

            {/* Title + description */}
            <Animated.View style={[contentStyle, { alignItems: 'center' }]}>
              <Text
                style={{
                  fontFamily: 'Comfortaa_700Bold',
                  fontSize:   22,
                  color:      '#FFFFFF',
                  textAlign:  'center',
                  marginBottom: 8,
                }}
              >
                {badge.title}
              </Text>
              <Text
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  fontSize:   14,
                  color:      'rgba(255,255,255,0.65)',
                  textAlign:  'center',
                  lineHeight: 20,
                  marginBottom: 6,
                }}
              >
                {badge.description}
              </Text>
              <Text
                style={{
                  fontFamily: 'Comfortaa_600SemiBold',
                  fontSize:   13,
                  color:      rarity.color,
                  textAlign:  'center',
                  marginBottom: 26,
                }}
              >
                {badge.tip}
              </Text>

              {/* Buttons */}
              <View style={{ width: '100%', gap: 10 }}>
                {/* Share */}
                <Pressable
                  onPress={handleShare}
                  style={{
                    flexDirection:   'row',
                    alignItems:      'center',
                    justifyContent:  'center',
                    backgroundColor: themeColor,
                    borderRadius:    16,
                    paddingVertical: 14,
                    gap:             8,
                  }}
                >
                  <Share2 size={17} color="#FFFFFF" strokeWidth={2.5} />
                  <Text
                    style={{
                      fontFamily: 'Comfortaa_700Bold',
                      fontSize:   15,
                      color:      '#FFFFFF',
                    }}
                  >
                    Share Milestone
                  </Text>
                </Pressable>

                {/* Continue */}
                <Pressable
                  onPress={handleDismiss}
                  style={{
                    alignItems:      'center',
                    justifyContent:  'center',
                    borderRadius:    16,
                    paddingVertical: 13,
                    borderWidth:     1,
                    borderColor:     'rgba(255,255,255,0.18)',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Comfortaa_600SemiBold',
                      fontSize:   15,
                      color:      'rgba(255,255,255,0.75)',
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
