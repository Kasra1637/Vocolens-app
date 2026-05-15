import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { EmotionDefinition } from '@/lib/emotion-definitions';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba, GlassLayers } from '@/lib/glass';

export default function EmotionDefinitionCard({ definition, onClose }: { definition: EmotionDefinition; onClose: () => void }) {
  const themeColors = getThemeColors();

  return (
    <View
      style={[
        s.card,
        {
          backgroundColor: hexToRgba(themeColors.primary, 0.1),
          borderColor: hexToRgba(themeColors.primary, 0.15),
          overflow: 'hidden',
        },
      ]}
    >
      <GlassLayers primaryColor={themeColors.primary} borderRadius={16} blur={false} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 28, marginRight: 10 }}>{definition.emoji}</Text>
          <Text style={[s.title, { textTransform: 'capitalize' }]}>
            {definition.emotion}
          </Text>
        </View>
        <Pressable onPress={onClose} style={{ padding: 4 }}>
          <X size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      <Text style={s.description}>
        {definition.plainLanguage}
      </Text>

      <View style={{ marginBottom: 12 }}>
        <Text style={s.sectionTitle}>
          You might feel this in your body:
        </Text>
        {definition.bodySignals.map((signal, i) => (
          <Text key={i} style={s.listItem}>• {signal}</Text>
        ))}
      </View>

      <View>
        <Text style={s.sectionTitle}>
          This might show up when:
        </Text>
        {definition.likeThis.map((example, i) => (
          <Text key={i} style={s.listItem}>• {example}</Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  listItem: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
  },
});
