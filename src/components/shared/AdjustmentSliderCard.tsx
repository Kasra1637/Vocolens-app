/**
 * AdjustmentSliderCard
 *
 * The single card used for every valence/arousal adjustment in the app —
 * the pre-save reflection screen ("Adjust how it felt") and the post-save
 * Refine Analysis modal. Both render the exact same card so the two feel
 * like one control the user already knows, not two different ones.
 *
 * Layout is a single integrated control: a minus button on the far left, the
 * tappable bar in the middle, and a plus button on the far right. The current
 * value rides on the bar's thumb and moves with it, so the number is always
 * visible right where the user is adjusting.
 *
 * Tapping the bar jumps straight to a position — good for coarse placement.
 * The flanking +/- steppers are the primary way to fine-tune from there: a
 * single tap nudges by `step`, and press-and-hold repeats automatically with
 * acceleration, so a drastic change (e.g. −80 → +80) doesn't require dozens of
 * individual taps.
 */

import React, { useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Minus, Plus } from "phosphor-react-native";
import UnifiedSlider from "@/components/shared/UnifiedSlider";
import { tapHaptic, selectionHaptic } from "@/lib/haptics";

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
  /** Amount a single stepper tap (or the first hold repeat) moves the value. */
  step?: number;
  style?: ViewStyle;
}

// ── Press-and-hold tuning ────────────────────────────────────────────────────
// Delay before the first auto-repeat fires, so a quick single tap never
// double-nudges the value.
const HOLD_INITIAL_DELAY_MS = 380;
// Repeat interval shrinks as the hold continues, so a long hold accelerates
// toward the extreme instead of crawling there at a fixed rate.
const HOLD_REPEAT_START_MS = 140;
const HOLD_REPEAT_MIN_MS = 40;
const HOLD_ACCELERATION = 0.88; // multiplies the interval after every repeat

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
  // Read/write the live value from a ref while holding, rather than closing
  // over the `value` prop — the interval callback is scheduled once per hold
  // and must always nudge from the CURRENT value, not the value at the moment
  // the hold started.
  const liveValue = useRef(value);
  liveValue.current = value;

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalMs = useRef(HOLD_REPEAT_START_MS);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdInterval.current) {
      clearTimeout(holdInterval.current);
      holdInterval.current = null;
    }
    holdIntervalMs.current = HOLD_REPEAT_START_MS;
  }, []);

  const applyNudge = useCallback(
    (delta: number) => {
      const next = Math.max(min, Math.min(max, liveValue.current + delta));
      if (next !== liveValue.current) {
        liveValue.current = next;
        onChange(next);
      }
      return next;
    },
    [min, max, onChange],
  );

  const nudge = useCallback(
    (delta: number) => {
      tapHaptic();
      applyNudge(delta);
    },
    [applyNudge],
  );

  const startHold = useCallback(
    (delta: number) => {
      // The initial tap is handled by onPress (below) — this only covers the
      // REPEATED nudges after the hold delay, so a normal tap never fires
      // twice.
      holdTimer.current = setTimeout(() => {
        const scheduleNext = () => {
          applyNudge(delta);
          selectionHaptic();
          if (liveValue.current === min || liveValue.current === max) {
            clearHold();
            return;
          }
          holdIntervalMs.current = Math.max(
            HOLD_REPEAT_MIN_MS,
            holdIntervalMs.current * HOLD_ACCELERATION,
          );
          holdInterval.current = setTimeout(scheduleNext, holdIntervalMs.current);
        };
        scheduleNext();
      }, HOLD_INITIAL_DELAY_MS);
    },
    [applyNudge, clearHold, min, max],
  );

  // Stop any in-flight hold if the card unmounts (e.g. navigating away while
  // pressing) so it doesn't fire onChange against a gone component.
  useEffect(() => clearHold, [clearHold]);

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title} numberOfLines={1}>
        {label}
      </Text>

      {/* Integrated control: minus on the far left, plus on the far right, the
          tappable bar in the middle. The current value rides on the slider's
          thumb (see formatValue passed to UnifiedSlider) so the number is
          visible right on the bar as it moves — no separate readout needed. */}
      <View style={styles.controlRow}>
        <Pressable
          onPress={() => nudge(-step)}
          onPressIn={() => startHold(-step)}
          onPressOut={clearHold}
          disabled={atMin}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityHint="Double tap to nudge, or press and hold to change quickly"
          style={[styles.stepBtn, atMin && styles.stepBtnDisabled]}
        >
          <Minus size={16} color="#FFFFFF" weight="bold" />
        </Pressable>

        <View style={styles.sliderWrap}>
          <UnifiedSlider
            value={value}
            min={min}
            max={max}
            onChange={onChange}
            formatValue={formatValue ?? ((v) => String(v))}
          />
        </View>

        <Pressable
          onPress={() => nudge(step)}
          onPressIn={() => startHold(step)}
          onPressOut={clearHold}
          disabled={atMax}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityHint="Double tap to nudge, or press and hold to change quickly"
          style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
        >
          <Plus size={16} color="#FFFFFF" weight="bold" />
        </Pressable>
      </View>

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
  title: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sliderWrap: {
    flex: 1,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  axisLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    // Align axis labels under the track, not under the flanking buttons.
    paddingHorizontal: 44,
  },
  axisHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.35)",
  },
});
