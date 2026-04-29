import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { X, HelpCircle, Heart, Activity, Sparkles } from 'lucide-react-native';
import { EmotionType, BodySensation, DistressLevel } from '@/lib/types';
import { getEmotionDefinition } from '@/lib/emotion-definitions';
import { tapHaptic, successHaptic } from '@/lib/haptics';
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
      <View style={{ flex: 1, backgroundColor: '#FAFAF9' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Pressable onPress={onDismiss} style={{ padding: 8 }}><X size={24} color="#6B7280" /></Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937' }}>How are you feeling?</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* Transcript */}
          <Animated.View entering={FadeInUp.delay(100)}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>What we heard</Text>
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 15, color: '#374151', lineHeight: 22 }} numberOfLines={4}>{transcript}</Text>
            </View>
          </Animated.View>

          {/* Emotions */}
          <Animated.View entering={FadeInUp.delay(200)} style={{ marginTop: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937' }}>Emotion labels</Text>
              <Pressable onPress={handleIDontKnow} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: alexithymiaMode ? '#F3E8FF' : '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <HelpCircle size={14} color={alexithymiaMode ? '#7C3AED' : '#6B7280'} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: alexithymiaMode ? '#7C3AED' : '#6B7280', marginLeft: 4 }}>
                  {alexithymiaMode ? 'Not sure mode' : "I don't know"}
                </Text>
              </Pressable>
            </View>

            {alexithymiaMode ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 12 }}>
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
                        style={{ backgroundColor: isSelected ? '#EDE9FE' : '#FFFFFF', borderWidth: 2, borderColor: isSelected ? '#7C3AED' : '#E5E7EB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 18, marginRight: 6 }}>{def.emoji}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isSelected ? '#7C3AED' : '#374151', textTransform: 'capitalize' }}>{emotion}</Text>
                        {isSelected && <View style={{ marginLeft: 6, width: 18, height: 18, borderRadius: 9, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>✓</Text></View>}
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>Long-press any emotion to learn what it means</Text>
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>How did this feel?</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>Drag to adjust — there are no wrong answers</Text>

            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Heart size={16} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Pleasant — Unpleasant</Text>
              </View>
              <ValenceSlider value={valence} onChange={setValence} />
            </View>

            <View style={{ marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Activity size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Calm — Activated</Text>
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
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}>
          <Pressable onPress={handleSave} style={{ backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 8 }}>Save Entry</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
