import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { X, HelpCircle, Heart, Activity, Sparkles } from 'lucide-react-native';
import { EmotionType, BodySensation, DistressLevel } from '@/lib/types';
import { getEmotionDefinition } from '@/lib/emotion-definitions';
import { tapHaptic, successHaptic } from '@/lib/haptics';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba, GlassLayers } from '@/lib/glass';
import ValenceSlider from './ValenceSlider';
import ArousalSlider from './ArousalSlider';
import EmotionDefinitionCard from './EmotionDefinitionCard';
import BodySensationPicker from './BodySensationPicker';
import DistressBanner from './DistressBanner';

export interface ReflectionResult {
  emotions: EmotionType[];
  primaryEmotion: EmotionType;
  valence: number;
  arousal: number;
  bodySensation?: BodySensation;
  alexithymiaFlag: boolean;
  distressLevel: DistressLevel;
}

interface Props {
  visible: boolean;
  transcript: string;
  suggestedEmotions: EmotionType[];
  suggestedBodySensations: string[];
  initialValence: number;
  initialArousal: number;
  initialDistressLevel: DistressLevel;
  onComplete: (result: ReflectionResult) => void;
  onDismiss: () => void;
  onGrounding: () => void;
}

function computeDistress(valence: number, arousal: number): DistressLevel {
  const score = (-valence * 0.5) + (arousal * 0.5);
  if (score > 60) return 'high';
  if (score > 30) return 'moderate';
  return 'low';
}

const ALL_EMOTIONS: EmotionType[] = ['happiness', 'sadness', 'anger', 'disgust', 'fear', 'surprise', 'trust', 'anticipation'];

