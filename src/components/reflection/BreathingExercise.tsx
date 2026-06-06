import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { successHaptic, tapHaptic } from "@/lib/haptics";

type Phase = "ready" | "inhale" | "hold" | "exhale" | "done";

const PHASES: { phase: Phase; label: string; emoji: string; duration: number; color: string }[] = [
  { phase: "inhale", label: "Breathe In",  emoji: "🫁", duration: 4000, color: "rgba(99, 179, 237, 0.35)"  },
  { phase: "hold",   label: "Hold",        emoji: "🤍", duration: 7000, color: "rgba(255,255,255,0.18)"    },
  { phase: "exhale", label: "Breathe Out", emoji: "🌿", duration: 8000, color: "rgba(104, 211, 145, 0.35)" },
];

const TOTAL_CYCLES = 3;

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function BreathingExercise({ onComplete, onSkip }: Props) {
  const [phase,       setPhase]      = useState<Phase>("ready");
  const [cycle,       setCycle]      = useState(0);
  const [countdown,   setCountdown]  = useState(0);
  const [phaseIdx,    setPhaseIdx]   = useState(0);

  const scale        = useSharedValue(0.55);
  const outerScale   = useSharedValue(0.70);
  const ringOpacity  = useSharedValue(0.0);

  const timerRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const countRef     = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timerRef.current != null) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countRef.current != null) { clearInterval(countRef.current); countRef.current = null; }
  };

  // Start countdown display for a phase
  const startCountdown = (seconds: number) => {
    if (countRef.current != null) { clearInterval(countRef.current); countRef.current = null; }
    setCountdown(seconds);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    countRef.current = id;
  };

  const runPhase = useCallback((pIdx: number, cyc: number) => {
    if (pIdx >= PHASES.length) {
      const nextCycle = cyc + 1;
      setCycle(nextCycle);
      if (nextCycle >= TOTAL_CYCLES) {
        setPhase("done");
        successHaptic();
        return;
      }
      runPhase(0, nextCycle);
      return;
    }

    const p = PHASES[pIdx];
    setPhase(p.phase);
    setPhaseIdx(pIdx);
    startCountdown(Math.round(p.duration / 1000));
    tapHaptic();

    if (p.phase === "inhale") {
      scale.value      = withTiming(1.0, { duration: p.duration, easing: Easing.out(Easing.ease) });
      outerScale.value = withTiming(1.15, { duration: p.duration, easing: Easing.out(Easing.ease) });
      ringOpacity.value = withTiming(0.6, { duration: 600 });
    } else if (p.phase === "exhale") {
      scale.value      = withTiming(0.55, { duration: p.duration, easing: Easing.in(Easing.ease) });
      outerScale.value = withTiming(0.70, { duration: p.duration, easing: Easing.in(Easing.ease) });
      ringOpacity.value = withTiming(0.2, { duration: 600 });
    }

    timerRef.current = setTimeout(() => runPhase(pIdx + 1, cyc), p.duration);
  }, []);

  const start = useCallback(() => {
    tapHaptic();
    setCycle(0);
    runPhase(0, 0);
  }, [runPhase]);

  useEffect(() => () => clearTimers(), []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerScale.value }],
    opacity: ringOpacity.value,
  }));

  const currentPhaseData = PHASES.find((p) => p.phase === phase);
  const bgColor = currentPhaseData?.color ?? "rgba(255,255,255,0.12)";
  const emoji   = currentPhaseData?.emoji ?? "🫧";

  return (
    <View style={s.container}>
      <Text style={s.title}>4-7-8 Breathing</Text>
      <Text style={s.sub}>
        {phase === "ready"
          ? "3 cycles · calms your nervous system"
          : phase === "done"
          ? "Well done 🌿"
          : `Cycle ${Math.min(cycle + 1, TOTAL_CYCLES)} of ${TOTAL_CYCLES}`}
      </Text>

      {/* Cycle dots */}
      <View style={s.cycleDots}>
        {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
          <View
            key={i}
            style={[
              s.cycleDot,
              i < cycle && s.cycleDotDone,
              i === cycle && phase !== "ready" && phase !== "done" && s.cycleDotActive,
            ]}
          />
        ))}
      </View>

      {/* Breathing orb */}
      <Pressable
        onPress={phase === "ready" ? start : undefined}
        style={s.circleWrap}
        disabled={phase !== "ready"}
      >
        {/* Outer glow ring */}
        <Animated.View style={[s.outerRing, { borderColor: bgColor }, outerStyle]} />

        {/* Main orb */}
        <Animated.View style={[s.circle, { backgroundColor: bgColor }, circleStyle]}>
          {phase !== "ready" && phase !== "done" && (
            <Text style={s.countdownNum}>{countdown}</Text>
          )}
        </Animated.View>

        {/* Label only — no emoji overlaying the countdown number */}
        <View style={s.labelWrap} pointerEvents="none">
          {phase === "ready" ? (
            <Text style={s.tapLabel}>Tap to start</Text>
          ) : phase === "done" ? (
            <Text style={s.phaseEmoji}>✨</Text>
          ) : null}
        </View>
      </Pressable>

      {/* Phase label — shown below orb during active phases */}
      {phase !== "ready" && phase !== "done" && (
        <Text style={[s.phaseLabel, { marginTop: 8, marginBottom: 4 }]}>
          {currentPhaseData?.label}
        </Text>
      )}

      {/* Phase progress bar */}
      {phase !== "ready" && phase !== "done" && (
        <Animated.View entering={FadeIn.duration(300)} style={s.phaseBar}>
          {PHASES.map((p, i) => (
            <View
              key={p.phase}
              style={[
                s.phaseSegment,
                i === phaseIdx && s.phaseSegmentActive,
                i < phaseIdx  && s.phaseSegmentDone,
              ]}
            />
          ))}
        </Animated.View>
      )}

      {/* Actions */}
      {phase === "done" && (
        <Animated.View entering={FadeIn.duration(400)}>
          <Pressable onPress={onComplete} style={s.doneBtn}>
            <Text style={s.doneBtnText}>Continue →</Text>
          </Pressable>
        </Animated.View>
      )}

      <Pressable onPress={onSkip} style={s.skipBtn}>
        <Text style={s.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const ORB = 180;

const s = StyleSheet.create({
  container:  { alignItems: "center", padding: 24 },
  title:      { fontSize: 20, fontFamily: "Fraunces_700Bold", color: "#FFFFFF", marginBottom: 4 },
  sub:        { fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 20 },

  cycleDots:  { flexDirection: "row", gap: 8, marginBottom: 24 },
  cycleDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.2)" },
  cycleDotActive: { backgroundColor: "#FFFFFF", width: 22, borderRadius: 4 },
  cycleDotDone:   { backgroundColor: "rgba(255,255,255,0.55)" },

  circleWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: ORB + 60,
    height: ORB + 60,
    marginBottom: 24,
  },
  outerRing: {
    position: "absolute",
    width: ORB + 40,
    height: ORB + 40,
    borderRadius: (ORB + 40) / 2,
    borderWidth: 2,
  },
  circle: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  countdownNum:  { fontSize: 44, fontWeight: "700", color: "#FFFFFF", opacity: 0.5 },
  labelWrap:     { position: "absolute", alignItems: "center" },
  tapLabel:      { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  phaseEmoji:    { fontSize: 28, marginBottom: 4 },
  phaseLabel:    { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  phaseBar: { flexDirection: "row", gap: 6, marginBottom: 24, width: "60%" },
  phaseSegment: {
    flex: 1, height: 5, borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  phaseSegmentActive: { backgroundColor: "rgba(255,255,255,0.75)" },
  phaseSegmentDone:   { backgroundColor: "rgba(255,255,255,0.40)" },

  doneBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.40)",
  },
  doneBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  skipBtn:     { paddingVertical: 8, paddingHorizontal: 16 },
  skipText:    { fontSize: 14, color: "rgba(255,255,255,0.5)" },
});
