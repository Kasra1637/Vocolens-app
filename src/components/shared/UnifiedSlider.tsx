import React, { useRef, useCallback, useState } from "react";
import { View, PanResponder, LayoutChangeEvent } from "react-native";
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

export default function UnifiedSlider({
  value,
  min,
  max,
  onChange,
  touchAreaHeight = 56,
  trackHeight     = 6,
  thumbSize       = 28,
}: UnifiedSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef  = useRef(0);
  const lastHapticVal  = useRef(value);

  // Snapshot taken at the START of every gesture
  const grantThumbPx   = useRef(0); // thumb pixel at grant
  const grantPageX     = useRef(0); // finger pageX at grant

  function valueToPixel(v: number, tw: number): number {
    return ((v - min) / (max - min)) * tw;
  }

  function pixelToValue(px: number, tw: number): number {
    return Math.round(min + (clamp(px, 0, tw) / tw) * (max - min));
  }

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      trackWidthRef.current  = w;
      grantThumbPx.current   = valueToPixel(value, w);
      setTrackWidth(w);
    }
  }, [value, min, max]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onMoveShouldSetPanResponder:         () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture:  () => true,

      onPanResponderGrant: (evt) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        // Snap to tap position immediately
        const tapX   = clamp(evt.nativeEvent.locationX, 0, tw);
        grantThumbPx.current = tapX;
        grantPageX.current   = evt.nativeEvent.pageX;
        const newVal = pixelToValue(tapX, tw);
        lastHapticVal.current = newVal;
        onChange(newVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },

      onPanResponderMove: (evt) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        // Real-time: delta from the finger's current pageX vs grant pageX
        const delta  = evt.nativeEvent.pageX - grantPageX.current;
        const rawPx  = clamp(grantThumbPx.current + delta, 0, tw);
        const newVal = pixelToValue(rawPx, tw);
        onChange(newVal);
        if (Math.abs(newVal - lastHapticVal.current) >= 5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastHapticVal.current = newVal;
        }
      },

      onPanResponderRelease: (evt) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const delta    = evt.nativeEvent.pageX - grantPageX.current;
        const finalPx  = clamp(grantThumbPx.current + delta, 0, tw);
        // Commit so next gesture starts from here
        grantThumbPx.current = finalPx;
        const finalVal = pixelToValue(finalPx, tw);
        onChange(finalVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },

      onPanResponderTerminate: (evt) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const delta   = evt.nativeEvent.pageX - grantPageX.current;
        const finalPx = clamp(grantThumbPx.current + delta, 0, tw);
        grantThumbPx.current = finalPx;
      },
    })
  ).current;

  const tw         = trackWidth > 0 ? trackWidth : 1;
  const normalized = clamp((value - min) / (max - min), 0, 1);
  const thumbLeft  = clamp(normalized * tw - thumbSize / 2, 0, tw - thumbSize);
  const isBipolar  = min < 0;

  return (
    <View onLayout={handleLayout} style={{ width: "100%" }}>
      <View
        {...panResponder.panHandlers}
        style={{ height: touchAreaHeight, justifyContent: "center" }}
      >
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
          {/* Bipolar centre divider */}
          {isBipolar && (
            <View
              style={{
                position: "absolute",
                left: "49.5%",
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: CENTER_MARK,
                zIndex: 2,
              }}
            />
          )}

          {/* Fill — grows from left (unipolar) or centre (bipolar) */}
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              backgroundColor: FILL_COLOR,
              borderRadius: trackHeight / 2,
              width: isBipolar
                ? (`${Math.abs(value)}%` as any)
                : (`${normalized * 100}%` as any),
              left:  isBipolar && value >= 0 ? "50%" : undefined,
              right: isBipolar && value <  0 ? "50%" : undefined,
            }}
          />
        </View>

        {/* Thumb — neutral translucent circle, no solid white */}
        <View
          style={{
            position: "absolute",
            left: thumbLeft,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: THUMB_BG,
            borderWidth: 1.5,
            borderColor: THUMB_BORDER,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.18,
            shadowRadius: 4,
            elevation: 4,
            marginTop: -(thumbSize / 2) + trackHeight / 2,
          }}
        />
      </View>
    </View>
  );
}
