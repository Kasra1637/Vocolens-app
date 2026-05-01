import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";

type Phase = "ready" | "inhale" | "hold" | "exhale" | "done";

const PHASES: { phase: Phase; label: string; duration: number }[] = [
  { phase: "inhale", label: "Breathe In", duration: 4000 },
  { phase: "hold", label: "Hold", duration: 7000 },
  { phase: "exhale", label: "Breathe Out", duration: 8000 },
];

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function BreathingExercise({ onComplete, onSkip }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [cycle, setCycle] = useState(0);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.4);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalCycles = 3;

  const runCycle = useCallback(
    (idx: number) => {
      if (idx >= PHASES.length) {
        setCycle((c) => {
          const next = c + 1;
          if (next >= totalCycles) {
            setPhase("done");
            return next;
          }
          runCycle(0);
          return next;
        });
        return;
      }

      const p = PHASES[idx];
      setPhase(p.phase);

      if (p.phase === "inhale") {
        scale.value = withTiming(1.0, {
          duration: p.duration,
          easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(0.9, { duration: p.duration });
      } else if (p.phase === "exhale") {
        scale.value = withTiming(0.6, {
          duration: p.duration,
          easing: Easing.in(Easing.ease),
        });
        opacity.value = withTiming(0.4, { duration: p.duration });
      }

      timerRef.current = setTimeout(() => runCycle(idx + 1), p.duration);
    },
    [scale, opacity],
  );

  const start = useCallback(() => {
    setCycle(0);
    runCycle(0);
  }, [runCycle]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const phaseLabel =
    phase === "ready"
      ? "Tap to start"
      : phase === "done"
        ? "Well done"
        : (PHASES.find((p) => p.phase === phase)?.label ?? "");

  return (
    <View style={s.container}>
      <Text style={s.title}>4-7-8 Breathing</Text>
      <Text style={s.sub}>
        {phase === "ready"
          ? "3 cycles to calm your nervous system"
          : `Cycle ${Math.min(cycle + 1, totalCycles)} of ${totalCycles}`}
      </Text>

      <Pressable
        onPress={phase === "ready" ? start : undefined}
        style={s.circleWrap}
      >
        <Animated.View style={[s.circle, circleStyle]} />
        <Text style={s.phaseText}>{phaseLabel}</Text>
      </Pressable>

      {phase === "done" && (
        <Pressable onPress={onComplete} style={s.doneBtn}>
          <Text style={s.doneBtnText}>Continue</Text>
        </Pressable>
      )}
      <Pressable onPress={onSkip} style={s.skipBtn}>
        <Text style={s.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 32 },
  circleWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
    marginBottom: 32,
  },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    position: "absolute",
  },
  phaseText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    position: "absolute",
  },
  doneBtn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  doneBtnText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  skipBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  skipText: { fontSize: 14, color: "rgba(255,255,255,0.6)" },
});
