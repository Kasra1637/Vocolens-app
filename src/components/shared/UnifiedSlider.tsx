import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  View,
  PanResponder,
  LayoutChangeEvent,
} from "react-native";
import * as Haptics from "expo-haptics";

interface UnifiedSliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  accentColor?: string;
  trackColor?: string;
  touchAreaHeight?: number;
  trackHeight?: number;
  thumbSize?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function UnifiedSlider({
  value,
  min,
  max,
  onChange,
  accentColor = "rgba(255,255,255,0.85)",
  trackColor = "rgba(255,255,255,0.15)",
  touchAreaHeight = 52,
  trackHeight = 10,
  thumbSize = 32,
}: UnifiedSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const lastHapticVal = useRef(value);
  // Pixel position of thumb at the START of each gesture — never mutated mid-drag
  const startThumbPxRef = useRef(0);

  function valueToPixel(v: number, tw: number): number {
    return ((v - min) / (max - min)) * tw;
  }

  function pixelToValue(px: number, tw: number): number {
    return Math.round(min + (clamp(px, 0, tw) / tw) * (max - min));
  }

  useEffect(() => {
    if (trackWidthRef.current > 0) {
      startThumbPxRef.current = valueToPixel(value, trackWidthRef.current);
    }
  }, [value]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      trackWidthRef.current = w;
      startThumbPxRef.current = valueToPixel(value, w);
      setTrackWidth(w);
    }
  }, [value, min, max]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        // Snap thumb to wherever the finger touches
        const tapX = clamp(evt.nativeEvent.locationX, 0, tw);
        startThumbPxRef.current = tapX;
        const newVal = pixelToValue(tapX, tw);
        lastHapticVal.current = newVal;
        onChange(newVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },

      onPanResponderMove: (_, gs) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        // Use start position + cumulative dx — 1:1 finger tracking
        const rawPx = clamp(startThumbPxRef.current + gs.dx, 0, tw);
        const newVal = pixelToValue(rawPx, tw);
        onChange(newVal);
        if (Math.abs(newVal - lastHapticVal.current) >= 5) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastHapticVal.current = newVal;
        }
      },

      onPanResponderRelease: (_, gs) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const finalPx = clamp(startThumbPxRef.current + gs.dx, 0, tw);
        // Commit the final position as the new start for the next gesture
        startThumbPxRef.current = finalPx;
        const finalVal = pixelToValue(finalPx, tw);
        onChange(finalVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },

      onPanResponderTerminate: (_, gs) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const finalPx = clamp(startThumbPxRef.current + gs.dx, 0, tw);
        startThumbPxRef.current = finalPx;
      },
    })
  ).current;

  const tw = trackWidth > 0 ? trackWidth : 1;
  const normalized = clamp((value - min) / (max - min), 0, 1);
  const thumbLeft = clamp(normalized * tw - thumbSize / 2, 0, tw - thumbSize);
  const isBipolar = min < 0;

  return (
    <View onLayout={handleLayout} style={{ width: "100%" }}>
      <View
        {...panResponder.panHandlers}
        style={{ height: touchAreaHeight, justifyContent: "center" }}
      >
        <View
          style={{
            height: trackHeight,
            borderRadius: trackHeight / 2,
            backgroundColor: trackColor,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {isBipolar && (
            <View
              style={{
                position: "absolute",
                left: "49.5%",
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: "rgba(255,255,255,0.35)",
                zIndex: 2,
              }}
            />
          )}
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              backgroundColor: accentColor,
              borderRadius: trackHeight / 2,
              // Bipolar (e.g. -100 to +100): fill grows from the 50% centre mark.
              // Width = abs(value) as a percentage of the half-range (100 units = 50% of bar).
              // Unipolar (e.g. 0 to 100): plain left-to-right fill.
              width: isBipolar
                ? `${Math.abs(value)}%` as any
                : `${normalized * 100}%` as any,
              left: isBipolar && value >= 0 ? "50%" : undefined,
              right: isBipolar && value < 0 ? "50%" : undefined,
            }}
          />
        </View>
        <View
          style={{
            position: "absolute",
            left: thumbLeft,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: "#FFFFFF",
            borderWidth: 3,
            borderColor: accentColor,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 6,
            marginTop: -(thumbSize / 2) + trackHeight / 2,
          }}
        />
      </View>
    </View>
  );
}
