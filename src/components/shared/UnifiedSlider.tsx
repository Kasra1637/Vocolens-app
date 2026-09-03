import React, { useRef, useCallback, useState } from "react";
import { View, PanResponder, LayoutChangeEvent, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

interface UnifiedSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Deprecated — ignored. All sliders share the same neutral style. */
  accentColor?: string;
  /** Deprecated — ignored. All sliders share the same neutral style. */
  trackColor?: string;
  touchAreaHeight?: number;
  trackHeight?: number;
  thumbSize?: number;
  /**
   * Snap-to-zero window, in value units. Within ±this of zero the slider
   * settles exactly on 0 with a distinct haptic, so "neutral" is actually
   * reachable on a −100…100 range. Defaults to 3 for bipolar sliders, 0
   * (disabled) for unipolar ones. Pass 0 to disable.
   */
  detentRange?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ── Neutral design tokens — no white background anywhere ─────────────────────
const TRACK_BG      = "rgba(255, 255, 255, 0.10)"; // near-invisible track bed
const FILL_COLOR    = "rgba(255, 255, 255, 0.55)";  // semi-transparent fill
const CENTER_MARK   = "rgba(255, 255, 255, 0.30)";  // bipolar centre divider
const THUMB_BG      = "rgba(255, 255, 255, 0.92)";  // thumb — just slightly opaque white
const THUMB_BORDER  = "rgba(255, 255, 255, 0.40)";  // subtle border, no solid colour

// ── Gesture tuning ───────────────────────────────────────────────────────────
// How far the finger must travel horizontally before this slider claims the
// gesture. Small enough that dragging feels immediate, large enough that a
// vertical scroll starting on the slider goes to the parent ScrollView instead
// of silently changing the value.
const HORIZONTAL_CLAIM_PX = 4;
// Haptics are throttled on BOTH value delta and wall-clock time. A fast drag
// across a 200-unit range would otherwise fire dozens of impacts, which stutters
// on Android and drowns out the detent cue.
const HAPTIC_VALUE_STEP = 4;
const HAPTIC_MIN_INTERVAL_MS = 45;

function toValue(
  px: number,
  tw: number,
  min: number,
  max: number,
  detent: number,
): number {
  const raw = min + (clamp(px, 0, tw) / tw) * (max - min);
  let v = Math.round(raw);
  if (detent > 0 && Math.abs(v) <= detent) v = 0;
  return clamp(v, min, max);
}

function toPixel(v: number, tw: number, min: number, max: number): number {
  return ((v - min) / (max - min)) * tw;
}

/**
 * The single slider used by every adjustment surface in the app.
 *
 * Interaction model (deliberate, and different from a naive slider):
 *
 *   • It does NOT claim the gesture on touch-down. Touching or resting a finger
 *     never changes the value, and a vertical drag that begins on the slider is
 *     handed to the parent ScrollView. Previously this component captured every
 *     touch in its 56px band, which made ~112px of the reflection screen
 *     un-scrollable — dragging to scroll silently rewrote the user's data.
 *
 *   • Dragging is RELATIVE to the value at gesture start, so the thumb never
 *     jumps to meet the finger mid-drag. This is what makes small, precise
 *     adjustments possible.
 *
 *   • Tapping anywhere on the track still jumps to that position, so the thumb
 *     itself never has to be hit. That is handled by a separate press handler,
 *     which the pan responder pre-empts as soon as a real drag begins.
 */
export default function UnifiedSlider({
  value,
  min,
  max,
  onChange,
  touchAreaHeight = 56,
  trackHeight     = 6,
  thumbSize       = 28,
  detentRange,
}: UnifiedSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const isBipolar = min < 0;
  const detent = detentRange ?? (isBipolar ? 3 : 0);

  // The PanResponder is created once, so everything it reads must come from a
  // ref that is refreshed on each render — otherwise it closes over the first
  // render's min/max/onChange/value forever.
  const io = useRef({
    min,
    max,
    detent,
    value,
    onChange,
    trackWidth: 0,
    grantValue: value,
    lastHapticVal: value,
    lastHapticAt: 0,
    inDetent: false,
  });
  io.current.min = min;
  io.current.max = max;
  io.current.detent = detent;
  io.current.value = value;
  io.current.onChange = onChange;

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      io.current.trackWidth = w;
      setTrackWidth(w);
    }
  }, []);

  const fireHaptic = (newVal: number) => {
    const s = io.current;
    const now = Date.now();

    // Landing on the zero detent gets its own, heavier cue so it's
    // distinguishable from the ordinary drag ticks.
    if (s.detent > 0 && newVal === 0) {
      if (!s.inDetent) {
        s.inDetent = true;
        s.lastHapticVal = newVal;
        s.lastHapticAt = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
      return;
    }
    s.inDetent = false;

    if (
      Math.abs(newVal - s.lastHapticVal) >= HAPTIC_VALUE_STEP &&
      now - s.lastHapticAt >= HAPTIC_MIN_INTERVAL_MS
    ) {
      s.lastHapticVal = newVal;
      s.lastHapticAt = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      // Never claim on touch-down — see the component doc comment. This is what
      // keeps the parent ScrollView usable and stops accidental writes.
      onStartShouldSetPanResponder:        () => false,
      onStartShouldSetPanResponderCapture: () => false,

      // Claim only a clearly-horizontal drag.
      onMoveShouldSetPanResponder: (_e, gs) =>
        Math.abs(gs.dx) > HORIZONTAL_CLAIM_PX &&
        Math.abs(gs.dx) > Math.abs(gs.dy),
      onMoveShouldSetPanResponderCapture: (_e, gs) =>
        Math.abs(gs.dx) > HORIZONTAL_CLAIM_PX &&
        Math.abs(gs.dx) > Math.abs(gs.dy),

      onPanResponderGrant: () => {
        const s = io.current;
        s.grantValue = s.value;
        s.lastHapticVal = s.value;
        s.lastHapticAt = 0;
        s.inDetent = s.detent > 0 && s.value === 0;
        setIsActive(true);
      },

      onPanResponderMove: (_e, gs) => {
        const s = io.current;
        const tw = s.trackWidth;
        if (tw <= 0) return;
        // Relative to the value the gesture started from, so the thumb tracks
        // the finger without ever snapping to it.
        const startPx = toPixel(s.grantValue, tw, s.min, s.max);
        const newVal = toValue(startPx + gs.dx, tw, s.min, s.max, s.detent);
        if (newVal !== s.value) {
          fireHaptic(newVal);
          s.onChange(newVal);
        }
      },

      onPanResponderRelease: () => {
        setIsActive(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      },

      onPanResponderTerminate: () => {
        setIsActive(false);
      },

      // Let the parent (e.g. a ScrollView that has decided this is a scroll)
      // take the gesture back rather than fighting it.
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  /**
   * Tap-to-set. Fires only when the touch ends without becoming a drag —
   * the pan responder claims the gesture first in that case, and a claimed
   * gesture never reaches this handler.
   */
  const handleTrackPress = useCallback((locationX: number) => {
    const s = io.current;
    const tw = s.trackWidth;
    if (tw <= 0) return;
    const newVal = toValue(locationX, tw, s.min, s.max, s.detent);
    if (newVal !== s.value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      s.onChange(newVal);
    }
  }, []);

  const tw         = trackWidth > 0 ? trackWidth : 1;
  const normalized = clamp((value - min) / (max - min), 0, 1);
  const thumbLeft  = clamp(normalized * tw - thumbSize / 2, 0, tw - thumbSize);
  const activeThumbScale = isActive ? 1.12 : 1;

  // Where zero sits on the track, as a 0–1 fraction. Derived rather than
  // assumed to be the midpoint, so the fill and centre mark stay correct for
  // any bipolar range (not just symmetric ones like −100…100).
  const zeroNorm = isBipolar ? clamp((0 - min) / (max - min), 0, 1) : 0;
  // Fill spans from the zero mark to the current value.
  //
  // This previously used `Math.abs(value)%`, which on a −100…100 range made the
  // bar advance twice as fast as the thumb and saturate at value 50 (the
  // overflow was simply clipped, hiding it). The fill now measures the real
  // distance between zero and the value.
  const fillPct = isBipolar
    ? Math.abs(normalized - zeroNorm) * 100
    : normalized * 100;

  return (
    <View onLayout={handleLayout} style={{ width: "100%" }}>
      <Pressable
        onPress={(e) => handleTrackPress(e.nativeEvent.locationX)}
        // The whole 56px band is tappable, so the 28px thumb never has to be
        // hit precisely.
        style={{ height: touchAreaHeight, justifyContent: "center" }}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: value }}
      >
        <View {...panResponder.panHandlers} style={{ justifyContent: "center" }}>
          {/* Track bed */}
          <View
            style={{
              height: trackHeight,
              borderRadius: trackHeight / 2,
              backgroundColor: TRACK_BG,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Zero mark — positioned from the real zero point, not assumed
                to be the visual midpoint. */}
            {isBipolar && (
              <View
                style={{
                  position: "absolute",
                  left: `${zeroNorm * 100}%` as any,
                  marginLeft: -1,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  backgroundColor: CENTER_MARK,
                  zIndex: 2,
                }}
              />
            )}

            {/* Fill — grows from the left edge (unipolar) or the zero mark
                (bipolar, in whichever direction the value went). */}
            <View
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                backgroundColor: FILL_COLOR,
                borderRadius: trackHeight / 2,
                width: `${fillPct}%` as any,
                left: isBipolar
                  ? (value >= 0 ? (`${zeroNorm * 100}%` as any) : undefined)
                  : 0,
                right: isBipolar && value < 0
                  ? (`${(1 - zeroNorm) * 100}%` as any)
                  : undefined,
              }}
            />
          </View>

          {/* Thumb — neutral translucent circle, no solid white.
              Grows slightly while dragging so the control confirms it has the
              gesture without adding any persistent visual weight. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: thumbLeft,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: THUMB_BG,
              borderWidth: 1.5,
              borderColor: isActive ? "rgba(255,255,255,0.75)" : THUMB_BORDER,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isActive ? 0.28 : 0.18,
              shadowRadius: isActive ? 6 : 4,
              elevation: isActive ? 6 : 4,
              transform: [{ scale: activeThumbScale }],
            }}
          />
        </View>
      </Pressable>
    </View>
  );
}
