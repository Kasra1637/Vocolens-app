import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { tapHaptic } from "@/lib/haptics";
import {
  BodyRegion,
  BodyRegionSensation,
  BODY_REGION_LABELS,
  BODY_REGION_EMOJIS,
} from "@/lib/types";

interface Props {
  selected: BodyRegionSensation[];
  onChange: (regions: BodyRegionSensation[]) => void;
}

export default function BodyRegionMap({ selected, onChange }: Props) {
  const isSelected = (r: BodyRegion) => selected.some((s) => s.region === r);

  // Tap toggles the region on/off immediately — no intensity popup
  const handleRegionTap = useCallback(
    (region: BodyRegion) => {
      tapHaptic();
      if (isSelected(region)) {
        // Deselect
        onChange(selected.filter((s) => s.region !== region));
      } else {
        // Select — intensity stored as undefined (not required)
        onChange([...selected, { region }]);
      }
    },
    [selected, onChange],
  );

  const ROWS: BodyRegion[][] = [
    ["head"],
    ["face", "neck"],
    ["chest", "stomach"],
    ["arms", "hands"],
    ["legs"],
  ];

  return (
    <View style={s.grid}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={s.row}>
          {row.map((region) => {
            const sel = isSelected(region);
            return (
              <Pressable
                key={region}
                onPress={() => handleRegionTap(region)}
                style={[s.region, sel && s.regionSelected]}
              >
                <Text style={s.emoji}>{BODY_REGION_EMOJIS[region]}</Text>
                <Text style={[s.label, sel && s.labelSelected]}>
                  {BODY_REGION_LABELS[region]}
                </Text>
                {sel && <View style={s.selDot} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "center", gap: 8 },
  region: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    minWidth: 80,
    position: "relative",
  },
  regionSelected: {
    borderColor: "rgba(255,255,255,0.75)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  emoji: { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  labelSelected: { color: "#FFFFFF" },
  // Small dot indicator replacing the old intensity number badge
  selDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
});
