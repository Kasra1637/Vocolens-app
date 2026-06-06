/**
 * RecommendationCard — personalised AI advice with audio TTS playback
 *
 * One recommendation per entry — no reload, no retry.
 * Shows the AI-generated text and lets the user listen to it via TTS.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import {
  Sparkles,
  Play,
  Square,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { tapHaptic, selectHaptic } from '@/lib/haptics';

// ── Glassmorphic tokens ───────────────────────────────────────────────────────
const GLASS_BG           = 'rgba(255, 255, 255, 0.12)';
const GLASS_BORDER       = 'rgba(255, 255, 255, 0.20)';
const GLASS_INNER_BG     = 'rgba(255, 255, 255, 0.08)';
const GLASS_INNER_BORDER = 'rgba(255, 255, 255, 0.13)';

// ── Animated waveform bar ────────────────────────────────────────────────────
function WaveBar({ delay, isActive }: { delay: number; isActive: boolean }) {
  const scaleY = useSharedValue(0.25);

  useEffect(() => {
    if (isActive) {
      scaleY.value = withRepeat(
        withSequence(
          withTiming(1,   { duration: 350 + delay * 80, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.2, { duration: 350 + delay * 80, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scaleY);
      scaleY.value = withTiming(0.25, { duration: 200 });
    }
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 3,
          height: 20,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.85)',
          marginHorizontal: 1.5,
        },
        animStyle,
      ]}
    />
  );
}

function AudioWaveform({ isPlaying }: { isPlaying: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 24 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <WaveBar key={i} delay={i} isActive={isPlaying} />
      ))}
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface RecommendationCardProps {
  /** The AI-generated personalised advice text */
  advice: string | null;
  /** True while the recommendation is being generated */
  isGenerating: boolean;
  /** Primary theme colour (used for the Sparkles icon + waveform tint) */
  themeColor?: string;
  /** compact = inline list-card mode; false = full entry-detail mode */
  compact?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function RecommendationCard({
  advice,
  isGenerating,
  themeColor = '#8B5CF6',
  compact = false,
}: RecommendationCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Stop speech on unmount
  useEffect(() => () => { Speech.stop(); }, []);

  // Stop speech if advice text changes
  useEffect(() => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
  }, [advice]);

  const handleToggleSpeech = () => {
    selectHaptic();
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else if (advice) {
      setIsSpeaking(true);
      Speech.speak(advice, {
        language: 'en-US',
        pitch: 1.15,
        rate: 0.87,
        onDone:    () => setIsSpeaking(false),
        onError:   () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  // ── COMPACT mode — inside EntryCard list ──────────────────────────────────
  if (compact) {
    return (
      <View
        style={{
          backgroundColor: GLASS_INNER_BG,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: GLASS_INNER_BORDER,
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <Pressable
          onPress={() => { tapHaptic(); setIsExpanded((v) => !v); }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Sparkles size={13} color={themeColor} strokeWidth={2} />
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 12 }}>
              AI Recommendation
            </Text>
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 20,
                backgroundColor: GLASS_INNER_BG,
                borderWidth: 1,
                borderColor: GLASS_INNER_BORDER,
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.6)', fontSize: 8 }}>
                AI
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Play / Stop — only shown when advice is ready */}
            {advice && !isGenerating && (
              <Pressable
                onPress={(e) => { e.stopPropagation?.(); handleToggleSpeech(); }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isSpeaking ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: isSpeaking ? 'rgba(239,68,68,0.45)' : GLASS_INNER_BORDER,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSpeaking
                  ? <Square size={10} color="#FFFFFF" strokeWidth={2} />
                  : <Play   size={10} color="#FFFFFF" strokeWidth={2} />}
              </Pressable>
            )}
            {isExpanded
              ? <ChevronUp   size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
              : <ChevronDown size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />}
          </View>
        </Pressable>

        {/* Collapsible body */}
        {isExpanded && (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            style={{ paddingHorizontal: 14, paddingBottom: 12 }}
          >
            {isGenerating || !advice ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontStyle: 'italic' }}>
                  Crafting your personalised advice…
                </Text>
              </View>
            ) : (
              <View>
                <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.88)', fontSize: 13, lineHeight: 20, marginBottom: isSpeaking ? 10 : 0 }}>
                  {advice}
                </Text>
                {isSpeaking && (
                  <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AudioWaveform isPlaying />
                    <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                      Speaking…
                    </Text>
                  </Animated.View>
                )}
              </View>
            )}
          </Animated.View>
        )}
      </View>
    );
  }

  // ── FULL mode — inside entry-detail ──────────────────────────────────────
  return (
    <View
      style={{
        backgroundColor: GLASS_BG,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: GLASS_BORDER,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      }}
    >
      <View style={{ padding: 20 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: GLASS_INNER_BG,
              borderRadius: 8,
              padding: 6,
              borderWidth: 1,
              borderColor: GLASS_INNER_BORDER,
            }}
          >
            <Sparkles size={16} color={themeColor} strokeWidth={2} />
          </View>
          <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 15 }}>
            Recommendation
          </Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 20,
              backgroundColor: GLASS_INNER_BG,
              borderWidth: 1,
              borderColor: GLASS_INNER_BORDER,
            }}
          >
            <Text style={{ fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>
              AI
            </Text>
          </View>
        </View>

        {/* Text block */}
        <View
          style={{
            backgroundColor: GLASS_INNER_BG,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: GLASS_INNER_BORDER,
            padding: 16,
            marginBottom: advice && !isGenerating ? 14 : 0,
            minHeight: 56,
            justifyContent: 'center',
          }}
        >
          {isGenerating || !advice ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
              <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.45)', fontSize: 13, fontStyle: 'italic' }}>
                Crafting your personalised advice…
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: 'Inter_400Regular', lineHeight: 24, color: 'rgba(255,255,255,0.92)', fontSize: 14 }}>
              {advice}
            </Text>
          )}
        </View>

        {/* Audio row — only visible when advice is ready */}
        {advice && !isGenerating && (
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

              {/* Left: icon + waveform / label */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    backgroundColor: GLASS_INNER_BG,
                    borderRadius: 8,
                    padding: 6,
                    borderWidth: 1,
                    borderColor: GLASS_INNER_BORDER,
                  }}
                >
                  <Volume2
                    size={14}
                    color={isSpeaking ? themeColor : 'rgba(255,255,255,0.5)'}
                    strokeWidth={2}
                  />
                </View>
                {isSpeaking
                  ? <AudioWaveform isPlaying />
                  : <Text style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Tap to listen</Text>}
              </View>

              {/* Right: Play / Stop */}
              <Pressable
                onPress={handleToggleSpeech}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  backgroundColor: isSpeaking ? 'rgba(239,68,68,0.20)' : GLASS_INNER_BG,
                  borderWidth: 1.5,
                  borderColor: isSpeaking ? 'rgba(239,68,68,0.45)' : GLASS_INNER_BORDER,
                  gap: 7,
                }}
              >
                {isSpeaking
                  ? <Square size={14} color="#FFFFFF" strokeWidth={2} />
                  : <Play   size={14} color="#FFFFFF" strokeWidth={2} />}
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 13 }}>
                  {isSpeaking ? 'Stop' : 'Listen'}
                </Text>
              </Pressable>

            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}
