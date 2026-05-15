import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BodySensation } from '@/lib/types';
import { tapHaptic } from '@/lib/haptics';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba } from '@/lib/glass';

const OPTIONS: { value: BodySensation; label: string; emoji: string }[] = [
  { value: 'chest tightness', label: 'Chest tightness', emoji: '💓' },
  { value: 'knot in stomach', label: 'Knot in stomach', emoji: '🪢' },
  { value: 'racing heart', label: 'Racing heart', emoji: '💗' },
  { value: 'heavy limbs', label: 'Heavy limbs', emoji: '🪨' },
  { value: 'tension in shoulders', label: 'Tense shoulders', emoji: '🙍' },
  { value: 'lightness', label: 'Lightness', emoji: '☁️' },
  { value: 'warmth', label: 'Warmth', emoji: '🔥' },
  { value: 'coldness', label: 'Coldness', emoji: '🧊' },
  { value: 'tingling', label: 'Tingling', emoji: '⚡' },
  { value: 'numbness', label: 'Numbness', emoji: '😶' },
  { value: 'restlessness', label: 'Restlessness', emoji: '🐜' },
  { value: 'fatigue', label: 'Fatigue', emoji: '😴' },
  { value: 'head pressure', label: 'Head pressure', emoji: '🤯' },
  { value: 'throat constriction', label: 'Tight throat', emoji: '😖' },
  { value: 'breathlessness', label: 'Breathlessness', emoji: '😮‍💨' },
  { value: 'none', label: 'None of these', emoji: '✋' },
];

export default function BodySensationPicker({
  selected,
  onChange,
  suggestedSensations,
}: {
  selected?: BodySensation;
  onChange: (value: BodySensation | undefined) => void;
  suggestedSensations: string[];
}) {
  const themeColors = getThemeColors();

  return (
    <View>
      <Text style={s.title}>
        Where do you feel this in your body?
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => {
              tapHaptic();
              onChange(selected === option.value ? undefined : option.value);
            }}
            style={[
              s.chip,
              {
                backgroundColor: selected === option.value ? hexToRgba(themeColors.primary, 0.2) : hexToRgba(themeColors.primary, 0.1),
                borderColor: selected === option.value ? hexToRgba(themeColors.primary, 0.4) : hexToRgba(themeColors.primary, 0.15),
              },
            ]}
          >
            <Text style={{ fontSize: 16, marginRight: 6 }}>{option.emoji}</Text>
            <Text style={[s.chipText, { color: selected === option.value ? '#FFFFFF' : 'rgba(255,255,255,0.7)' }]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {suggestedSensations.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.suggestedLabel}>Suggested based on your entry</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {suggestedSensations.map((sensation, i) => (
              <View key={i} style={[s.suggestedPill, { backgroundColor: hexToRgba(themeColors.primary, 0.15) }]}>
                <Text style={s.suggestedText}>{sensation}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  suggestedLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  suggestedPill: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestedText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
