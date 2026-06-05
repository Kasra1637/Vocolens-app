notepad src\components\shared\UnifiedSlider.tsx
import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  View,
  PanResponder,
  StyleSheet,
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
  touchAreaHeight = 44,
  trackHeight = 8,
  thumbSize = 28,
}: UnifiedSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const lastHapticVal = useRef(value);
  const thumbPxRef = useRef(0);

  useEffect(() => {
    if (trackWidthRef.current > 0) {
      thumbPxRef.current = valueToPixel(value, trackWidthRef.current);
    }
  }, [value, trackWidth]);

  function valueToPixel(v: number, tw: number): number {
    return ((v - min) / (max - min)) * tw;
  }

  function pixelToValue(px: number, tw: number): number {
    return Math.round(min + (clamp(px, 0, tw) / tw) * (max - min));
  }

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      trackWidthRef.current = w;
      thumbPxRef.current = valueToPixel(value, w);
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
        const tapX = clamp(evt.nativeEvent.locationX, 0, tw);
        thumbPxRef.current = tapX;
        const newVal = pixelToValue(tapX, tw);
        lastHapticVal.current = newVal;
        onChange(newVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gs) => {
        const tw = trackWidthRef.current;
        if (tw <= 0) return;
        const rawPx = clamp(thumbPxRef.current + gs.dx, 0, tw);
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
        const finalPx = clamp(thumbPxRef.current + gs.dx, 0, tw);
        thumbPxRef.current = finalPx;
        const finalVal = pixelToValue(finalPx, tw);
        onChange(finalVal);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
              width: isBipolar ? `${(Math.abs(value) / (max - min)) * 200}%` as any : `${normalized * 100}%` as any,
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
