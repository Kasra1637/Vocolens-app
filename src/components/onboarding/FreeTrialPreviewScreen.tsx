/**
 * FreeTrialPreviewScreen
 *
 * "We want you to try Vocolens for free."
 *
 * Six-phase animated app demo that mirrors the REAL current app UI/UX,
 * not a stylised approximation:
 *   Phase 1 — Idle: "Speak your mind" + the real MicButton (sonar, halo,
 *             bezel) + "Tap to start". A scripted press (the exact
 *             withSpring(0.92) the real button uses) starts recording.
 *   Phase 2 — Recording screen: header states, the (accurate) transparent
 *             live-status card with its real placeholder copy — the app has
 *             no live/streaming transcript, so this demo doesn't fake one —
 *             the 50s insight-depth goal bar, and the real 3-button control
 *             row (Discard / Pause / Save & Analyze). A scripted press on
 *             Save ends the recording.
 *   Phase 3 — Processing: the real pulsing-dot indicator + "Transcribing
 *             your voice..." / "Analyzing emotions..." copy shown in-place
 *             on the recording tab while the entry is analysed.
 *   Phase 4 — Reflection review: "AI detected these emotions" + the
 *             "Adjust how it felt" sliders + Save, then the real
 *             "Saving..." overlay.
 *   Phase 5 — Entry results: the saved entry — title, date, meta chips, Full
 *             Transcript, the Emotion Breakdown card (ranked Plutchik
 *             emotions), collapsed AI Analysis, and Topics.
 *   Phase 6 — Insights: greeting + streak card + the real BodyHeatmapCard
 *             with demo data, auto-gliding like the site demo.
 *
 * A single wall-clock driver advances the whole story and loops it; every
 * press occupies the tail of the state it acts on so it bottoms out exactly
 * as that state changes. All colors come from the selected onboarding theme.
 *
 * Screens, copy, scores and timing are a deliberate port of the site's hero
 * demo (site src/components/vocolens/AppDemo.tsx + demo/*) so the two stay in
 * step; the real app components (MicButton, AdjustmentSliderCard,
 * BodyHeatmapCard) stand in for the site's hand-drawn equivalents, and the
 * app's own real-icon tab bar replaces the site chrome. Four dots below the
 * phone jump between the screens, as on the site.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
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
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
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
  ChartBar,
  Target,
  Trophy,
  CaretDown as ChevronDown,
  ChatTeardropText as MessageSquareText,
} from "phosphor-react-native";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { BackButton } from "@/components/onboarding/BackButton";
import { MicButton } from "@/components/MicButton";
import BodyHeatmapCard from "@/components/BodyHeatmapCard";
import { AnimatedStreakFlame } from "@/components/AnimatedStreakFlame";
import AdjustmentSliderCard from "@/components/shared/AdjustmentSliderCard";
import type { JournalEntry } from "@/lib/types";
import { useClickSound } from "@/lib/hooks/useClickSound";

// ── Demo clock ── one wall-clock driver advances the whole story and loops
// it, so background throttling can't desync the choreography. Each press
// occupies the tail of the state it acts on (PRESS_MS), bottoming out
// exactly as that state changes.
const PRESS_MS = 350;
const T = {
  micPressStart: 1200,
  recordStart: 1200 + PRESS_MS,
  recordEnd: 8600,
  savePressStart: 8600 - PRESS_MS,
  transcribeEnd: 10600,
  analyzeEnd: 12600,
  reflectSavePressStart: 14500,
  reflectSavePressEnd: 14500 + PRESS_MS,
  savingEnd: 16600,
  journalEnd: 20100,
  total: 23600,
} as const;

// Dot navigation mirrors the site demo's four screens
// (site AppDemo.tsx:37-38, 80-85).
const DOT_STARTS = [0, T.analyzeEnd, T.savingEnd, T.journalEnd] as const;
const DOT_LABELS = ["Record", "Reflection", "Entry", "Insights"] as const;

// Auto-scroll choreography per scrolling phase. The pass is a pure function
// of the clock rather than a setTimeout, so it always targets the true
// measured maximum, re-aims by itself if the content resizes mid-phase, and
// then holds at the bottom for whatever is left of the phase so the result is
// actually readable. Insights mirrors the site's 950ms delay / 1600ms glide.
// The site's reflection layer does not scroll; this pass only engages if the
// real (taller) adjustment sliders overflow the panel, so it degrades
// gracefully instead of clipping.
const REFLECT_SCROLL_DELAY = 300;
const REFLECT_SCROLL_DURATION = 900;
const ENTRY_SCROLL_DELAY = 700;
const ENTRY_SCROLL_DURATION = 3000;
const INSIGHTS_SCROLL_DELAY = 950;
const INSIGHTS_SCROLL_DURATION = 1600;

// The demo panel is a compressed view of a phone screen, not a full one, so
// every app component is rendered at its true size and then uniformly scaled
// to the panel's scale. One constant drives the lot so the real components and
// the hand-rolled panels stay in proportion with each other on any device.
const MOCK_SCALE = 0.72;

const MIN_RECORDING_SECONDS = 50; // matches the real insight-depth goal

type DemoPhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "analyzing"
  | "reflection"
  | "entry"
  | "insights";

function phaseAt(t: number): DemoPhase {
  if (t < T.recordStart) return "idle";
  if (t < T.recordEnd) return "recording";
  if (t < T.transcribeEnd) return "transcribing";
  if (t < T.analyzeEnd) return "analyzing";
  if (t < T.savingEnd) return "reflection";
  if (t < T.journalEnd) return "entry";
  return "insights";
}

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

// Detected emotions — the exact set and scores the site demo shows
// (site demo/ReflectionScreen.tsx:11-15 and demo/JournalScreen.tsx:218-222),
// shared by the reflection review and the entry screen so the two agree.
const DEMO_EMOTIONS = [
  { label: "Happiness", subLabel: undefined, score: 85 },
  { label: "Trust", subLabel: undefined, score: 51 },
  { label: "Anticipation", subLabel: undefined, score: 42 },
];

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const DEMO_TRANSCRIPT =
  "Started my day with a great workout. Feeling energized and ready to tackle the day. The sunrise was beautiful and I feel grateful for this moment of peace.";

// ── Demo entries backing the real BodyHeatmapCard in the Insights phase.
const DEMO_ENTRIES: JournalEntry[] = [
  {
    id: "demo-entry-1",
    title: "Morning Reflections",
    transcript: "Started my day with a great workout.",
    duration: 120,
    createdAt: daysAgoIso(2),
    updatedAt: daysAgoIso(2),
    emotions: ["happiness", "trust"],
    primaryEmotion: "happiness",
    emotionIntensity: 78,
    valence: 45,
    arousal: 60,
    bodyRegions: [
      { region: "chest", intensity: 4 },
      { region: "stomach", intensity: 3 },
    ],
    distressLevel: "low",
    topics: ["Gratitude"],
  },
  {
    id: "demo-entry-2",
    title: "Evening Wind-down",
    transcript: "Taking a moment to breathe and reflect.",
    duration: 180,
    createdAt: daysAgoIso(9),
    updatedAt: daysAgoIso(9),
    emotions: ["happiness", "anticipation"],
    primaryEmotion: "happiness",
    emotionIntensity: 65,
    valence: 30,
    arousal: 40,
    bodyRegions: [
      { region: "chest", intensity: 5 },
      { region: "head", intensity: 2 },
      { region: "hands", intensity: 3 },
    ],
    distressLevel: "low",
    topics: ["Self-Awareness"],
  },
];

// ── One clock-driven auto-scroll for a demo phase. Returns the ref to put on
//    the phase's ScrollView plus the two callbacks that feed the measured
//    content/viewport heights in. Progress is a pure function of the clock, so
//    the pass always aims at the true maximum, re-aims itself if the content
//    resizes mid-phase, and then holds at the bottom for the rest of the
//    phase. Content that already fits yields a max of 0 and never moves.
function useMockAutoScroll(
  clockSV: SharedValue<number>,
  startAt: number,
  delay: number,
  duration: number,
) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const contentH = useSharedValue(0);
  const viewportH = useSharedValue(0);

  const offset = useDerivedValue(() => {
    const raw = (clockSV.value - (startAt + delay)) / duration;
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    return p * Math.max(0, contentH.value - viewportH.value);
  });

  useDerivedValue(() => {
    scrollTo(ref, 0, offset.value, false);
  });

  return {
    ref,
    onContentSizeChange: (_w: number, h: number) => {
      contentH.value = h;
    },
    onLayout: (e: LayoutChangeEvent) => {
      viewportH.value = e.nativeEvent.layout.height;
    },
  };
}

// ── Renders a real app component at its true size, scaled to the demo panel's
//    scale. The child is laid out at panelWidth / MOCK_SCALE so that after the
//    transform it lands exactly on the panel width, and a spacer reserves the
//    scaled height so surrounding layout (including the auto-scroll targets)
//    measures the visual size, not the pre-transform one.
function ScaledMock({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const [boxW, setBoxW] = useState(0);
  const [childH, setChildH] = useState(0);

  return (
    <View
      style={style}
      onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
    >
      <View
        style={{
          width: boxW > 0 ? boxW / MOCK_SCALE : undefined,
          transform: [{ scale: MOCK_SCALE }],
          transformOrigin: "top left",
        }}
        onLayout={(e) => setChildH(e.nativeEvent.layout.height)}
      >
        {children}
      </View>
      {childH > 0 ? <View style={{ height: childH * MOCK_SCALE }} /> : null}
    </View>
  );
}

export function FreeTrialPreviewScreen() {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const currentStep = useOnboardingStore((s) => s.currentStep);
  const themeColors = THEME_COLORS[selectedTheme];
  const playClickSound = useClickSound();

  // Demo clock — wall-clock deltas in a 100ms interval, modulo the loop.
  // `clock` drives JSX; `clockSV` mirrors it for the UI-thread auto-scroll.
  const [clock, setClock] = useState(0);
  const clockSV = useSharedValue(0);
  const clockRef = useRef(0);
  useEffect(() => {
    const lastRef = { current: Date.now() };
    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastRef.current;
      lastRef.current = now;
      clockRef.current = (clockRef.current + elapsed) % T.total;
      clockSV.value = clockRef.current;
      setClock(clockRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [clockSV]);

  const phase = phaseAt(clock);

  // Dot navigation — the same four screens the site demo exposes.
  const dotIndex =
    clock < T.analyzeEnd ? 0 : clock < T.savingEnd ? 1 : clock < T.journalEnd ? 2 : 3;

  const goToScreen = useCallback(
    (index: number) => {
      clockRef.current = DOT_STARTS[index];
      clockSV.value = clockRef.current;
      setClock(clockRef.current);
    },
    [clockSV],
  );

  // Scripted presses — the mic uses the exact spring the real MicButton
  // uses (withSpring 0.92, damping 15, stiffness 400); the Save buttons use
  // a bare withSpring(0.92) like the real Pause control. (The real Save
  // buttons carry Shadows.large but no scale animation, so the press itself
  // is a deliberate demo enhancement, not app-verbatim.)
  // MOCK_SCALE keeps the real MicButton (216dp across) in proportion with the
  // rest of the panel. `scale` is the app's own external-scale hook, so the
  // sonar, halo and bezel shrink together and the press springs from there.
  const micScale = useSharedValue(MOCK_SCALE);
  const saveScale = useSharedValue(1);
  const rsaveScale = useSharedValue(1);
  const cardFloat = useSharedValue(0);
  const micPressed = clock >= T.micPressStart && clock < T.recordStart;
  const savePressed = clock >= T.savePressStart && clock < T.transcribeEnd;
  const rsavePressed =
    clock >= T.reflectSavePressStart && clock < T.reflectSavePressEnd;

  React.useEffect(() => {
    micScale.value = micPressed
      ? withSpring(MOCK_SCALE * 0.92, { damping: 15, stiffness: 400 })
      : withSpring(MOCK_SCALE, { damping: 15, stiffness: 400 });
  }, [micPressed, micScale]);

  React.useEffect(() => {
    saveScale.value = savePressed ? withSpring(0.92) : withSpring(1);
  }, [savePressed, saveScale]);

  React.useEffect(() => {
    rsaveScale.value = rsavePressed ? withSpring(0.92) : withSpring(1);
  }, [rsavePressed, rsaveScale]);

  const saveScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: saveScale.value }],
  }));
  const rsaveScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rsaveScale.value }],
  }));

  // Matches the site demo: the label swaps at 45% of the processing window.
  const processingLabel =
    clock < T.recordEnd + (T.transcribeEnd - T.recordEnd) * 0.45
      ? "Transcribing your voice..."
      : "Analyzing emotions...";

  // Duration counter — derived from the clock, mirrors the real timer.
  const demoSeconds =
    phase === "recording"
      ? Math.min(7, Math.max(0, Math.floor((clock - T.recordStart) / 1000)))
      : 0;

  // Clock-driven auto-scroll, one instance per scrolling phase. Heights live
  // in shared values (not state) so re-measuring never re-runs an effect, and
  // the offset is derived straight from the clock — no timers to clear, no
  // stale maxScroll captured before the content finished laying out. A phase
  // whose content fits simply yields a max of 0 and never moves.
  const reflectScroll = useMockAutoScroll(
    clockSV,
    T.analyzeEnd,
    REFLECT_SCROLL_DELAY,
    REFLECT_SCROLL_DURATION,
  );
  const entryScroll = useMockAutoScroll(
    clockSV,
    T.savingEnd,
    ENTRY_SCROLL_DELAY,
    ENTRY_SCROLL_DURATION,
  );
  const insightsScroll = useMockAutoScroll(
    clockSV,
    T.journalEnd,
    INSIGHTS_SCROLL_DELAY,
    INSIGHTS_SCROLL_DURATION,
  );

  useEffect(() => {
    cardFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [cardFloat]);

  const cardFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
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
              paddingHorizontal: 16,
              justifyContent: "space-between",
              paddingTop: 10,
              paddingBottom: 20,
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
              style={[cardFloatStyle, { flex: 1, marginTop: 10, marginBottom: 12 }]}
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
                      PHASE 1 — Idle ("Speak your mind" + real MicButton)
                      A scripted press on the mic starts the recording.
                     ══════════════════════════════════════════ */}
                  {phase === "idle" && (
                    <Animated.View
                      entering={FadeIn.duration(400)}
                      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text
                        style={{
                          fontFamily: "Fraunces_700Bold",
                          color: "#FFFFFF",
                          fontSize: 17,
                          textAlign: "center",
                        }}
                      >
                        Speak your mind
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255,255,255,0.8)",
                          fontSize: 10,
                          textAlign: "center",
                          marginTop: 4,
                        }}
                      >
                        What&apos;s on your mind today?
                      </Text>
                      <View style={{ marginVertical: 6 }}>
                        <MicButton
                          onPress={() => {}}
                          disabled
                          micButtonGradient={
                            themeColors.micButtonGradient as [string, string, string]
                          }
                          glowColor={themeColors.buttonGlowColor}
                          scale={micScale}
                        />
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "#FFFFFF",
                          fontSize: 10,
                        }}
                      >
                        Tap to start
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          color: "rgba(255,255,255,0.45)",
                          fontSize: 8,
                          textAlign: "center",
                          marginTop: 4,
                          paddingHorizontal: 24,
                        }}
                      >
                        Record for at least 50s for accurate emotional insights
                      </Text>
                    </Animated.View>
                  )}

                  {/* ══════════════════════════════════════════
                      PHASE 2 — Recording Screen
                     ══════════════════════════════════════════ */}
                  {phase === "recording" && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
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
                            <Animated.View style={saveScaleStyle}>
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
                            </Animated.View>
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
                      PHASE 3/4 — Processing: the transcribing and
                      analysing states share this screen and swap the
                      label, exactly as the site demo does.
                     ══════════════════════════════════════════ */}
                  {(phase === "transcribing" || phase === "analyzing") && (
                    <Animated.View
                      entering={FadeIn.duration(400)}
                      style={[
                        { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
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
                      PHASE 4 — Reflection review + Saving overlay.
                      Same detected set the entry phase later confirms
                      (Serenity PRIMARY), so the story stays coherent.
                     ══════════════════════════════════════════ */}
                  {phase === "reflection" && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
                      <View style={{ flex: 1 }} onLayout={reflectScroll.onLayout}>
                        <Animated.ScrollView
                          ref={reflectScroll.ref}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          onContentSizeChange={reflectScroll.onContentSizeChange}
                          contentContainerStyle={{
                            paddingTop: 14,
                            paddingHorizontal: 16,
                            paddingBottom: 20,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "rgba(255,255,255,0.8)",
                              fontSize: 8,
                              marginBottom: 8,
                            }}
                          >
                            AI detected these emotions
                          </Text>
                          {DEMO_EMOTIONS.map((e, rank) => (
                            <AnimatedBar
                              key={e.label}
                              label={e.label}
                              subLabel={e.subLabel}
                              score={e.score}
                              barOpacity={[1, 0.55, 0.55][rank]}
                              isPrimary={rank === 0}
                              delay={200 + rank * 150}
                            />
                          ))}
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.5)",
                              fontSize: 7,
                              marginTop: 6,
                            }}
                          >
                            Not quite right? Tap to edit
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_600SemiBold",
                              color: "rgba(255,255,255,0.8)",
                              fontSize: 8,
                              marginTop: 12,
                              marginBottom: 8,
                            }}
                          >
                            Adjust how it felt
                          </Text>
                          <ScaledMock>
                            <AdjustmentSliderCard
                              label="Unpleasant ↔ Pleasant"
                              value={24}
                              min={-100}
                              max={100}
                              step={2}
                              onChange={() => {}}
                              minLabel="Unpleasant"
                              maxLabel="Pleasant"
                            />
                          </ScaledMock>
                          <ScaledMock>
                            <AdjustmentSliderCard
                              label="Calm ↔ Activated"
                              value={54}
                              min={0}
                              max={100}
                              step={2}
                              onChange={() => {}}
                              minLabel="Calm"
                              maxLabel="Activated"
                            />
                          </ScaledMock>
                          <View style={{ alignItems: "center", marginTop: 12 }}>
                            <Animated.View style={rsaveScaleStyle}>
                              <LinearGradient
                                colors={themeColors.buttonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0, y: 1 }}
                                style={{
                                  borderRadius: 24,
                                  paddingHorizontal: 32,
                                  paddingVertical: 10,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    fontFamily: "Inter_600SemiBold",
                                    color: "#FFFFFF",
                                    fontSize: 11,
                                  }}
                                >
                                  Save
                                </Text>
                              </LinearGradient>
                            </Animated.View>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 8,
                                marginTop: 6,
                              }}
                            >
                              Skip this step
                            </Text>
                          </View>
                        </Animated.ScrollView>
                        {clock >= T.reflectSavePressEnd && (
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(0,0,0,0.45)",
                            borderRadius: 24,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter_500Medium",
                              color: "#FFFFFF",
                              fontSize: 13,
                            }}
                          >
                            Saving...
                          </Text>
                        </View>
                      )}
                      </View>
                    </Animated.View>
                  )}

                  {/* ══════════════════════════════════════════
                      PHASE 5 — Entry Results Screen (auto-scrolls through
                      the ENTIRE screen, matching entry-detail.tsx)
                     ══════════════════════════════════════════ */}
                  {phase === "entry" && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
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
                      <View style={{ flex: 1 }} onLayout={entryScroll.onLayout}>
                        <Animated.ScrollView
                          ref={entryScroll.ref}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          onContentSizeChange={entryScroll.onContentSizeChange}
                          contentContainerStyle={{
                            paddingHorizontal: 14,
                            paddingBottom: 28,
                          }}
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
                            Morning Reflections
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.7)",
                              fontSize: 8,
                              marginBottom: 10,
                            }}
                          >
                            Wednesday, February 4, 2026
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
                                9:10 PM
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
                                2m
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
                                85%
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

                          {/* Full Transcript — the site's entry card
                              (site demo/JournalScreen.tsx:132-144). */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.18)",
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
                              <MessageSquareText
                                size={11}
                                color="rgba(255,255,255,0.85)"
                                weight="regular"
                              />
                              <Text
                                style={{
                                  fontFamily: "Inter_600SemiBold",
                                  color: "#FFFFFF",
                                  fontSize: 9.5,
                                  marginLeft: 5,
                                }}
                              >
                                Full Transcript
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontFamily: "Inter_400Regular",
                                color: "rgba(255,255,255,0.6)",
                                fontSize: 8,
                                lineHeight: 12,
                              }}
                            >
                              {DEMO_TRANSCRIPT}
                            </Text>
                          </View>

                          {/* Emotion Breakdown card — the same three ranked
                              emotions the reflection review detected. */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.18)",
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
                                barOpacity={[1, 0.55, 0.55][rank]}
                                isPrimary={rank === 0}
                                delay={200 + rank * 150}
                              />
                            ))}
                          </View>

                          {/* AI Analysis — collapsed, matching the site's
                              entry screen (site demo/JournalScreen.tsx:167-181). */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.06)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.14)",
                              padding: 10,
                              marginBottom: 10,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                              >
                                <MessageSquareText
                                  size={11}
                                  color="rgba(255,255,255,0.4)"
                                  weight="regular"
                                />
                                <Text
                                  style={{
                                    fontFamily: "Inter_600SemiBold",
                                    color: "#FFFFFF",
                                    fontSize: 9.5,
                                    marginLeft: 5,
                                  }}
                                >
                                  AI Analysis
                                </Text>
                              </View>
                              <ChevronDown
                                size={11}
                                color="rgba(255,255,255,0.4)"
                                weight="regular"
                              />
                            </View>
                          </View>

                          {/* Topics */}
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.18)",
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
                              {["Exercise", "Gratitude"].map((topic) => (
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

                  {/* ══════════════════════════════════════════
                      PHASE 6 — Insights (streak card + the real
                      BodyHeatmapCard, auto-gliding like the entry pass)
                     ══════════════════════════════════════════ */}
                  {phase === "insights" && (
                    <Animated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
                      <View style={{ flex: 1 }} onLayout={insightsScroll.onLayout}>
                        <Animated.ScrollView
                          ref={insightsScroll.ref}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          onContentSizeChange={insightsScroll.onContentSizeChange}
                          contentContainerStyle={{
                            paddingHorizontal: 14,
                            paddingTop: 12,
                            paddingBottom: 28,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Fraunces_700Bold",
                              color: "#FFFFFF",
                              fontSize: 14,
                              textAlign: "center",
                            }}
                          >
                            Good morning, Alex!
                          </Text>
                          <Text
                            style={{
                              fontFamily: "Inter_400Regular",
                              color: "rgba(255,255,255,0.65)",
                              fontSize: 8,
                              textAlign: "center",
                              marginTop: 2,
                              marginBottom: 6,
                            }}
                          >
                            Here&apos;s what your voice revealed about you.
                          </Text>
                          <View
                            style={{
                              borderRadius: 14,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              borderWidth: 1.5,
                              borderColor: "rgba(255,255,255,0.18)",
                              padding: 10,
                              marginBottom: 10,
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 8,
                              }}
                            >
                              {/* Flame and trophy share the 30-Day Milestone
                                  tile spec: 26px circle, 13px glyph. The
                                  flame needs badgeSize/badgeRadius passed
                                  explicitly — they default to 48/16, which
                                  renders an oversized square. */}
                              <AnimatedStreakFlame
                                streak={7}
                                size={13}
                                badgeSize={26}
                                badgeRadius={13}
                                badgeColor="rgba(255,255,255,0.12)"
                                iconColor="#FFFFFF"
                              />
                              <View>
                                <Text
                                  style={{
                                    fontFamily: "Inter_600SemiBold",
                                    color: "#FFFFFF",
                                    fontSize: 11,
                                  }}
                                >
                                  7 days streak
                                </Text>
                                <Text
                                  style={{
                                    fontFamily: "Inter_400Regular",
                                    color: "rgba(255,255,255,0.75)",
                                    fontSize: 8,
                                  }}
                                >
                                  Next: 14-day streak
                                </Text>
                              </View>
                            </View>
                            <View
                              style={{
                                height: 1,
                                backgroundColor: "rgba(147,112,219,0.15)",
                                marginVertical: 6,
                              }}
                            />
                            <View
                              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                            >
                              <View
                                style={{
                                  width: 26,
                                  height: 26,
                                  borderRadius: 13,
                                  backgroundColor: "rgba(255,255,255,0.12)",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Trophy size={13} color="#FFFFFF" weight="regular" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontFamily: "Inter_400Regular",
                                    color: "#FFFFFF",
                                    fontSize: 9,
                                    marginBottom: 4,
                                  }}
                                >
                                  Next: 30-Day Milestone
                                </Text>
                                <View
                                  style={{
                                    height: 5,
                                    borderRadius: 3,
                                    backgroundColor: "rgba(147,112,219,0.15)",
                                    overflow: "hidden",
                                  }}
                                >
                                  <View
                                    style={{
                                      height: "100%",
                                      borderRadius: 3,
                                      width: "46%",
                                      backgroundColor: "#FFFFFF",
                                    }}
                                  />
                                </View>
                              </View>
                            </View>
                          </View>
                          <ScaledMock>
                            <BodyHeatmapCard
                              entries={DEMO_ENTRIES}
                              primaryColor={themeColors.primary}
                            />
                          </ScaledMock>
                        </Animated.ScrollView>
                      </View>
                    </Animated.View>
                  )}
                </LinearGradient>
              </View>
            </Animated.View>

            {/* ── Stage dots — the same four the site demo exposes ── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                alignSelf: "center",
                marginBottom: 10,
              }}
            >
              {DOT_STARTS.map((start, index) => (
                <Pressable
                  key={start}
                  onPress={() => goToScreen(index)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: dotIndex === index }}
                  accessibilityLabel={DOT_LABELS[index]}
                  style={{ padding: 6 }}
                >
                  <View
                    style={{
                      width: dotIndex === index ? 18 : 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        dotIndex === index
                          ? themeColors.primary
                          : "rgba(147,112,219,0.35)",
                    }}
                  />
                </Pressable>
              ))}
            </View>

            {/* ── No payment text + CTA ── */}
            <Animated.View
              entering={FadeIn.delay(500).duration(600).easing(SOFT)}
              style={{ alignItems: "center", paddingBottom: 20 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
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
                    paddingVertical: 13,
                    borderRadius: 48,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Inter_700Bold",
                      fontSize: 16,
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
