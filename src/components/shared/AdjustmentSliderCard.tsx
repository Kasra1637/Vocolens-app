/**
 * AdjustmentSliderCard
 *
 * The single card used for every valence/arousal adjustment in the app —
 * the pre-save reflection screen and the post-save Refine Analysis modal.
 *
 * It exists so those two surfaces are genuinely identical rather than merely
 * similar. They previously diverged in ways that made the second one feel like
 * a different app: value text at 20px Bold vs 13px SemiBold, min/max axis
 * labels present on one and absent on the other, and one card per slider vs.
 * both sliders sharing a single card.
 *
 * Includes −/+ steppers beside the value. A drag is good for coarse movement
 * but poor at landing on an exact number, and this range is wide (−100…100).
 * The steppers sit in space the value row already occupies, so exact control
 * costs no extra height.
 */

import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Minus, Plus } from "phosphor-react-native";
import UnifiedSlider from "@/components/shared/UnifiedSlider";
import { tapHaptic } from "@/lib/haptics";

interface Props {
  /** e.g. "Unpleasant ↔ Pleasant" — order must match minLabel/maxLabel. */
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Formats the numeric readout. Defaults to the raw number. */
  formatValue?: (v: number) => string;
  /** Axis labels under the track. Both or neither. */
  minLabel?: string;
  maxLabel?: string;
  /** Amount a single stepper tap moves the value. */
  step?: number;
  style?: ViewStyle;
}

export default function AdjustmentSliderCard({
  label,
  value,
  min,
  max,
  onChange,
  formatValue,
  minLabel,
  maxLabel,
  step = 1,
  style,
}: Props) {
  const display = formatValue ? formatValue(value) : String(value);

  const nudge = useCallback(
    (delta: number) => {
      const next = Math.max(min, Math.min(max, value + delta));
      if (next !== value) {
        tapHaptic();
        onChange(next);
      }
    },
    [value, min, max, onChange],
  );

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {label}
        </Text>

        <View style={styles.valueGroup}>
          <Pressable
            onPress={() => nudge(-step)}
            disabled={atMin}
            // Generous hit area without enlarging the visual control.
            hitSlop={{ top: 12, bottom: 12, left: 10, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label}`}
            style={[styles.stepBtn, atMin && styles.stepBtnDisabled]}
          >
            <Minus size={12} color="#FFFFFF" weight="bold" />
          </Pressable>

          {/* Fixed width so the row doesn't shift as the number changes
              width (e.g. "+9" → "+100"). */}
          <Text style={styles.value} numberOfLines={1}>
            {display}
          </Text>

          <Pressable
            onPress={() => nudge(step)}
            disabled={atMax}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label}`}
            style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
          >
            <Plus size={12} color="#FFFFFF" weight="bold" />
          </Pressable>
        </View>
      </View>

      <UnifiedSlider value={value} min={min} max={max} onChange={onChange} />

      {(minLabel || maxLabel) && (
        <View style={styles.axisLabels}>
          <Text style={styles.axisHint}>{minLabel}</Text>
          <Text style={styles.axisHint}>{maxLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
    flexShrink: 1,
    marginRight: 10,
  },
  valueGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  value: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    minWidth: 52,
    textAlign: "center",
  },
  axisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  axisHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
});
