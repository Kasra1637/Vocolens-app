import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { tapHaptic, successHaptic } from "@/lib/haptics";

const SENSES = [
  {
    count: 5,
    label: "See",
    prompt: "Find 5 things you can see right now",
    icon: "👀",
    color: "rgba(99, 179, 237, 0.25)",
    border: "rgba(99, 179, 237, 0.45)",
  },
  {
    count: 4,
    label: "Touch",
    prompt: "Notice 4 things you can physically touch",
    icon: "🤲",
    color: "rgba(246, 173, 85, 0.22)",
    border: "rgba(246, 173, 85, 0.45)",
  },
  {
    count: 3,
    label: "Hear",
    prompt: "Listen for 3 sounds around you",
    icon: "👂",
    color: "rgba(154, 117, 234, 0.22)",
    border: "rgba(154, 117, 234, 0.45)",
  },
  {
    count: 2,
    label: "Smell",
    prompt: "Identify 2 things you can smell",
    icon: "👃",
    color: "rgba(104, 211, 145, 0.22)",
    border: "rgba(104, 211, 145, 0.45)",
  },
  {
    count: 1,
    label: "Taste",
    prompt: "Notice 1 taste in your mouth",
    icon: "👅",
    color: "rgba(252, 129, 129, 0.22)",
    border: "rgba(252, 129, 129, 0.45)",
  },
] as const;

interface Props {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function GroundingSenses({ onComplete, onSkip }: Props) {
  const [activeSense, setActiveSense] = useState(0);
  const [taps,        setTaps]        = useState(0);
  const [done,        setDone]        = useState(false);

  const handleTap = () => {
    tapHaptic();
    const current = SENSES[activeSense];
    const next = taps + 1;

    if (next >= current.count) {
      if (activeSense >= SENSES.length - 1) {
        successHaptic();
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
      <Animated.View entering={FadeIn.duration(500)} style={s.container}>
        <Text style={s.title}>5-4-3-2-1 Grounding</Text>
        <Text style={s.doneEmoji}>🌿</Text>
        <Text style={s.doneHeading}>You're back in the present.</Text>
        <Text style={s.doneSub}>Your senses have brought you home.</Text>
        <Pressable onPress={onComplete} style={s.doneBtn}>
          <Text style={s.doneBtnText}>Continue →</Text>
        </Pressable>
        <Pressable onPress={onSkip} style={s.skipBtn}>
          <Text style={s.skipText}>Skip</Text>
        </Pressable>
      </Animated.View>
    );
  }

  const sense = SENSES[activeSense];
  const remaining = sense.count - taps;

  return (
    <View style={s.container}>
      <Text style={s.title}>5-4-3-2-1 Grounding</Text>
      <Text style={s.sub}>Anchor yourself in the present moment</Text>

      {/* Sense step card */}
      <Animated.View
        entering={FadeInDown.duration(350)}
        key={activeSense}
        style={[s.senseCard, { backgroundColor: sense.color, borderColor: sense.border }]}
      >
        {/* Icon */}
        <Text style={s.senseIcon}>{sense.icon}</Text>

        {/* Label + prompt */}
        <Text style={s.senseLabel}>{sense.label}</Text>
        <Text style={s.sensePrompt}>{sense.prompt}</Text>

        {/* Tap progress dots */}
        <View style={s.tapDots}>
          {Array.from({ length: sense.count }).map((_, i) => (
            <View
              key={i}
              style={[s.tapDot, i < taps && { backgroundColor: "#FFFFFF", transform: [{ scale: 1.1 }] }]}
            />
          ))}
        </View>

        {/* Tap button */}
        <Pressable onPress={handleTap} style={[s.tapBtn, { borderColor: sense.border }]}>
          <Text style={s.tapCount}>{remaining}</Text>
          <Text style={s.tapLabel}>
            {remaining === 1 ? "more tap" : "more taps"}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Sense progress dots */}
      <View style={s.dots}>
        {SENSES.map((se, i) => (
          <View
            key={i}
            style={[
              s.dot,
              i === activeSense && [s.dotActive, { backgroundColor: se.border as string }],
              i < activeSense   && s.dotDone,
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
  container:    { alignItems: "center", padding: 24 },
  title:        { fontSize: 20, fontFamily: "Fraunces_700Bold", color: "#FFFFFF", marginBottom: 4 },
  sub:          { fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 24 },

  senseCard: {
    alignItems: "center",
    borderRadius: 24,
    padding: 28,
    width: "100%",
    borderWidth: 1.5,
    marginBottom: 24,
  },
  senseIcon:    { fontSize: 44, marginBottom: 10 },
  senseLabel:   { fontSize: 22, fontWeight: "800", color: "#FFFFFF", marginBottom: 6, letterSpacing: 0.3 },
  sensePrompt:  { fontSize: 14, color: "rgba(255,255,255,0.85)", marginBottom: 20, textAlign: "center", lineHeight: 20 },

  tapDots:      { flexDirection: "row", gap: 8, marginBottom: 20 },
  tapDot:       {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)",
  },

  tapBtn: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.20)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderWidth: 1.5,
  },
  tapCount:     { fontSize: 32, fontWeight: "800", color: "#FFFFFF", lineHeight: 36 },
  tapLabel:     { fontSize: 12, color: "rgba(255,255,255,0.70)", marginTop: 2 },

  dots:         { flexDirection: "row", gap: 8, marginBottom: 20 },
  dot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.18)" },
  dotActive:    { width: 26, borderRadius: 5 },
  dotDone:      { backgroundColor: "rgba(255,255,255,0.45)" },

  doneEmoji:    { fontSize: 52, marginVertical: 12 },
  doneHeading:  { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 6 },
  doneSub:      { fontSize: 14, color: "rgba(255,255,255,0.65)", marginBottom: 24 },
  doneBtn: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 36,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.40)",
  },
  doneBtnText:  { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  skipBtn:      { paddingVertical: 8, paddingHorizontal: 16 },
  skipText:     { fontSize: 14, color: "rgba(255,255,255,0.5)" },
});
