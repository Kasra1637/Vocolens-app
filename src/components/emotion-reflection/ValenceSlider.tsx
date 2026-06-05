import React from "react";
import { View, Text } from "react-native";
import UnifiedSlider from "@/components/shared/UnifiedSlider";

function valenceLabel(v: number): string {
  if (v >= 60) return "Very pleasant";
  if (v >= 20) return "Pleasant";
  if (v >= -20) return "Neutral";
  if (v >= -60) return "Unpleasant";
  return "Very unpleasant";
}

export default function ValenceSlider({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const accentColor = value >= 0 ? "#10B981" : "#EF4444";
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "500" }}>Unpleasant</Text>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "500" }}>Pleasant</Text>
      </View>
      <UnifiedSlider value={value} min={-100} max={100} onChange={onChange} accentColor={accentColor} trackColor="#E5E7EB" />
      <Text style={{ textAlign: "center", fontSize: 14, fontWeight: "600", color: "#1F2937", marginTop: 8 }}>
        {valenceLabel(value)}
      </Text>
    </View>
  );
}
