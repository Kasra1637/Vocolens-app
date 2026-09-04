import React, { useCallback, useState } from "react";
import { View, Text, Pressable, LayoutChangeEvent } from "react-native";
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
   * Snap-to-zero window, in value units. A tap landing within ±this of zero
   * snaps exactly to 0, so "neutral" is reliably reachable on a −100…100
   * range even though the bar is tap-only. Defaults to 3 for bipolar
   * sliders, 0 (disabled) for unipolar ones. Pass 0 to disable.
   */
  detentRange?: number;
  /**
   * When provided, the current value is rendered as a small bubble that rides
   * on the thumb and moves along the track as the value changes, so the number
   * is always visible right where the user is looking. Formats the readout
   * (e.g. "+40", "72%"). When omitted, no bubble is drawn.
   */
  formatValue?: (value: number) => string;
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

/**
 * The adjustment bar used by every valence/arousal control in the app.
 *
 * TAP-ONLY, deliberately — there is no drag gesture here. A drag has to
 * decide, on every touch that starts on the bar, whether the user is
 * adjusting the value or trying to scroll the surrounding screen, and that
 * decision was never fully reliable next to a ScrollView. A tap has no such
 * ambiguity: it either lands on the bar or it doesn't. Tapping a position
 * jumps straight to it — the thumb never has to be hit precisely, the whole
 * band is the target — and the +/- steppers next to the value (see
 * AdjustmentSliderCard, including press-and-hold on them) are the primary way
 * to fine-tune or make a large change from there. That split — bar for coarse
 * placement, steppers for precise or rapid movement — is easier to control
 * accurately on a touchscreen than dragging a thumb ever was, and it can
 * never fight a parent ScrollView for the gesture.
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
  formatValue,
}: UnifiedSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isPressed, setIsPressed] = useState(false);

  const isBipolar = min < 0;
  const detent = detentRange ?? (isBipolar ? 3 : 0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setTrackWidth(w);
  }, []);

  const handlePress = useCallback(
    (locationX: number) => {
      if (trackWidth <= 0) return;
      const newVal = toValue(locationX, trackWidth, min, max, detent);
      if (newVal !== value) {
        Haptics.impactAsync(
          detent > 0 && newVal === 0
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
        onChange(newVal);
      }
    },
    [trackWidth, min, max, detent, value, onChange],
  );

  const tw         = trackWidth > 0 ? trackWidth : 1;
  const normalized = clamp((value - min) / (max - min), 0, 1);
  const thumbLeft  = clamp(normalized * tw - thumbSize / 2, 0, tw - thumbSize);

  // The value bubble is centred over the thumb's centre. Its own width is
  // clamped-centred separately below so it can't spill past the track edges.
  // Wide enough for the longest readout ("-100", "100%") without truncating.
  const thumbCenter = normalized * tw;
  const BUBBLE_W = 56;
  const bubbleLeft = clamp(thumbCenter - BUBBLE_W / 2, 0, Math.max(0, tw - BUBBLE_W));
  const showBubble = !!formatValue && trackWidth > 0;

  // Where zero sits on the track, as a 0–1 fraction. Derived rather than
  // assumed to be the midpoint, so the fill and zero mark stay correct for
  // any bipolar range, not just symmetric ones like −100…100.
  const zeroNorm = isBipolar ? clamp((0 - min) / (max - min), 0, 1) : 0;
  const fillPct  = isBipolar
    ? Math.abs(normalized - zeroNorm) * 100
    : normalized * 100;

  return (
    <View onLayout={handleLayout} style={{ width: "100%" }}>
      <Pressable
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onPress={(e) => handlePress(e.nativeEvent.locationX)}
        // The whole band is the tappable target, so the thumb never has to
        // be hit precisely.
        style={{ height: touchAreaHeight, justifyContent: "center" }}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: value }}
      >
        <View style={{ justifyContent: "center" }}>
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

          {/* Thumb — neutral translucent circle, marks the current value.
              Vertically centred on the track bed via marginTop (the thumb is
              taller than the 6px track, so without this offset it renders
              flush with the track's top edge instead of straddling it).
              Grows slightly on tap-down for tactile confirmation. */}
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
              borderColor: isPressed ? "rgba(255,255,255,0.75)" : THUMB_BORDER,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isPressed ? 0.28 : 0.18,
              shadowRadius: isPressed ? 6 : 4,
              elevation: isPressed ? 6 : 4,
              transform: [{ scale: isPressed ? 1.12 : 1 }],
              marginTop: -(thumbSize / 2) + trackHeight / 2,
            }}
          />

          {/* Value bubble — rides on the thumb and moves with it, so the
              current number is always visible right where the user is
              adjusting. Sits above the track; a small notch points down at
              the thumb. */}
          {showBubble && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: bubbleLeft,
                width: BUBBLE_W,
                bottom: thumbSize / 2 + 6,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  minWidth: 36,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 9,
                  backgroundColor: isPressed
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.16)",
                  borderWidth: 1,
                  borderColor: isPressed
                    ? "rgba(255,255,255,0.95)"
                    : "rgba(255,255,255,0.28)",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter_700Bold",
                    fontSize: 12,
                    color: isPressed ? "#1A1A2E" : "#FFFFFF",
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {formatValue!(value)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}
