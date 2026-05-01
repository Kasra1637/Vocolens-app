import React, { useRef, useCallback } from "react";
import { View, PanResponder, StyleSheet } from "react-native";

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Color for the active fill and thumb border */
  accentColor?: string;
  trackColor?: string;
}

export default function ReflectionSlider({
  value,
  min,
  max,
  onChange,
  accentColor = "rgba(255,255,255,0.85)",
  trackColor = "rgba(255,255,255,0.15)",
}: Props) {
  const trackW = useRef(0);

  const compute = useCallback(
    (x: number) => {
      const clamped = Math.max(0, Math.min(trackW.current, x));
      const pct = trackW.current > 0 ? clamped / trackW.current : 0;
      const raw = Math.round(min + pct * (max - min));
      return Math.max(min, Math.min(max, raw));
    },
    [min, max],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        onChange(compute(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        onChange(compute(e.nativeEvent.locationX));
      },
    }),
  ).current;

  const normalized = (value - min) / (max - min);
  const fillPct =
    min < 0 ? (Math.abs(value) / (max - min)) * 100 * 2 : normalized * 100;

  return (
    <View
      style={s.container}
      onLayout={(e) => {
        trackW.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View style={[s.track, { backgroundColor: trackColor }]}>
        {min < 0 ? (
          <>
            <View style={s.centerMark} />
            <View
              style={[
                s.fill,
                {
                  backgroundColor: accentColor,
                  width: `${fillPct / 2}%`,
                  left: value >= 0 ? "50%" : undefined,
                  right: value >= 0 ? undefined : "50%",
                },
              ]}
            />
          </>
        ) : (
          <View
            style={[
              s.fill,
              { backgroundColor: accentColor, width: `${fillPct}%` },
            ]}
          />
        )}
      </View>
      <View
        style={[
          s.thumb,
          { left: `${normalized * 100}%`, borderColor: accentColor },
        ]}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { height: 36, justifyContent: "center" },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  fill: { position: "absolute", top: 0, bottom: 0, borderRadius: 4 },
  centerMark: {
    position: "absolute",
    left: "49.5%",
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: 2,
  },
  thumb: {
    position: "absolute",
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    marginLeft: -12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
