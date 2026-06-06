/**
 * RecommendationCard — AI-powered warm advice with audio TTS playback
 *
 * Displays a warm, compassionate AI recommendation based on the entry
 * transcript, with both readable text and spoken audio output via expo-speech.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import {
  Sparkles,
  Play,
  Square,
  RefreshCw,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { tapHaptic, selectHaptic } from '@/lib/haptics';

// ── Glassmorphic tokens ───────────────────────────────────────────────────────
const GLASS_BG         = 'rgba(255, 255, 255, 0.12)';
const GLASS_BORDER     = 'rgba(255, 255, 255, 0.20)';
const GLASS_INNER_BG   = 'rgba(255, 255, 255, 0.08)';
const GLASS_INNER_BORDER = 'rgba(255, 255, 255, 0.13)';

// ── Waveform bar ──────────────────────────────────────────────────────────────
function WaveBar({ delay, isActive }: { delay: number; isActive: boolean }) {
  const scaleY = useSharedValue(0.25);

  useEffect(() => {
    if (isActive) {
      scaleY.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 350 + delay * 80, easing: Easing.inOut(Easing.sin) }),
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

  const style = useAnimatedStyle(() => ({
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
        style,
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

// ── Main Component ────────────────────────────────────────────────────────────

export interface RecommendationCardProps {
  /** The AI-generated warm advice text */
  advice: string | null;
  /** Whether AI is currently generating the advice */
  isGenerating: boolean;
  /** Whether the last generation attempt failed */
  hasFailed: boolean;
  /** Called when user wants to regenerate */
  onRegenerate: () => void;
  /** Primary theme colour */
  themeColor?: string;
  /** Whether to render in compact (list card) mode */
  compact?: boolean;
}

