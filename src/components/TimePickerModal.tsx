/**
 * Custom Time Picker Modal
 *
 * User-friendly time selection component with scrollable hour/minute pickers
 * Works seamlessly on both native (iOS/Android) and web platforms
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';

interface TimePickerModalProps {
  value: Date;
  onChange: (date: Date) => void;
  use24Hour?: boolean;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
}

export function TimePickerModal({
  value,
  onChange,
  use24Hour = false,
  textColor = '#FFFFFF',
  backgroundColor = 'rgba(255, 255, 255, 0.1)',
  borderColor = 'rgba(255, 255, 255, 0.2)',
}: TimePickerModalProps) {
  const [hours, setHours] = useState(value.getHours());
  const [minutes, setMinutes] = useState(value.getMinutes());

  const handleHourChange = (newHour: number) => {
    const maxHours = use24Hour ? 23 : 12;
    let hour = newHour;

    if (hour < 0) hour = maxHours;
    if (hour > maxHours) hour = 0;

    setHours(hour);

    const newDate = new Date(value);
    if (!use24Hour && hour === 0) {
      newDate.setHours(12); // 12 AM
    } else if (!use24Hour && hour === 12 && value.getHours() < 12) {
      newDate.setHours(0); // Handle 12-hour wrap
    } else {
      newDate.setHours(hour);
    }
    newDate.setMinutes(minutes);
    onChange(newDate);
  };

  const handleMinuteChange = (newMinute: number) => {
    let minute = newMinute;

    if (minute < 0) minute = 59;
    if (minute > 59) minute = 0;

    setMinutes(minute);

    const newDate = new Date(value);
    newDate.setHours(hours);
    newDate.setMinutes(minute);
    onChange(newDate);
  };

  const hourArray = use24Hour
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i + 1);

  const minuteArray = Array.from({ length: 60 }, (_, i) => i);

  const displayHour = use24Hour ? hours : (hours === 0 ? 12 : hours > 12 ? hours - 12 : hours);
  const isPM = hours >= 12;

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 16,
        borderWidth: 1,
        borderColor,
        padding: 16,
      }}
    >
      <View className="flex-row items-center justify-center gap-4">
        {/* Hours Column */}
        <View className="items-center">
          <Pressable
            onPress={() => handleHourChange(displayHour + 1)}
            className="active:opacity-70 p-2"
          >
            <ChevronUp size={24} color={textColor} strokeWidth={2} />
          </Pressable>

          <View
            className="items-center justify-center rounded-lg"
            style={{
              width: 80,
              height: 80,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 2,
              borderColor: textColor,
            }}
          >
            <Text
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: textColor,
              }}
            >
              {displayHour.toString().padStart(2, '0')}
            </Text>
          </View>

          <Pressable
            onPress={() => handleHourChange(displayHour - 1)}
            className="active:opacity-70 p-2"
          >
            <ChevronDown size={24} color={textColor} strokeWidth={2} />
          </Pressable>

          <Text
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.7)',
              marginTop: 8,
              fontWeight: '600',
            }}
          >
            Hour
          </Text>
        </View>

        {/* Separator */}
        <Text
          style={{
            fontSize: 40,
            fontWeight: 'bold',
            color: textColor,
          }}
        >
          :
        </Text>

        {/* Minutes Column */}
        <View className="items-center">
          <Pressable
            onPress={() => handleMinuteChange(minutes + 1)}
            className="active:opacity-70 p-2"
          >
            <ChevronUp size={24} color={textColor} strokeWidth={2} />
          </Pressable>

          <View
            className="items-center justify-center rounded-lg"
            style={{
              width: 80,
              height: 80,
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderWidth: 2,
              borderColor: textColor,
            }}
          >
            <Text
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: textColor,
              }}
            >
              {minutes.toString().padStart(2, '0')}
            </Text>
          </View>

          <Pressable
            onPress={() => handleMinuteChange(minutes - 1)}
            className="active:opacity-70 p-2"
          >
            <ChevronDown size={24} color={textColor} strokeWidth={2} />
          </Pressable>

          <Text
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.7)',
              marginTop: 8,
              fontWeight: '600',
            }}
          >
            Minute
          </Text>
        </View>

        {/* AM/PM for 12-hour format */}
        {!use24Hour && (
          <View className="items-center ml-2">
            <Pressable
              onPress={() => {
                const newHour = isPM ? hours - 12 : hours + 12;
                setHours(newHour);
                const newDate = new Date(value);
                newDate.setHours(newHour);
                newDate.setMinutes(minutes);
                onChange(newDate);
              }}
              className="active:opacity-70 p-2"
            >
              <ChevronUp size={24} color={textColor} strokeWidth={2} />
            </Pressable>

            <View
              className="items-center justify-center rounded-lg"
              style={{
                width: 70,
                height: 80,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 2,
                borderColor: textColor,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: textColor,
                }}
              >
                {isPM ? 'PM' : 'AM'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                const newHour = isPM ? hours - 12 : hours + 12;
                setHours(newHour);
                const newDate = new Date(value);
                newDate.setHours(newHour);
                newDate.setMinutes(minutes);
                onChange(newDate);
              }}
              className="active:opacity-70 p-2"
            >
              <ChevronDown size={24} color={textColor} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
