/**
 * FreeTrialPreviewScreen
 *
 * "We want you to try Vocolens for free."
 * Two-phase animated realistic app demo:
 *   Phase 1 — Recording screen with live transcription, two-button controls
 *   Phase 2 — Entry detail screen showing AI analysis results
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Line } from "react-native-svg";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import {
  ChevronRight,
  BookOpen,
  BarChart3,
  Award,
  Settings,
  Sparkles,
  Radio,
  Pause,
  Check,
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  Volume2,
  BarChart2,
  Target,
} from "lucide-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

// Phase timing
const RECORDING_PHASE_DURATION = 8000; // 8s of recording demo
const TRANSITION_DURATION = 600;
const ENTRY_PHASE_DURATION = 7000; // 7s of entry detail demo

// ── Mini MicTabIcon (matches actual app's custom SVG mic) ──
function MiniMicIcon({
  size,
  color,
  filled,
}: {
  size: number;
  color: string;
  filled?: boolean;
}) {
  const sw = filled ? 0 : 1.6;
  const fill = filled ? color : "none";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
        fill={fill}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19 10v2a7 7 0 0 1-14 0v-2"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={19}
        x2={12}
        y2={22}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Line
        x1={8}
        y1={22}
        x2={16}
        y2={22}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Animated typing text (live transcription simulation) ──
function TypingText({ lines }: { lines: string[] }) {
  const [lineIndex, setLineIndex] = React.useState(0);
  const [charIndex, setCharIndex] = React.useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const currentLine = lines[lineIndex];
    if (charIndex < currentLine.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 35);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 350 });
        setTimeout(() => {
          setLineIndex((i) => (i + 1) % lines.length);
          setCharIndex(0);
          opacity.value = withTiming(1, { duration: 350 });
        }, 450);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [charIndex, lineIndex]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animStyle}>
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: "Inter_400Regular",
          fontSize: 11,
          lineHeight: 16,
        }}
      >
        {lines[lineIndex].substring(0, charIndex)}
        <Text style={{ color: "rgba(255,255,255,0.4)" }}>|</Text>
      </Text>
    </Animated.View>
  );
}

// ── Blinking live indicator ──
function LiveDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800 }),
        withTiming(1, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        {
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#EF4444",
          marginLeft: 5,
        },
        style,
      ]}
    />
  );
}

// ── Animated insight chip ──
function InsightChip({ label, delay }: { label: string; delay: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withSpring(1, { damping: 14, stiffness: 160 });
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginRight: 6,
        },
        style,
      ]}
    >
      <Sparkles
        size={10}
        color="#FFFFFF"
        strokeWidth={2}
        style={{ marginRight: 3 }}
      />
      <Text
        style={{ color: "#FFFFFF", fontFamily: "Inter_500Medium", fontSize: 9 }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

// ── Animated emotion bar for entry detail phase ──
function AnimatedBar({
  label,
  subLabel,
  score,
  barOpacity,
  delay,
  primaryColor,
}: {
  label: string;
  subLabel?: string;
  score: number;
  barOpacity: number;
  delay: number;
  primaryColor: string;
}) {
  const barWidth = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      barWidth.value = withTiming(score, {
        duration: 800,
        easing: Easing.out(Easing.ease),
      });
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
    opacity: barOpacity,
  }));
  return (
    <View style={{ marginBottom: 6 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 2,
        }}
      >
        <View>
          <Text
            style={{
              fontFamily: "Inter_600SemiBold",
              color: "#FFFFFF",
              fontSize: 9,
            }}
          >
            {label}
          </Text>
          {subLabel ? (
            <Text
              style={{
                fontFamily: "Inter_400Regular",
                color: "rgba(255,255,255,0.4)",
                fontSize: 7,
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              {subLabel}
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            color: "rgba(255,255,255,0.8)",
            fontSize: 9,
          }}
        >
          {score}
        </Text>
      </View>
      <View
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.1)",
        }}
      >
        <Animated.View
          style={[
            { height: "100%", borderRadius: 2, backgroundColor: primaryColor },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}

const TYPING_LINES = [
  "Today was intense but I handled it well...",
  "I'm grateful for the small moments of calm...",
  "Feeling more confident than last week...",
  "I need to set better boundaries at work...",
];

export function FreeTrialPreviewScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  // Phase state: 'recording' | 'entry'
  const [phase, setPhase] = React.useState<"recording" | "entry">("recording");

  // Demo card float animation
  const cardFloat = useSharedValue(0);

  // Phase transition opacity
  const recordingOpacity = useSharedValue(1);
  const entryOpacity = useSharedValue(0);

  // Duration counter
  const [demoSeconds, setDemoSeconds] = React.useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDemoSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Phase cycling
  useEffect(() => {
    const cycle = () => {
      // After recording phase, transition to entry
      const t1 = setTimeout(() => {
        recordingOpacity.value = withTiming(0, {
          duration: TRANSITION_DURATION,
        });
        setTimeout(() => {
          setPhase("entry");
          entryOpacity.value = withTiming(1, { duration: TRANSITION_DURATION });
        }, TRANSITION_DURATION);
      }, RECORDING_PHASE_DURATION);

      // After entry phase, transition back to recording
      const t2 = setTimeout(
        () => {
          entryOpacity.value = withTiming(0, { duration: TRANSITION_DURATION });
          setTimeout(() => {
            setPhase("recording");
            setDemoSeconds(0);
            recordingOpacity.value = withTiming(1, {
              duration: TRANSITION_DURATION,
            });
          }, TRANSITION_DURATION);
        },
        RECORDING_PHASE_DURATION +
          TRANSITION_DURATION * 2 +
          ENTRY_PHASE_DURATION,
      );

      return [t1, t2];
    };

    const timers = cycle();
    const totalCycle =
      RECORDING_PHASE_DURATION + ENTRY_PHASE_DURATION + TRANSITION_DURATION * 4;
    const interval = setInterval(() => {
      const newTimers = cycle();
      timers.push(...newTimers);
    }, totalCycle);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    cardFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, []);

  const cardFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  const recordingPhaseStyle = useAnimatedStyle(() => ({
    opacity: recordingOpacity.value,
  }));

  const entryPhaseStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
  }));

  const handleContinue = () => {
    playClickSound();
    successHaptic();
    nextStep();
  };

  const handleBack = () => {
    playClickSound();
    tapHaptic();
    prevStep();
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={14} />

        <SafeAreaView style={{ flex: 1 }}>
          <BackButton onPress={handleBack} show={currentStep > 0} />

          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              justifyContent: "space-between",
              paddingTop: 12,
              paddingBottom: 24,
            }}
          >
            {/* Title */}
            <Animated.View
              entering={FadeIn.delay(50).duration(600).easing(SOFT)}
              style={{ alignItems: "center", marginTop: 4 }}
            >
              <Text
                style={{
                  fontFamily: "Fraunces_700Bold",
                  color: "#FFFFFF",
                  fontSize: 26,
                  textAlign: "center",
                  lineHeight: 27,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                We want you to{"\n"}try Vocolens for free.
              </Text>
            </Animated.View>

            {/* ── Animated App Demo ── */}
            <Animated.View
              entering={FadeIn.delay(200).duration(700).easing(SOFT)}
              style={[cardFloatStyle, { flex: 1, maxHeight: 460, marginTop: 12, marginBottom: 16 }]}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 24,
                  overflow: "hidden",
                  borderWidth: 1.5,
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                <LinearGradient
                  colors={[
                    themeColors.gradientStart,
                    themeColors.primary,
                    themeColors.secondary,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{ flex: 1 }}
                >
                  {/* ══════════════════════════════════════════
                      PHASE 1 — Recording Screen
                     ══════════════════════════════════════════ */}
                  {phase === "recording" && (
                    <Animated.View style={[{ flex: 1 }, recordingPhaseStyle]}>
                      <View
                        style={{
                          flex: 1,
                          alignItems: "center",
                          paddingTop: 14,
                          paddingHorizontal: 14,
                        }}
                      >
                        {/* Header — matches actual app */}
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            color: "#FFFFFF",
                            fontSize: 15,
                            textAlign: "center",
                          }}
                        >
                          Listening...
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            color: "rgba(255,255,255,0.8)",
                            fontSize: 10,
                            marginTop: 2,
                            textAlign: "center",
                          }}
                        >
                          How are you feeling right now?
                        </Text>

                        {/* Live Transcription card (matches actual app) */}
                        <View
                          style={{
                            width: "100%",
                            marginTop: 10,
                            borderRadius: 16,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.2)",
                            padding: 10,
                            maxHeight: 100,
                          }}
                        >
                          {/* Header row with Sparkles + LIVE badge */}
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              <Sparkles
                                size={11}
                                color="#FFFFFF"
                                strokeWidth={2}
                              />
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 10,
                                  marginLeft: 4,
                                }}
                              >
                                Live Transcription
                              </Text>
                              <LiveDot />
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "rgba(255,255,255,0.15)",
                                borderRadius: 8,
                                paddingHorizontal: 5,
                                paddingVertical: 2,
                              }}
                            >
                              <Radio size={8} color="#FFFFFF" strokeWidth={2} />
                              <Text
                                style={{
                                  fontFamily: "Inter_500Medium",
                                  color: "#FFFFFF",
                                  fontSize: 8,
                                  marginLeft: 3,
                                }}
                              >
                                LIVE
                              </Text>
                            </View>
                          </View>
                          {/* Typing transcript */}
                          <TypingText lines={TYPING_LINES} />
                        </View>

                        {/* AI Insights row */}
                        <View
                          style={{
                            flexDirection: "row",
                            marginTop: 8,
                            alignSelf: "flex-start",
                          }}
                        >
                          <InsightChip label="Self-Aware" delay={1200} />
                          <InsightChip label="Growth" delay={1500} />
                          <InsightChip label="Calm" delay={1800} />
                        </View>

                        {/* Duration timer */}
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            color: "#FFFFFF",
                            fontSize: 20,
                            marginTop: 8,
                          }}
                        >
                          {formatDuration(demoSeconds)}
                        </Text>

                        {/* Two-button recording controls — matches actual app */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 8,
                            gap: 20,
                          }}
                        >
                          {/* Pause button */}
                          <View style={{ alignItems: "center", gap: 3 }}>
                            <View
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                backgroundColor: "rgba(255,255,255,0.18)",
                                borderWidth: 1.5,
                                borderColor: "rgba(255,255,255,0.35)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Pause
                                size={18}
                                color="#FFFFFF"
                                fill="#FFFFFF"
                                strokeWidth={0}
                              />
                            </View>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.85)",
                                fontSize: 8,
                              }}
                            >
                              Pause
                            </Text>
                          </View>

                          {/* Save & Analyze button */}
                          <View style={{ alignItems: "center", gap: 3 }}>
                            <LinearGradient
                              colors={["#EF4444", "#DC2626"]}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 24,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Check
                                size={22}
                                color="#FFFFFF"
                                strokeWidth={3}
                              />
                            </LinearGradient>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.85)",
                                fontSize: 8,
                              }}
                            >
                              Save
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  )}

                  {/* ══════════════════════════════════════════
                      PHASE 2 — Entry Detail Screen
                     ══════════════════════════════════════════ */}
                  {phase === "entry" && (
                    <Animated.View style={[{ flex: 1 }, entryPhaseStyle]}>
                      <View
                        style={{
                          flex: 1,
                          paddingHorizontal: 12,
                          paddingTop: 10,
                        }}
                      >
                        {/* Header bar */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: "rgba(255,255,255,0.15)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ArrowLeft
                              size={12}
                              color="#FFFFFF"
                              strokeWidth={2.5}
                            />
                          </View>
                        </View>

                        {/* Entry title */}
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            color: "#FFFFFF",
                            fontSize: 13,
                            marginBottom: 2,
                          }}
                        >
                          A Moment of Clarity
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Inter_400Regular",
                            color: "rgba(255,255,255,0.8)",
                            fontSize: 8,
                            marginBottom: 6,
                          }}
                        >
                          Monday, April 14, 2025
                        </Text>

                        {/* Meta info row */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 8,
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Calendar
                              size={9}
                              color="rgba(255,255,255,0.8)"
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 8,
                                marginLeft: 3,
                              }}
                            >
                              8:32 PM
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Clock
                              size={9}
                              color="rgba(255,255,255,0.8)"
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 8,
                                marginLeft: 3,
                              }}
                            >
                              2:34
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Activity
                              size={9}
                              color="rgba(255,255,255,0.8)"
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.8)",
                                fontSize: 8,
                                marginLeft: 3,
                              }}
                            >
                              72%
                            </Text>
                          </View>
                        </View>

                        {/* AI Reflection card */}
                        <View
                          style={{
                            borderRadius: 12,
                            backgroundColor: "rgba(255,255,255,0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.25)",
                            padding: 8,
                            marginBottom: 6,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <Volume2
                              size={10}
                              color="#FFFFFF"
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                fontFamily: "Inter_600SemiBold",
                                color: "#FFFFFF",
                                fontSize: 9,
                                marginLeft: 4,
                              }}
                            >
                              AI Reflection
                            </Text>
                            <View
                              style={{
                                marginLeft: 4,
                                paddingHorizontal: 4,
                                paddingVertical: 1,
                                borderRadius: 6,
                                backgroundColor: "rgba(255,255,255,0.2)",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 6,
                                }}
                              >
                                OPENROUTER
                              </Text>
                            </View>
                          </View>
                          <AnimatedReflectionText />
                        </View>

                        {/* Emotion Breakdown card */}
                        <View
                          style={{
                            borderRadius: 12,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.2)",
                            padding: 8,
                            marginBottom: 6,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <BarChart2
                              size={10}
                              color="#FFFFFF"
                              strokeWidth={2}
                            />
                            <Text
                              style={{
                                fontFamily: "Inter_600SemiBold",
                                color: "#FFFFFF",
                                fontSize: 9,
                                marginLeft: 4,
                              }}
                            >
                              Emotion Breakdown
                            </Text>
                            <View
                              style={{
                                marginLeft: 4,
                                paddingHorizontal: 4,
                                paddingVertical: 1,
                                borderRadius: 6,
                                backgroundColor: "rgba(255,255,255,0.2)",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 6,
                                }}
                              >
                                TOP 4
                              </Text>
                            </View>
                          </View>
                          <AnimatedBar
                            label="Serenity"
                            subLabel="trust"
                            score={78}
                            barOpacity={1}
                            delay={200}
                            primaryColor={themeColors.primary}
                          />
                          <AnimatedBar
                            label="Joy"
                            score={65}
                            barOpacity={0.75}
                            delay={400}
                            primaryColor={themeColors.primary}
                          />
                          <AnimatedBar
                            label="Interest"
                            subLabel="anticipation"
                            score={52}
                            barOpacity={0.55}
                            delay={600}
                            primaryColor={themeColors.primary}
                          />
                          <AnimatedBar
                            label="Pensiveness"
                            subLabel="sadness"
                            score={31}
                            barOpacity={0.4}
                            delay={800}
                            primaryColor={themeColors.primary}
                          />
                        </View>

                        {/* Topics row */}
                        <View
                          style={{
                            borderRadius: 12,
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.2)",
                            padding: 8,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <Target size={10} color="#FFFFFF" strokeWidth={2} />
                            <Text
                              style={{
                                fontFamily: "Inter_600SemiBold",
                                color: "#FFFFFF",
                                fontSize: 9,
                                marginLeft: 4,
                              }}
                            >
                              Topics
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {["Self-Awareness", "Boundaries", "Growth"].map(
                              (topic) => (
                                <View
                                  key={topic}
                                  style={{
                                    paddingHorizontal: 6,
                                    paddingVertical: 3,
                                    borderRadius: 10,
                                    backgroundColor: "rgba(255,255,255,0.15)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.25)",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: "Inter_500Medium",
                                      color: "#FFFFFF",
                                      fontSize: 8,
                                    }}
                                  >
                                    {topic}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        </View>
                      </View>
                    </Animated.View>
                  )}
                </LinearGradient>
              </View>
            </Animated.View>

            {/* ── No payment text + CTA ── */}
            <Animated.View
              entering={FadeIn.delay(500).duration(600).easing(SOFT)}
              style={{ alignItems: "center", paddingBottom: 24 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Check
                  size={14}
                  color="#FFFFFF"
                  strokeWidth={2.5}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    textAlign: "center",
                    letterSpacing: 0.2,
                  }}
                >
                  No Payment Due Now.
                </Text>
              </View>

              <Pressable
                onPress={handleContinue}
                style={{
                  width: "100%",
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 16,
                  elevation: Platform.OS === "android" ? 0 : 8,
                }}
                android_ripple={{ color: "rgba(255,255,255,0.2)" }}
              >
                <LinearGradient
                  colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.08)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 16,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 17,
                      marginRight: 6,
                    }}
                  >
                    Try for $0.00
                  </Text>
                  <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ── Animated AI Reflection text that types in ──
function AnimatedReflectionText() {
  const reflectionText =
    "You showed real self-awareness today. Setting boundaries is a sign of growth — keep trusting the process.";
  const [charIndex, setCharIndex] = React.useState(0);

  useEffect(() => {
    if (charIndex < reflectionText.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 25);
      return () => clearTimeout(t);
    }
  }, [charIndex]);

  return (
    <Text
      style={{
        fontFamily: "Inter_400Regular",
        color: "rgba(255,255,255,0.95)",
        fontSize: 8,
        lineHeight: 13,
      }}
    >
      {reflectionText.substring(0, charIndex)}
      {charIndex < reflectionText.length ? (
        <Text style={{ color: "rgba(255,255,255,0.4)" }}>|</Text>
      ) : null}
    </Text>
  );
}
