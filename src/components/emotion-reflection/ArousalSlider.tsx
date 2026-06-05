import React from "react";
import { View, Text } from "react-native";
import UnifiedSlider from "@/components/shared/UnifiedSlider";

function arousalLabel(v: number): string {
  if (v >= 80) return "Very activated";
  if (v >= 55) return "Activated";
  if (v >= 35) return "Neutral";
  if (v >= 15) return "Calm";
  return "Very calm";
}

export default function ArousalSlider({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "500" }}>Calm</Text>
        <Text style={{ fontSize: 12, color: "#6B7280", fontWeight: "500" }}>Activated</Text>
      </View>
      <UnifiedSlider value={value} min={0} max={100} onChange={onChange} accentColor="#F59E0B" trackColor="#E5E7EB" />
      <Text style={{ textAlign: "center", fontSize: 14, fontWeight: "600", color: "#1F2937", marginTop: 8 }}>
        {arousalLabel(value)}
      </Text>
    </View>
  );
}
