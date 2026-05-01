import React, { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { tapHaptic } from "@/lib/haptics";
import {
  BodyRegion,
  BodyRegionSensation,
  ALL_BODY_REGIONS,
  BODY_REGION_LABELS,
  BODY_REGION_EMOJIS,
} from "@/lib/types";

interface Props {
  selected: BodyRegionSensation[];
  onChange: (regions: BodyRegionSensation[]) => void;
}

export default function BodyRegionMap({ selected, onChange }: Props) {
  const [activeRegion, setActiveRegion] = useState<BodyRegion | null>(null);

  const isSelected = (r: BodyRegion) => selected.some((s) => s.region === r);
  const getIntensity = (r: BodyRegion) =>
    selected.find((s) => s.region === r)?.intensity ?? 0;

  const handleRegionTap = useCallback(
    (region: BodyRegion) => {
      tapHaptic();
      setActiveRegion(activeRegion === region ? null : region);
    },
    [activeRegion],
  );

  const handleIntensity = useCallback(
    (region: BodyRegion, intensity: 1 | 2 | 3 | 4 | 5) => {
      tapHaptic();
      const existing = selected.filter((s) => s.region !== region);
      if (intensity === getIntensity(region)) {
        onChange(existing);
        setActiveRegion(null);
      } else {
        onChange([...existing, { region, intensity }]);
      }
    },
    [selected, onChange],
  );

  const ROWS: BodyRegion[][] = [
    ["head"],
    ["face", "neck"],
    ["chest", "stomach", "back"],
    ["arms", "hands"],
    ["legs"],
  ];

  return (
    <View>
      <View style={s.grid}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((region) => {
              const sel = isSelected(region);
              const active = activeRegion === region;
              return (
                <Pressable
                  key={region}
                  onPress={() => handleRegionTap(region)}
                  style={[
                    s.region,
                    sel && s.regionSelected,
                    active && s.regionActive,
                  ]}
                >
                  <Text style={s.emoji}>{BODY_REGION_EMOJIS[region]}</Text>
                  <Text style={[s.label, sel && s.labelSelected]}>
                    {BODY_REGION_LABELS[region]}
                  </Text>
                  {sel && (
                    <View style={s.intBadge}>
                      <Text style={s.intBadgeText}>{getIntensity(region)}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {activeRegion && (
        <View style={s.intSelector}>
          <Text style={s.intLabel}>
            How intense in your {BODY_REGION_LABELS[activeRegion].toLowerCase()}
            ?
          </Text>
          <View style={s.intRow}>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <Pressable
                key={n}
                onPress={() => handleIntensity(activeRegion, n)}
                style={[
                  s.intBtn,
                  getIntensity(activeRegion) === n && s.intBtnActive,
                ]}
              >
                <Text
                  style={[
                    s.intBtnText,
                    getIntensity(activeRegion) === n && s.intBtnTextActive,
                  ]}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.intHintRow}>
            <Text style={s.intHint}>Barely</Text>
            <Text style={s.intHint}>Very</Text>
          </View>
        </View>
      )}
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
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  regionActive: {
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  emoji: { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  labelSelected: { color: "#FFFFFF" },
  intBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  intBadgeText: { fontSize: 10, fontWeight: "700", color: "#1F2937" },
  intSelector: {
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  intLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  intRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  intBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  intBtnActive: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  intBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  intBtnTextActive: { color: "#1F2937" },
  intHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  intHint: { fontSize: 10, color: "rgba(255,255,255,0.4)" },
});
