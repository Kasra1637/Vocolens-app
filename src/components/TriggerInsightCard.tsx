// Trigger Insight Card Component
// Displays emotional triggers with calm, supportive styling

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { tapHaptic } from '@/lib/haptics';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import { AnimatedPill } from '@/components/AnimatedPill';
import {
  Briefcase,
  Heart,
  Users,
  Pulse,
  CurrencyDollar,
  Flower,
  Sparkle,
  Lightning,
  Trophy,
  ArrowsClockwise,
  BookOpen,
  HandHeart,
  Barbell,
  Coffee,
  Palette,
  Calendar,
  Link,
  TrendUp,
  TrendDown,
} from 'phosphor-react-native';
import {
  DetectedTrigger,
} from '@/lib/trigger-detection';
import { EMOTION_COLORS, EmotionType } from '@/lib/types';
import { BorderRadius } from '@/lib/theme';

// Map each trigger category to a relevant icon
const TRIGGER_ICONS: Record<string, React.ComponentType<any>> = {
  work:          Briefcase,
  family:        Heart,
  social:        Users,
  health:        Pulse,
  finance:       CurrencyDollar,
  selfCare:      Flower,
  gratitude:     Sparkle,
  stress:        Lightning,
  achievement:   Trophy,
  change:        ArrowsClockwise,
  reflection:    BookOpen,
  relationships: HandHeart,
  exercise:      Barbell,
  relaxation:    Coffee,
  creativity:    Palette,
  planning:      Calendar,
  connection:    Link,
};

interface TriggerInsightCardProps {
  trigger: DetectedTrigger;
  index?: number;
  onPress?: () => void;
}

// Trigger category labels for display
const TRIGGER_LABELS: Record<string, string> = {
  work: 'Work',
  family: 'Family',
  social: 'Social',
  health: 'Health & Wellness',
  finance: 'Finances',
  selfCare: 'Self-Care',
  gratitude: 'Gratitude',
  stress: 'Stress',
  achievement: 'Achievements',
  change: 'Life Changes',
  reflection: 'Reflection',
  relationships: 'Relationships',
  exercise: 'Exercise',
  relaxation: 'Relaxation',
  creativity: 'Creativity',
  planning: 'Planning',
  connection: 'Connection',
};