export default function EmotionReflectionScreen({
  visible, transcript, suggestedEmotions, suggestedBodySensations,
  initialValence, initialArousal, onComplete, onDismiss, onGrounding,
}: Props) {
  const [emotions, setEmotions] = useState<EmotionType[]>(suggestedEmotions);
  const [valence, setValence] = useState(initialValence);
  const [arousal, setArousal] = useState(initialArousal);
  const [alexithymiaMode, setAlexithymiaMode] = useState(false);
  const [bodySensation, setBodySensation] = useState<BodySensation | undefined>();
  const [selectedDefinition, setSelectedDefinition] = useState<EmotionType | null>(null);

  const themeColors = getThemeColors();
  const distressLevel = useMemo(() => computeDistress(valence, arousal), [valence, arousal]);

  const toggleEmotion = useCallback((emotion: EmotionType) => {
    tapHaptic();
    setEmotions((prev) => prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]);
  }, []);

  const primaryEmotion = useMemo(() => emotions.length === 0 ? 'trust' : emotions[0], [emotions]);

  const handleSave = useCallback(() => {
    successHaptic();
    onComplete({ emotions, primaryEmotion, valence, arousal, bodySensation, alexithymiaFlag: alexithymiaMode, distressLevel });
  }, [emotions, primaryEmotion, valence, arousal, bodySensation, alexithymiaMode, distressLevel, onComplete]);

  const handleIDontKnow = useCallback(() => { tapHaptic(); setAlexithymiaMode(true); setEmotions([]); }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: hexToRgba(themeColors.primary, 0.2) }]}>
          <Pressable onPress={onDismiss} style={{ padding: 8 }}><X size={24} color="#FFFFFF" /></Pressable>
          <Text style={s.headerTitle}>How are you feeling?</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Transcript */}
          <Animated.View entering={FadeInUp.delay(100)}>
            <Text style={s.sectionLabel}>What we heard</Text>
            <View style={[s.card, { backgroundColor: hexToRgba(themeColors.primary, 0.1), borderColor: hexToRgba(themeColors.primary, 0.15) }]}>
              <GlassLayers primaryColor={themeColors.primary} borderRadius={16} />
              <Text style={s.transcriptText} numberOfLines={4}>{transcript}</Text>
            </View>
          </Animated.View>

          {/* Emotions */}
          <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.emotionTitle}>Emotion labels</Text>
              <Pressable onPress={handleIDontKnow} style={[s.idkButton, { backgroundColor: alexithymiaMode ? hexToRgba(themeColors.primary, 0.3) : hexToRgba(themeColors.primary, 0.15) }]}>
                <HelpCircle size={14} color={alexithymiaMode ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
                <Text style={[s.idkText, { color: alexithymiaMode ? '#FFFFFF' : 'rgba(255,255,255,0.7)' }]}>
                  {alexithymiaMode ? 'Not sure mode' : "I don't know"}
                </Text>
              </Pressable>
            </View>

            {alexithymiaMode ? (
              <View style={{ marginTop: 12 }}>
                <Text style={s.alexithymiaText}>
                  That is completely okay. Many people find it hard to name emotions. Try noticing where you feel something in your body, or use the sliders below.
                </Text>
                <BodySensationPicker selected={bodySensation} onChange={setBodySensation} suggestedSensations={suggestedBodySensations} />
              </View>
            ) : (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {ALL_EMOTIONS.map((emotion) => {
                    const isSelected = emotions.includes(emotion);
                    const def = getEmotionDefinition(emotion);
                    return (
                      <Pressable
                        key={emotion}
                        onPress={() => toggleEmotion(emotion)}
                        onLongPress={() => { tapHaptic(); setSelectedDefinition(emotion); }}
                        style={[
                          s.emotionChip,
                          {
                            backgroundColor: isSelected ? hexToRgba(themeColors.primary, 0.2) : hexToRgba(themeColors.primary, 0.1),
                            borderColor: isSelected ? hexToRgba(themeColors.primary, 0.4) : hexToRgba(themeColors.primary, 0.15),
                          }
                        ]}
                      >
                        <Text style={{ fontSize: 18, marginRight: 6 }}>{def.emoji}</Text>
                        <Text style={[s.emotionChipText, { color: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)' }]}>{emotion}</Text>
                        {isSelected && <View style={[s.checkBadge, { backgroundColor: themeColors.primary }]}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={s.emotionHint}>Long-press any emotion to learn what it means</Text>
              </View>
            )}
          </Animated.View>

          {/* Definition card */}
          {selectedDefinition && (
            <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
              <EmotionDefinitionCard definition={getEmotionDefinition(selectedDefinition)} onClose={() => setSelectedDefinition(null)} />
            </Animated.View>
          )}

          {/* Sliders */}
          <Animated.View entering={FadeInUp.delay(300)} style={{ marginTop: 28 }}>
            <Text style={s.emotionTitle}>How did this feel?</Text>
            <Text style={s.sliderHint}>Drag to adjust — there are no wrong answers</Text>

            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Heart size={16} color="#FF6B6B" style={{ marginRight: 6 }} />
                <Text style={s.sliderLabel}>Pleasant — Unpleasant</Text>
              </View>
              <ValenceSlider value={valence} onChange={setValence} />
            </View>

            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Activity size={16} color="#FFB84D" style={{ marginRight: 6 }} />
                <Text style={s.sliderLabel}>Calm — Activated</Text>
              </View>
              <ArousalSlider value={arousal} onChange={setArousal} />
            </View>
          </Animated.View>

          {/* Distress banner */}
          {distressLevel !== 'low' && (
            <Animated.View entering={FadeInUp.delay(400)} style={{ marginTop: 24 }}>
              <DistressBanner level={distressLevel} onGrounding={onGrounding} />
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={[s.bottomBar, { borderTopColor: hexToRgba(themeColors.primary, 0.2), backgroundColor: hexToRgba(themeColors.primary, 0.08) }]}>
          <Pressable onPress={handleSave} style={[s.saveButton, { backgroundColor: hexToRgba(themeColors.primary, 0.25), borderWidth: 1.5, borderColor: hexToRgba(themeColors.primary, 0.55) }]}>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={s.saveButtonText}>Save Entry</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  transcriptText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  emotionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  idkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  idkText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  alexithymiaText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
    marginBottom: 12,
  },
  emotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  emotionChipText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  checkBadge: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
  },
  sliderHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  saveButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