export function RecommendationCard({
  advice,
  isGenerating,
  hasFailed,
  onRegenerate,
  themeColor = '#8B5CF6',
  compact = false,
}: RecommendationCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Default to expanded so the recommendation is always visible
  const [isExpanded, setIsExpanded] = useState(true);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // Stop speech if advice changes (e.g. regenerated)
  useEffect(() => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
  }, [advice]);

  const speakAdvice = (text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.2,
      rate: 0.85,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
  };

  const handleToggleSpeech = () => {
    selectHaptic();
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else if (advice) {
      speakAdvice(advice);
    }
  };

  const handleToggleExpand = () => {
    tapHaptic();
    setIsExpanded((v) => !v);
  };

  // ── Compact mode (used inside EntryCard list) ─────────────────────────────
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
          onPress={handleToggleExpand}
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
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                color: '#FFFFFF',
                fontSize: 12,
              }}
            >
              AI Recommendation
            </Text>
            {/* Subtle AI badge */}
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
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 8,
                }}
              >
                AI
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Play/Stop button */}
            {advice && !isGenerating && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  handleToggleSpeech();
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isSpeaking
                    ? 'rgba(239,68,68,0.18)'
                    : 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderColor: isSpeaking
                    ? 'rgba(239,68,68,0.45)'
                    : GLASS_INNER_BORDER,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isSpeaking ? (
                  <Square size={10} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Play size={10} color="#FFFFFF" strokeWidth={2} />
                )}
              </Pressable>
            )}
            {isExpanded ? (
              <ChevronUp size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            ) : (
              <ChevronDown size={14} color="rgba(255,255,255,0.6)" strokeWidth={2} />
            )}
          </View>
        </Pressable>

        {/* Collapsible content */}
        {isExpanded && (
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            style={{ paddingHorizontal: 14, paddingBottom: 12 }}
          >
            {isGenerating ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 4,
                }}
              >
                <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 12,
                    fontStyle: 'italic',
                  }}
                >
                  Personalizing your advice…
                </Text>
              </View>
            ) : hasFailed ? (
              <View>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 12,
                    fontStyle: 'italic',
                    marginBottom: 8,
                  }}
                >
                  Could not generate advice.
                </Text>
                <Pressable
                  onPress={onRegenerate}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    alignSelf: 'flex-start',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    backgroundColor: GLASS_INNER_BG,
                    borderWidth: 1,
                    borderColor: GLASS_INNER_BORDER,
                  }}
                >
                  <RefreshCw size={11} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{
                      fontFamily: 'Inter_600SemiBold',
                      color: '#FFFFFF',
                      fontSize: 11,
                    }}
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            ) : advice ? (
              <View>
                <Text
                  style={{
                    fontFamily: 'Inter_400Regular',
                    color: 'rgba(255,255,255,0.88)',
                    fontSize: 13,
                    lineHeight: 20,
                    marginBottom: isSpeaking ? 10 : 0,
                  }}
                >
                  {advice}
                </Text>
                {isSpeaking && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <AudioWaveform isPlaying={isSpeaking} />
                    <Text
                      style={{
                        fontFamily: 'Inter_400Regular',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 11,
                      }}
                    >
                      Speaking…
                    </Text>
                  </Animated.View>
                )}
              </View>
            ) : (
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 12,
                  fontStyle: 'italic',
                }}
              >
                Generating your recommendation…
              </Text>
            )}
          </Animated.View>
        )}
      </View>
    );
  }

  // ── Full mode (used inside entry-detail) ──────────────────────────────────
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
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Icon */}
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
            <Text
              style={{
                fontFamily: 'Inter_600SemiBold',
                color: '#FFFFFF',
                fontSize: 15,
              }}
            >
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
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 9,
                }}
              >
                AI
              </Text>
            </View>
          </View>

          {/* Regenerate button */}
          {!isGenerating && advice && (
            <Pressable
              onPress={onRegenerate}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: GLASS_INNER_BG,
                borderWidth: 1,
                borderColor: GLASS_INNER_BORDER,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </Pressable>
          )}
        </View>

        {/* ── Text advice block ── */}
        <View
          style={{
            backgroundColor: GLASS_INNER_BG,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: GLASS_INNER_BORDER,
            padding: 14,
            marginBottom: 14,
            minHeight: 52,
            justifyContent: 'center',
          }}
        >
          {isGenerating ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: 13,
                  fontStyle: 'italic',
                }}
              >
                Personalizing your advice…
              </Text>
            </View>
          ) : hasFailed ? (
            <View>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 13,
                  fontStyle: 'italic',
                  marginBottom: 10,
                }}
              >
                Could not load recommendation. Tap to retry.
              </Text>
              <Pressable
                onPress={onRegenerate}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  backgroundColor: GLASS_INNER_BG,
                  borderWidth: 1.5,
                  borderColor: GLASS_INNER_BORDER,
                  gap: 6,
                  alignSelf: 'flex-start',
                }}
              >
                <RefreshCw size={14} color="#FFFFFF" strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    color: '#FFFFFF',
                    fontSize: 13,
                  }}
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : advice ? (
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                lineHeight: 24,
                color: 'rgba(255,255,255,0.92)',
                fontSize: 14,
              }}
            >
              {advice}
            </Text>
          ) : (
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 13,
                fontStyle: 'italic',
              }}
            >
              Preparing your personalized recommendation…
            </Text>
          )}
        </View>

        {/* ── Audio section ── */}
        {advice && !isGenerating && !hasFailed && (
          <Animated.View entering={FadeIn.duration(400)}>
            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.08)',
                marginBottom: 14,
              }}
            />

            {/* Listen row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Waveform + status */}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
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
                {isSpeaking ? (
                  <AudioWaveform isPlaying />
                ) : (
                  <Text
                    style={{
                      fontFamily: 'Inter_400Regular',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 12,
                    }}
                  >
                    Tap to listen
                  </Text>
                )}
              </View>

              {/* Play / Stop button */}
              <Pressable
                onPress={handleToggleSpeech}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 20,
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  backgroundColor: isSpeaking
                    ? 'rgba(239,68,68,0.20)'
                    : GLASS_INNER_BG,
                  borderWidth: 1.5,
                  borderColor: isSpeaking
                    ? 'rgba(239,68,68,0.45)'
                    : GLASS_INNER_BORDER,
                  gap: 7,
                }}
              >
                {isSpeaking ? (
                  <Square size={14} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <Play size={14} color="#FFFFFF" strokeWidth={2} />
                )}
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    color: '#FFFFFF',
                    fontSize: 13,
                  }}
                >
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