export function TriggerInsightCard({ trigger, index = 0, onPress }: TriggerInsightCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const handlePress = () => {
    tapHaptic();
    onPress?.();
  };

  const isPositive = trigger.type === 'positive';
  const triggerLabel = TRIGGER_LABELS[trigger.trigger] ||
    trigger.trigger.charAt(0).toUpperCase() + trigger.trigger.slice(1);

  // Category-specific icon; fall back to trending up/down
  const CategoryIcon = TRIGGER_ICONS[trigger.trigger] ?? (isPositive ? TrendUp : TrendDown);

  // Get primary emotion color
  const primaryEmotion = trigger.associatedEmotions[0] as EmotionType;
  const emotionColor = EMOTION_COLORS[primaryEmotion] || '#8BA888';

  // Calculate confidence level text
  const getConfidenceLevel = (confidence: number): string => {
    if (confidence >= 70) return 'Strong pattern';
    if (confidence >= 50) return 'Moderate pattern';
    return 'Emerging pattern';
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(500).springify()}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <View
          style={{
            borderRadius: BorderRadius.xxlarge,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.20)',
          }}
        >

          <View style={{ padding: 18 }}>
            {/* Header with trigger type indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <CategoryIcon size={22} color="#FFFFFF" weight="duotone" />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 16,
                    color: '#FFFFFF',
                    marginBottom: 4,
                  }}
                >
                  {triggerLabel}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 11,
                    color: 'rgba(255, 255, 255, 0.75)',
                  }}
                >
                  {isPositive ? 'Positive trigger' : 'Challenging trigger'}
                </Text>
              </View>
            </View>

            {/* Confidence indicator - above insight */}
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 9,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {getConfidenceLevel(trigger.confidence)}
              </Text>
            </View>

            {/* Insight message */}
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
                color: 'rgba(255, 255, 255, 0.95)',
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              {trigger.insight}
            </Text>

            {/* Coping micro-action — one concrete step, no questions */}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.10)',
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 18,
                }}
              >
                💡 Try: {isPositive
                  ? `When "${triggerLabel.toLowerCase()}" comes up, lean in — it reliably lifts your mood.`
                  : `Before engaging with "${triggerLabel.toLowerCase()}", take 4 slow breaths (in for 4, hold 2, out for 6).`}
              </Text>
            </View>

            {/* Stats section with better spacing */}
            <View
              style={{
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Frequency stats */}
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                Detected in {trigger.frequency} of {trigger.totalEntries} entries
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Empty state component
interface TriggerEmptyStateProps {
  currentEntries: number;
  minRequired: number;
}

export function TriggerEmptyState({ currentEntries, minRequired }: TriggerEmptyStateProps) {
  return (
    <Animated.View entering={FadeInDown.duration(500)}>
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.12)',
          borderRadius: BorderRadius.xxlarge,
          borderWidth: 2,
          borderColor: 'rgba(255, 255, 255, 0.20)',
          padding: 24,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Sparkle size={22} color="#FFFFFF" weight="duotone" />
        </View>

        <Text
          style={{
            fontFamily: 'Inter_600SemiBold',
            fontSize: 15,
            color: '#FFFFFF',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Keep journaling to uncover emotional triggers
        </Text>

        <Text
          style={{
            fontFamily: 'Inter_400Regular',
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {currentEntries > 0
            ? `You have ${currentEntries} entries. Add ${minRequired - currentEntries} more to discover patterns.`
            : `Record at least ${minRequired} entries to see personalized insights about your emotional patterns.`}
        </Text>
      </View>
    </Animated.View>
  );
}

// Section header component
interface TriggerSectionHeaderProps {
  timeWindow: '7D' | '14D' | '30D';
  onTimeWindowChange?: (window: '7D' | '14D' | '30D') => void;
}

export function TriggerSectionHeader({ timeWindow, onTimeWindowChange }: TriggerSectionHeaderProps) {
  const timeWindows: Array<'7D' | '14D' | '30D'> = ['7D', '14D', '30D'];
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkModeTheme = selectedTheme === "darkMode";
  const primaryColor = THEME_COLORS[selectedTheme]?.primary ?? "#9370DB";

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  const getLabel = (tw: string) => {
    switch (tw) {
      case '7D': return '7 Days';
      case '14D': return '14 Days';
      case '30D': return '30 Days';
      default: return tw;
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Lightning size={22} color="#FFFFFF" weight="duotone" />
        </View>
        <View>
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 16,
              color: '#FFFFFF',
            }}
          >
            Emotional triggers
          </Text>
          <Text
            style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            Topics that shift your emotional state
          </Text>
        </View>
      </View>

      {/* Time window selector */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {timeWindows.map((tw) => (
          <AnimatedPill
            key={tw}
            label={getLabel(tw)}
            isActive={timeWindow === tw}
            onPress={() => {
              tapHaptic();
              onTimeWindowChange?.(tw);
            }}
            activeStyle={{
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: isDarkModeTheme
                ? hexToRgba(primaryColor, 0.25)
                : 'rgba(255, 255, 255, 0.15)',
              borderWidth: 1,
              borderColor: isDarkModeTheme
                ? hexToRgba(primaryColor, 0.6)
                : 'rgba(255, 255, 255, 0.25)',
              alignItems: 'center' as const,
            }}
            inactiveStyle={{
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              alignItems: 'center' as const,
            }}
            activeTextStyle={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 12,
              color: '#FFFFFF',
            }}
            inactiveTextStyle={{
              fontFamily: 'Inter_500Medium',
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          />
        ))}
      </View>
    </View>
  );
}
