import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Shield, Wind } from 'lucide-react-native';
import { DistressLevel } from '@/lib/types';
import { tapHaptic } from '@/lib/haptics';

export default function DistressBanner({
  level,
  onGrounding,
}: {
  level: DistressLevel;
  onGrounding: () => void;
}) {
  const isHigh = level === 'high';
  return (
    <View
      style={{
        backgroundColor: isHigh ? '#FEF2F2' : '#FFFBEB',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: isHigh ? '#FECACA' : '#FDE68A',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Shield size={18} color={isHigh ? '#DC2626' : '#D97706'} />
        <Text style={{ fontSize: 15, fontWeight: '700', color: isHigh ? '#DC2626' : '#B45309', marginLeft: 8 }}>
          {isHigh ? 'Your distress level seems high' : 'You seem moderately distressed'}
        </Text>
      </View>
      <Text style={{ fontSize: 14, color: isHigh ? '#991B1B' : '#92400E', lineHeight: 22, marginBottom: 12 }}>
        {isHigh
          ? 'It might help to pause and ground yourself before saving. You are not alone in this.'
          : 'Taking a moment to breathe can help. Would you like to try a grounding exercise?'}
      </Text>
      <Pressable
        onPress={() => { tapHaptic(); onGrounding(); }}
        style={{
          backgroundColor: isHigh ? '#DC2626' : '#D97706',
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-start',
        }}
      >
        <Wind size={16} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 8 }}>
          Try a grounding exercise
        </Text>
      </Pressable>
    </View>
  );
}
