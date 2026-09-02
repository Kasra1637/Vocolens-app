/**
 * FreeTrialPreviewScreen
 *
 * "We want you to try Vocolens for free."
 *
 * Three-phase animated app demo that mirrors the REAL current app UI/UX,
 * not a stylised approximation:
 *   Phase 1 — Recording screen: header states, the (accurate) transparent
 *             live-status card with its real placeholder copy — the app has
 *             no live/streaming transcript, so this demo doesn't fake one —
 *             the 50s insight-depth goal bar, and the real 3-button control
 *             row (Discard / Pause / Save & Analyze).
 *   Phase 2 — Processing: the real pulsing-dot indicator + "Transcribing
 *             your voice..." / "Analyzing emotions..." copy shown in-place
 *             on the recording tab while the entry is analysed.
 *   Phase 3 — Entry results: an auto-scrolling pass down the real
 *             entry-detail screen — header, meta chips, Recommendation
 *             card, and the full Emotion Breakdown card (ranked Plutchik
 *             emotions, Blended Emotions, Emotional Tension) — so the
 *             *entire* results screen is shown, not just a cropped card.
 */

import React, { useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedRef,
  useDerivedValue,
  scrollTo,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
const SOFT = Easing.bezier(0.16, 1, 0.3, 1);
import { tapHaptic, successHaptic } from "@/lib/haptics";
import {
  CaretRight,
  Sparkle,
  Pause,
  Check,
  Trash,
  ArrowLeft,
  PencilSimple,
  Calendar,
  Clock,
  Pulse,
  SpeakerHigh,
  ChartBar,
  Target,
  Play,
} from "phosphor-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { useClickSound } from "@/lib/hooks/useClickSound";

// ── Phase timing ── mirrors the real pacing of record → analyse → results.
const RECORDING_PHASE_DURATION = 6000;
const PROCESSING_PHASE_DURATION = 2200;
const ENTRY_PHASE_DURATION = 9000; // long enough to auto-scroll the full results screen
const TRANSITION_DURATION = 500;
const MIN_RECORDING_SECONDS = 50; // matches the real insight-depth goal

// ── Static live indicator — the real app's dot never blinks; it's a plain
//    solid marker, not an animated "recording" affordance. ──
function LiveIndicator() {
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EF4444",
        marginLeft: 6,
      }}
    />
  );
}

// ── Processing dots — matches the real staggered pulse used on the
//    recording tab while transcribing/analysing. ──
function ProcessingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    const t = setTimeout(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 450, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 450, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    }, delay);
    return () => clearTimeout(t);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
        style,
      ]}
    />
  );
}

