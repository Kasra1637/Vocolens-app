import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { tapHaptic } from "@/lib/haptics";

const SENSES = [
  { count: 5, label: "See", prompt: "Name 5 things you can see", icon: "👀" },
  {
    count: 4,
    label: "Touch",
    prompt: "Name 4 things you can touch",
    icon: "🤲",
  },
  { count: 3, label: "Hear", prompt: "Name 3 things you can hear", icon: "👂" },
  {
    count: 2,
    label: "Smell",
    prompt: "Name 2 things you can smell",
    icon: "👃",
  },
  {
    count: 1,
    label: "Taste",
    prompt: "Name 1 thing you can taste",
    icon: "👅",
  },
] as const;

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function GroundingSenses({ onComplete, onSkip }: Props) {
  const [activeSense, setActiveSense] = useState(0);
  const [taps, setTaps] = useState(0);
  const [done, setDone] = useState(false);

  const handleTap = () => {
    tapHaptic();
    const current = SENSES[activeSense];
    const next = taps + 1;
    if (next >= current.count) {
      if (activeSense >= SENSES.length - 1) {
        setDone(true);
        return;
      }
      setActiveSense(activeSense + 1);
      setTaps(0);
    } else {
      setTaps(next);
    }
  };

  if (done) {
    return (
      <View style={s.container}>
        <Text style={s.title}>5-4-3-2-1 Grounding</Text>
        <Text style={s.emoji}>🌿</Text>
        <Text style={s.doneText}>You're back in the present.</Text>
        <Pressable onPress={onComplete} style={s.doneBtn}>
          <Text style={s.doneBtnText}>Continue</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={s.skipBtn}>
          <Text style={s.skipText}>Skip</Text>
        </Pressable>
      </View>
    );
  }

  const sense = SENSES[activeSense];

  return (
    <View style={s.container}>
      <Text style={s.title}>5-4-3-2-1 Grounding</Text>
      <Text style={s.sub}>Tap to ground yourself in the present moment</Text>

      <Animated.View entering={FadeIn} key={activeSense} style={s.senseCard}>
        <Text style={s.senseIcon}>{sense.icon}</Text>
        <Text style={s.senseLabel}>{sense.label}</Text>
        <Text style={s.sensePrompt}>{sense.prompt}</Text>
        <Pressable onPress={handleTap} style={s.tapBtn}>
          <Text style={s.tapText}>Tap {sense.count - taps} more</Text>
        </Pressable>
      </Animated.View>

      <View style={s.dots}>
        {SENSES.map((_, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === activeSense && s.dotActive,
              i < activeSense && s.dotDone,
            ]}
          />
        ))}
      </View>

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
  senseCard: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 24,
  },
  senseIcon: { fontSize: 40, marginBottom: 12 },
  senseLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  sensePrompt: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 20,
    textAlign: "center",
  },
  tapBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  tapText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  dots: { flexDirection: "row", gap: 8, marginBottom: 24 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: { backgroundColor: "#FFFFFF", width: 24, borderRadius: 5 },
  dotDone: { backgroundColor: "rgba(255,255,255,0.5)" },
  emoji: { fontSize: 48, marginVertical: 16 },
  doneText: { fontSize: 16, color: "#FFFFFF", marginBottom: 24 },
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
