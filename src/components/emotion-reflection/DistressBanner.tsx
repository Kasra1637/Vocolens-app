import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Shield, Wind } from 'phosphor-react-native';
import { DistressLevel } from '@/lib/types';
import { tapHaptic } from '@/lib/haptics';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba } from '@/lib/glass';

export default function DistressBanner({
  level,
  onGrounding,
}: {
  level: DistressLevel;
  onGrounding: () => void;
}) {
  const themeColors = getThemeColors();
  const isHigh = level === 'high';
  const bannerColor = isHigh ? '#FF6B6B' : '#FFB84D';

  return (
    <View
      style={[
        s.banner,
        {
          backgroundColor: hexToRgba(bannerColor, 0.1),
          borderColor: hexToRgba(bannerColor, 0.25),
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Shield size={18} color={bannerColor} />
        <Text style={[s.title, { color: bannerColor }]}>
          {isHigh ? 'Your distress level seems high' : 'You seem moderately distressed'}
        </Text>
      </View>
      <Text style={s.message}>
        {isHigh
          ? 'It might help to pause and ground yourself before saving. You are not alone in this.'
          : 'Taking a moment to breathe can help. Would you like to try a grounding exercise?'}
      </Text>
      <Pressable
        onPress={() => { tapHaptic(); onGrounding(); }}
        style={[s.button, { backgroundColor: bannerColor }]}
      >
        <Wind size={16} color="#FFFFFF" />
        <Text style={s.buttonText}>
          Try a grounding exercise
        </Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