// ── Animated emotion bar — matches entry-detail's Top Emotions rows
//    exactly: white fill at per-rank opacity, no theme-color tint. ──
function AnimatedBar({
  label,
  subLabel,
  score,
  barOpacity,
  isPrimary,
  delay,
}: {
  label: string;
  subLabel?: string;
  score: number;
  barOpacity: number;
  isPrimary?: boolean;
  delay: number;
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
  const barStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));
  return (
    <View style={{ marginBottom: 8 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 6 }}>
          <View>
            <Text
              style={{
                fontFamily: isPrimary ? "Inter_600SemiBold" : "Inter_400Regular",
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
                  fontSize: 6.5,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {subLabel}
              </Text>
            ) : null}
          </View>
          {isPrimary ? (
            <View
              style={{
                marginLeft: 6,
                paddingHorizontal: 5,
                paddingVertical: 1.5,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.13)",
              }}
            >
              <Text style={{ fontFamily: "Inter_600SemiBold", color: "#FFFFFF", fontSize: 6.5 }}>
                PRIMARY
              </Text>
            </View>
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
          backgroundColor: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            { height: "100%", borderRadius: 2, backgroundColor: "#FFFFFF", opacity: barOpacity },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}

// Ranked demo emotions — same shape/order the real Emotion Breakdown card
// derives from entry.emotionScores (sorted desc, top 4, rank 0 = PRIMARY).
const DEMO_EMOTIONS = [
  { label: "Serenity", subLabel: "trust", score: 78 },
  { label: "Joy", subLabel: undefined, score: 65 },
  { label: "Interest", subLabel: "anticipation", score: 52 },
  { label: "Pensiveness", subLabel: "sadness", score: 31 },
];

const WHITE_BADGE_STYLE = {
  backgroundColor: "rgba(255,255,255,0.12)",
  borderColor: "rgba(255,255,255,0.25)",
};

export function FreeTrialPreviewScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  // Phase state: 'recording' | 'processing' | 'entry'
  const [phase, setPhase] = React.useState<"recording" | "processing" | "entry">(
    "recording",
  );
  const [processingLabel, setProcessingLabel] = React.useState<
    "Transcribing your voice..." | "Analyzing emotions..."
  >("Transcribing your voice...");

  // Demo card float animation
  const cardFloat = useSharedValue(0);

  // Phase cross-fade opacities
  const recordingOpacity = useSharedValue(1);
  const processingOpacity = useSharedValue(0);
  const entryOpacity = useSharedValue(0);

  // Duration counter — mirrors the real recording timer
  const [demoSeconds, setDemoSeconds] = React.useState(0);
  useEffect(() => {
    if (phase !== "recording") return;
    const interval = setInterval(() => setDemoSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Auto-scroll through the full results screen — driven by measured
  // content/viewport heights so it always reaches the bottom regardless of
  // device size.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(0);
  const [entryViewportHeight, setEntryViewportHeight] = React.useState(0);
  const [entryContentHeight, setEntryContentHeight] = React.useState(0);

  useDerivedValue(() => {
    scrollTo(scrollRef, 0, scrollY.value, false);
  });

  useEffect(() => {
    if (phase !== "entry") {
      scrollY.value = withTiming(0, { duration: 300 });
      return;
    }
    scrollY.value = 0;
    const maxScroll = Math.max(0, entryContentHeight - entryViewportHeight);
    if (maxScroll <= 0) return;
    const t = setTimeout(() => {
      scrollY.value = withTiming(maxScroll, {
        duration: Math.max(2000, ENTRY_PHASE_DURATION - 2000),
        easing: Easing.inOut(Easing.ease),
      });
    }, 900);
    return () => clearTimeout(t);
  }, [phase, entryContentHeight, entryViewportHeight]);

  // Phase cycling — recording → processing → entry → back to recording.
  useEffect(() => {
    let mounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const runCycle = () => {
      if (!mounted) return;
      setPhase("recording");
      setDemoSeconds(0);
      recordingOpacity.value = withTiming(1, { duration: TRANSITION_DURATION });

      timers.push(
        setTimeout(() => {
          // recording → processing
          recordingOpacity.value = withTiming(0, { duration: TRANSITION_DURATION });
          timers.push(
            setTimeout(() => {
              if (!mounted) return;
              setProcessingLabel("Transcribing your voice...");
              setPhase("processing");
              processingOpacity.value = withTiming(1, { duration: TRANSITION_DURATION });
              timers.push(
                setTimeout(() => {
                  if (mounted) setProcessingLabel("Analyzing emotions...");
                }, PROCESSING_PHASE_DURATION * 0.45),
              );

              timers.push(
                setTimeout(() => {
                  // processing → entry
                  processingOpacity.value = withTiming(0, { duration: TRANSITION_DURATION });
                  timers.push(
                    setTimeout(() => {
                      if (!mounted) return;
                      setPhase("entry");
                      entryOpacity.value = withTiming(1, { duration: TRANSITION_DURATION });

                      timers.push(
                        setTimeout(() => {
                          // entry → recording (loop)
                          entryOpacity.value = withTiming(0, { duration: TRANSITION_DURATION });
                          timers.push(
                            setTimeout(() => {
                              if (mounted) runCycle();
                            }, TRANSITION_DURATION),
                          );
                        }, ENTRY_PHASE_DURATION),
                      );
                    }, TRANSITION_DURATION),
                  );
                }, PROCESSING_PHASE_DURATION),
              );
            }, TRANSITION_DURATION),
          );
        }, RECORDING_PHASE_DURATION),
      );
    };

    runCycle();

    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
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

  const recordingPhaseStyle = useAnimatedStyle(() => ({ opacity: recordingOpacity.value }));
  const processingPhaseStyle = useAnimatedStyle(() => ({ opacity: processingOpacity.value }));
  const entryPhaseStyle = useAnimatedStyle(() => ({ opacity: entryOpacity.value }));

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

  const goalMet = demoSeconds >= MIN_RECORDING_SECONDS;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={themeColors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={{ flex: 1 }}
      >
        <ProgressBar currentStep={currentStep} totalSteps={25} />

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
                  fontSize: 30,
                  textAlign: "center",
                  lineHeight: 38,
                  opacity: 0.92,
                  letterSpacing: 0.2,
                }}
              >
                We want you to{"\n"}try Vocolens for free
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
                          paddingTop: 16,
                          paddingHorizontal: 16,
                        }}
                      >
                        {/* Header — real app uses "Listening..." with no
                            subtitle while actively recording. */}
                        <Text
                          style={{
                            fontFamily: "Fraunces_700Bold",
                            color: "#FFFFFF",
                            fontSize: 17,
                            textAlign: "center",
                          }}
                        >
                          Listening...
                        </Text>

                        {/* Live status card — the real app has NO live/
                            streaming transcript. It shows a status label and
                            a placeholder; the transcript only appears after
                            Stop is tapped. */}
                        <View
                          style={{
                            width: "100%",
                            marginTop: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <Sparkle size={12} color="#FFFFFF" weight="regular" />
                            <Text
                              style={{
                                fontFamily: "Inter_600SemiBold",
                                color: "#FFFFFF",
                                fontSize: 10,
                                marginLeft: 5,
                              }}
                            >
                              Recording
                            </Text>
                            <LiveIndicator />
                          </View>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.7)",
                              fontSize: 10,
                              lineHeight: 15,
                              fontStyle: "italic",
                            }}
                          >
                            Speak freely. Your words will be transcribed when
                            you stop.
                          </Text>
                        </View>

                        {/* Duration timer */}
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            color: "#FFFFFF",
                            fontSize: 22,
                            marginTop: 6,
                          }}
                        >
                          {formatDuration(demoSeconds)}
                        </Text>

                        {/* 50-second insight-depth goal bar */}
                        <View style={{ width: 170, marginTop: 10 }}>
                          <View
                            style={{
                              height: 4,
                              borderRadius: 2,
                              backgroundColor: "rgba(255,255,255,0.16)",
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                height: "100%",
                                borderRadius: 2,
                                width: `${Math.min(100, (demoSeconds / MIN_RECORDING_SECONDS) * 100)}%`,
                                backgroundColor: goalMet ? "#4ADE80" : themeColors.primary,
                              }}
                            />
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              marginTop: 4,
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 7,
                                color: "rgba(255,255,255,0.35)",
                              }}
                            >
                              0s
                            </Text>
                            <Text
                              style={{
                                fontFamily: "Inter_600SemiBold",
                                fontSize: 7,
                                color: goalMet ? "#4ADE80" : "rgba(255,255,255,0.5)",
                              }}
                            >
                              {goalMet
                                ? "✓ Great insight depth!"
                                : `${MIN_RECORDING_SECONDS - demoSeconds}s to go`}
                            </Text>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                fontSize: 7,
                                color: goalMet ? "#4ADE80" : "rgba(255,255,255,0.35)",
                              }}
                            >
                              50s
                            </Text>
                          </View>
                        </View>

                        {/* Three-button recording controls — Discard / Pause
                            / Save & Analyze, matching the real app exactly. */}
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-start",
                            marginTop: 16,
                            gap: 18,
                          }}
                        >
                          <View style={{ alignItems: "center", gap: 4 }}>
                            <View
                              style={{
                                width: 42,
                                height: 42,
                                borderRadius: 21,
                                backgroundColor: "rgba(255,255,255,0.10)",
                                borderWidth: 1.5,
                                borderColor: "rgba(255,255,255,0.22)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Trash size={17} color="rgba(255,255,255,0.9)" weight="regular" />
                            </View>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.85)",
                                fontSize: 8,
                              }}
                            >
                              Discard
                            </Text>
                          </View>

                          <View style={{ alignItems: "center", gap: 4 }}>
                            <View
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                backgroundColor: "rgba(255,255,255,0.14)",
                                borderWidth: 1.5,
                                borderColor: "rgba(255,255,255,0.3)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Pause size={22} color="#FFFFFF" weight="thin" />
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

                          <View style={{ alignItems: "center", gap: 4 }}>
                            <LinearGradient
                              colors={["#EF4444", "#DC2626"]}
                              style={{
                                width: 56,
                                height: 56,
                                borderRadius: 28,
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Check size={24} color="#FFFFFF" weight="bold" />
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
                      PHASE 2 — Processing (real recording-tab state)
                     ══════════════════════════════════════════ */}
                  {phase === "processing" && (
                    <Animated.View
                      style={[
                        { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
                        processingPhaseStyle,
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          color: "#FFFFFF",
                          fontSize: 17,
                          textAlign: "center",
                        }}
                      >
                        {processingLabel === "Transcribing your voice..."
                          ? "Transcribing..."
                          : "Processing..."}
                      </Text>
                      <View
                        style={{
                          backgroundColor: "rgba(255,255,255,0.08)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.15)",
                          borderRadius: 18,
                          paddingHorizontal: 22,
                          paddingVertical: 14,
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                          <ProcessingDot delay={0} />
                          <ProcessingDot delay={180} />
                          <ProcessingDot delay={360} />
                        </View>
                        <Text
                          style={{
                            fontFamily: "Inter_500Medium",
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 11,
                            textAlign: "center",
                          }}
                        >
                          {processingLabel}
                        </Text>
                      </View>
                    </Animated.View>
                  )}

                  {/* ══════════════════════════════════════════
                      PHASE 3 — Entry Results Screen (auto-scrolls through
                      the ENTIRE screen, matching entry-detail.tsx)
                     ══════════════════════════════════════════ */}
                  {phase === "entry" && (
                    <Animated.View style={[{ flex: 1 }, entryPhaseStyle]}>
                      {/* Fixed header bar — back / edit / delete, stays put
                          while the body below scrolls, exactly as in the
                          real app. */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: 14,
                          paddingTop: 12,
                          paddingBottom: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: "rgba(255,255,255,0.15)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ArrowLeft size={11} color="#FFFFFF" weight="regular" />
                        </View>
                        <View style={{ flexDirection: "row", gap: 6 }}>
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: "rgba(255,255,255,0.15)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <PencilSimple size={10} color="#FFFFFF" weight="regular" />
                          </View>
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: "rgba(239,68,68,0.18)",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Trash size={10} color="#FFFFFF" weight="regular" />
                          </View>
                        </View>
                      </View>

                      {/* Scrollable body — auto-scrolls top to bottom over
                          the phase duration so the entire results screen is
                          visible, not just a cropped slice. */}
                      <View
                        style={{ flex: 1 }}
                        onLayout={(e) => setEntryViewportHeight(e.nativeEvent.layout.height)}
                      >
                        <Animated.ScrollView
                          ref={scrollRef}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          onContentSizeChange={(_w, h) => setEntryContentHeight(h)}
                          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 16 }}
                        >
                          {/* Title + date */}
                          <Text
                            style={{
                              fontFamily: "Fraunces_700Bold",
                              color: "#FFFFFF",
                              fontSize: 14,
                              marginBottom: 2,
                            }}
                          >
                            A Moment of Clarity
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.7)",
                              fontSize: 8,
                              marginBottom: 10,
                            }}
                          >
                            Monday, April 14, 2025
                          </Text>

                          {/* Meta chips row — Time / Duration / Intensity */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.12)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.20)",
                              paddingVertical: 10,
                              marginBottom: 10,
                              flexDirection: "row",
                              justifyContent: "space-around",
                            }}
                          >
                            <View style={{ alignItems: "center" }}>
                              <Calendar size={11} color="rgba(255,255,255,0.9)" weight="regular" />
                              <Text
                                style={{
                                  fontFamily: "Inter_500Medium",
                                  color: "#FFFFFF",
                                  fontSize: 9,
                                  marginTop: 3,
                                }}
                              >
                                8:32 PM
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "Inter_400Regular",
                                  color: "rgba(255,255,255,0.5)",
                                  fontSize: 6.5,
                                }}
                              >
                                Time
                              </Text>
                            </View>
                            <View style={{ width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.15)" }} />
                            <View style={{ alignItems: "center" }}>
                              <Clock size={11} color="rgba(255,255,255,0.9)" weight="regular" />
                              <Text
                                style={{
                                  fontFamily: "Inter_500Medium",
                                  color: "#FFFFFF",
                                  fontSize: 9,
                                  marginTop: 3,
                                }}
                              >
                                3m
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "Inter_400Regular",
                                  color: "rgba(255,255,255,0.5)",
                                  fontSize: 6.5,
                                }}
                              >
                                Duration
                              </Text>
                            </View>
                            <View style={{ width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.15)" }} />
                            <View style={{ alignItems: "center" }}>
                              <Pulse size={11} color="rgba(255,255,255,0.9)" weight="regular" />
                              <Text
                                style={{
                                  fontFamily: "Inter_500Medium",
                                  color: "#FFFFFF",
                                  fontSize: 9,
                                  marginTop: 3,
                                }}
                              >
                                72%
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "Inter_400Regular",
                                  color: "rgba(255,255,255,0.5)",
                                  fontSize: 6.5,
                                }}
                              >
                                Intensity
                              </Text>
                            </View>
                          </View>

                          {/* Recommendation card */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.12)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.20)",
                              padding: 10,
                              marginBottom: 10,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 6,
                              }}
                            >
                              <Sparkle size={11} color="#FFFFFF" weight="regular" />
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 9.5,
                                  marginLeft: 5,
                                }}
                              >
                                Recommendation
                              </Text>
                            </View>
                            <View
                              style={{
                                backgroundColor: "rgba(255,255,255,0.08)",
                                borderRadius: 10,
                                padding: 8,
                                marginBottom: 8,
                              }}
                            >
                              <AnimatedReflectionText />
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                <SpeakerHigh size={9} color="#FFFFFF" weight="regular" />
                                <Text
                                  style={{
                                    fontFamily: "Inter_400Regular",
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: 8,
                                  }}
                                >
                                  Tap to listen
                                </Text>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  borderRadius: 12,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  backgroundColor: "rgba(255,255,255,0.08)",
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.13)",
                                  gap: 4,
                                }}
                              >
                                <Play size={9} color="#FFFFFF" weight="regular" />
                                <Text
                                  style={{
                                    fontFamily: "Inter_600SemiBold",
                                    color: "#FFFFFF",
                                    fontSize: 8,
                                  }}
                                >
                                  Listen
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Emotion Breakdown card — the ranked results,
                              plus Blended Emotions / Emotional Tension,
                              exactly as entry-detail.tsx renders them. */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.12)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.20)",
                              padding: 10,
                              marginBottom: 10,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <ChartBar size={11} color="#FFFFFF" weight="regular" />
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 9.5,
                                  marginLeft: 5,
                                }}
                              >
                                Emotion Breakdown
                              </Text>
                            </View>

                            <Text
                              style={{
                                fontFamily: "Inter_600SemiBold",
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 7,
                                textTransform: "uppercase",
                                letterSpacing: 0.6,
                                marginBottom: 6,
                              }}
                            >
                              Top Emotions — Plutchik Intensity
                            </Text>

                            {DEMO_EMOTIONS.map((e, rank) => (
                              <AnimatedBar
                                key={e.label}
                                label={e.label}
                                subLabel={e.subLabel}
                                score={e.score}
                                barOpacity={[1, 0.75, 0.55, 0.4][rank]}
                                isPrimary={rank === 0}
                                delay={200 + rank * 150}
                              />
                            ))}

                            {/* Blended Emotions */}
                            <View
                              style={{
                                marginTop: 8,
                                paddingTop: 10,
                                borderTopWidth: 1,
                                borderTopColor: "rgba(255,255,255,0.1)",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "rgba(255,255,255,0.55)",
                                  fontSize: 7,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.6,
                                  marginBottom: 6,
                                }}
                              >
                                Blended Emotions
                              </Text>
                              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                                {["Love", "Awe"].map((blend) => (
                                  <View
                                    key={blend}
                                    style={{
                                      borderRadius: 12,
                                      borderWidth: 1,
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      ...WHITE_BADGE_STYLE,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontFamily: "Inter_600SemiBold",
                                        color: "#FFFFFF",
                                        fontSize: 8,
                                      }}
                                    >
                                      {blend}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>

                            {/* Emotional Tension */}
                            <View style={{ marginTop: 10 }}>
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "rgba(255,255,255,0.55)",
                                  fontSize: 7,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.6,
                                  marginBottom: 6,
                                }}
                              >
                                Emotional Tension
                              </Text>
                              <View
                                style={{
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                  alignSelf: "flex-start",
                                  ...WHITE_BADGE_STYLE,
                                }}
                              >
                                <Text
                                  style={{
                                    fontFamily: "Inter_600SemiBold",
                                    color: "#FFFFFF",
                                    fontSize: 8,
                                  }}
                                >
                                  joy ↔ sadness
                                </Text>
                              </View>
                              <Text
                                style={{
                                  fontFamily: "Inter_400Regular",
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: 7,
                                  marginTop: 5,
                                }}
                              >
                                Opposing emotions detected simultaneously
                              </Text>
                            </View>
                          </View>

                          {/* Topics */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.12)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.20)",
                              padding: 10,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 6,
                              }}
                            >
                              <Target size={11} color="#FFFFFF" weight="regular" />
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 9.5,
                                  marginLeft: 5,
                                }}
                              >
                                Topics
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                              {["Self-Awareness", "Boundaries", "Growth"].map((topic) => (
                                <View
                                  key={topic}
                                  style={{
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                    backgroundColor: "rgba(255,255,255,0.08)",
                                    borderWidth: 1,
                                    borderColor: "rgba(255,255,255,0.20)",
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
                              ))}
                            </View>
                          </View>
                        </Animated.ScrollView>
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
                  weight="regular"
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
                  No Payment Due Now
                </Text>
              </View>

              <Pressable
                onPress={handleContinue}
                style={{
                  width: "100%",
                  borderRadius: 50,
                  borderWidth: 2,
                  borderColor: themeColors.secondary,
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
                    borderRadius: 48,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 18,
                      marginRight: 6,
                    }}
                  >
                    Try for $0.00
                  </Text>
                  <CaretRight size={20} color="#FFFFFF" weight="regular" />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ── Animated Recommendation text that types in (demo pacing only — the
//    real app displays the AI reflection instantly; this reveal is purely
//    a stylistic device to keep the demo engaging). ──
function AnimatedReflectionText() {
  const reflectionText =
    "You showed real self-awareness today. Setting boundaries is a sign of growth — keep trusting the process.";
  const [charIndex, setCharIndex] = React.useState(0);

  useEffect(() => {
    if (charIndex < reflectionText.length) {
      const t = setTimeout(() => setCharIndex((c) => c + 1), 22);
      return () => clearTimeout(t);
    }
  }, [charIndex]);

  return (
    <Text
      style={{
        fontFamily: "Inter_400Regular",
        color: "rgba(255,255,255,0.92)",
        fontSize: 9,
        lineHeight: 14,
      }}
    >
      {reflectionText.substring(0, charIndex)}
      {charIndex < reflectionText.length ? (
        <Text style={{ color: "rgba(255,255,255,0.4)" }}>|</Text>
      ) : null}
    </Text>
  );
}
