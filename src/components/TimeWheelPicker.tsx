/**
 * TimeWheelPicker — Custom branded scroll-wheel time picker
 *
 * Renders three snap-scrolling columns: Hour · Minute · AM/PM.
 * Fully styled from the caller-supplied primaryColor — no native OS picker used.
 * Shared between onboarding NotificationPreferencesScreen and Settings.
 */

import React, { useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { selectionHaptic } from "@/lib/haptics";

const ITEM_H = 52;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  primaryColor: string;
  width: number;
}

function WheelColumn({ items, selectedIndex, onSelect, primaryColor, width }: WheelColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastHapticIdx = useRef(selectedIndex);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (clamped !== lastHapticIdx.current) {
        lastHapticIdx.current = clamped;
        selectionHaptic();
      }
    },
    [items.length],
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      onSelect(clamped);
    },
    [items.length, onSelect],
  );

  return (
    <View style={{ width, height: WHEEL_H, overflow: "hidden" }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: PAD,
          left: 4,
          right: 4,
          height: ITEM_H,
          borderRadius: 14,
          backgroundColor: primaryColor + "30",
          borderWidth: 1.5,
          borderColor: primaryColor + "70",
          zIndex: 1,
        }}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingTop: PAD, paddingBottom: PAD }}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={ITEM_H / 2}
        bounces={false}
      >
        {items.map((label, i) => {
          const isSelected = i === selectedIndex;
          return (
            <Pressable
              key={label + i}
              onPress={() => {
                onSelect(i);
                scrollRef.current?.scrollTo({ y: i * ITEM_H, animated: true });
              }}
              style={{
                height: ITEM_H,
                width,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: isSelected ? "Inter_700Bold" : "Inter_400Regular",
                  fontSize: isSelected ? 28 : 22,
                  color: "#FFFFFF",
                  opacity: isSelected ? 1 : 0.35,
                  letterSpacing: isSelected ? 0.5 : 0,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface TimeWheelPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  primaryColor: string;
}

export function TimeWheelPicker({ value, onChange, primaryColor }: TimeWheelPickerProps) {
  const rawHour = value.getHours();
  const period = rawHour >= 12 ? 1 : 0;
  const hour12 = rawHour % 12 === 0 ? 12 : rawHour % 12;
  const hourIdx = hour12 - 1;
  const minuteIdx = value.getMinutes();

  const emit = useCallback(
    (hIdx: number, mIdx: number, pIdx: number) => {
      const h12 = hIdx + 1;
      const hour24 = pIdx === 1
        ? h12 === 12 ? 12 : h12 + 12
        : h12 === 12 ? 0 : h12;
      const d = new Date(value);
      d.setHours(hour24, mIdx, 0, 0);
      onChange(d);
    },
    [value, onChange],
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <WheelColumn
        items={HOURS}
        selectedIndex={hourIdx}
        onSelect={(i) => emit(i, minuteIdx, period)}
        primaryColor={primaryColor}
        width={80}
      />

      <Text
        style={{
          color: "rgba(255,255,255,0.60)",
          fontSize: 28,
          fontFamily: "Inter_700Bold",
          marginBottom: 4,
          width: 16,
          textAlign: "center",
        }}
      >
        :
      </Text>

      <WheelColumn
        items={MINUTES}
        selectedIndex={minuteIdx}
        onSelect={(i) => emit(hourIdx, i, period)}
        primaryColor={primaryColor}
        width={80}
      />

      <View style={{ width: 12 }} />

      <WheelColumn
        items={PERIODS}
        selectedIndex={period}
        onSelect={(i) => emit(hourIdx, minuteIdx, i)}
        primaryColor={primaryColor}
        width={64}
      />
    </View>
  );
}
