/**
 * EmotionCorrectionModal — Post-Analysis Feedback UI
 *
 * Appears on the entry detail screen. Lets the user confirm or correct
 * the AI's emotion analysis. Supports ADHD/OCD/ADD with:
 * - Immediate dismissibility (no friction)
 * - Plain-language confirm/reject labels
 * - Slider-based adjustments (low cognitive load)
 * - Optional voice or text explanation
 * - Always accessible via "Refine Analysis" button after entry is saved
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp, FadeIn, FadeInDown } from 'react-native-reanimated';
import { Mic, Check, X, ChevronRight, Brain, Square } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { EmotionType, DistressLevel } from '@/lib/types';
import { EMOTION_EMOJIS } from '@/lib/types';
import { getEmotionDefinition } from '@/lib/emotion-definitions';
import { useEmotionCorrectionStore } from '@/lib/state/emotion-correction-store';
import { tapHaptic, successHaptic } from '@/lib/haptics';
import { transcribeAudioFile } from '@/lib/deepgram-transcription-service';

const { width: SCREEN_W } = Dimensions.get('window');
const ALL_EMOTIONS: EmotionType[] = ['happiness', 'sadness', 'anger', 'disgust', 'fear', 'surprise', 'trust', 'anticipation'];

type CorrectionMode = 'voice' | 'text' | 'slider';

interface Props {
  visible: boolean;
  entryId: string;
  aiEmotion: EmotionType;
  aiValence: number;
  aiArousal: number;
  aiDistress: DistressLevel;
  onDismiss: () => void;
  onSubmit: (correction: {
    userConfirmedAI: boolean;
    userEditedEmotion?: EmotionType;
    userEditedValence?: number;
    userEditedArousal?: number;
    userCorrectionMode?: CorrectionMode;
    userCorrectionReason?: string;
    correctionTimestamp: string;
  }) => void;
}

export default function EmotionCorrectionModal({
  visible, entryId, aiEmotion, aiValence, aiArousal, aiDistress, onDismiss, onSubmit,
}: Props) {
  const [step, setStep] = useState<'initial' | 'replace' | 'explain'>('initial');
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionType | null>(null);
  const [valence, setValence] = useState(aiValence);
  const [arousal, setArousal] = useState(aiArousal);
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>('slider');
  const [reason, setReason] = useState('');

  // Voice note mini-recorder state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isTranscribingVoice, setIsTranscribingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const voiceRecordingRef = useRef<Audio.Recording | null>(null);

  const { recordCorrection, recordConfirmation } = useEmotionCorrectionStore();

  const handleConfirm = useCallback(() => {
    successHaptic();
    recordConfirmation(entryId, aiEmotion, aiValence, aiArousal);
    onSubmit({
      userConfirmedAI: true,
      correctionTimestamp: new Date().toISOString(),
    });
  }, [entryId, aiEmotion, aiValence, aiArousal, recordConfirmation, onSubmit]);

  const handleReject = useCallback(() => {
    tapHaptic();
    setStep('replace');
  }, []);

  const handleSelectReplacement = useCallback((emotion: EmotionType) => {
    tapHaptic();
    setSelectedEmotion(emotion);
    setStep('explain');
  }, []);

  const handleSliderAdjustment = useCallback(() => {
    tapHaptic();
    setCorrectionMode('slider');
    recordCorrection({
      entryId,
      timestamp: new Date().toISOString(),
      aiEmotion,
      userEmotion: aiEmotion,
      aiValence,
      userValence: valence,
      aiArousal,
      userArousal: arousal,
      reason: undefined,
      correctionMode: 'slider',
    });
    onSubmit({
      userConfirmedAI: false,
      userEditedEmotion: aiEmotion,
      userEditedValence: valence,
      userEditedArousal: arousal,
      userCorrectionMode: 'slider',
      correctionTimestamp: new Date().toISOString(),
    });
  }, [entryId, aiEmotion, aiValence, valence, aiArousal, arousal, recordCorrection, onSubmit]);

  const handleVoiceReason = useCallback(() => {
    setCorrectionMode('voice');
    setVoiceTranscript('');
  }, []);

  const startVoiceRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      voiceRecordingRef.current = recording;
      setIsRecordingVoice(true);
      tapHaptic();
    } catch (err) {
      console.warn('Voice reason recording failed:', err);
    }
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    try {
      setIsRecordingVoice(false);
      const recording = voiceRecordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      voiceRecordingRef.current = null;
      if (!uri) return;
      setIsTranscribingVoice(true);
      const result = await transcribeAudioFile(uri);
      setIsTranscribingVoice(false);
      if (result.transcript && result.transcript.trim().length > 0) {
        setVoiceTranscript(result.transcript);
        setReason(result.transcript);
      }
    } catch (err) {
      console.warn('Voice reason transcription failed:', err);
      setIsTranscribingVoice(false);
    }
  }, []);

  const handleTextReason = useCallback(() => {
    setCorrectionMode('text');
  }, []);

  const handleSubmitWithReason = useCallback(() => {
    successHaptic();
    recordCorrection({
      entryId,
      timestamp: new Date().toISOString(),
      aiEmotion,
      userEmotion: selectedEmotion ?? aiEmotion,
      aiValence,
      userValence: valence,
      aiArousal,
      userArousal: arousal,
      reason: reason.trim() || undefined,
      correctionMode,
    });
    onSubmit({
      userConfirmedAI: false,
      userEditedEmotion: selectedEmotion ?? aiEmotion,
      userEditedValence: valence,
      userEditedArousal: arousal,
      userCorrectionMode: correctionMode,
      userCorrectionReason: reason.trim() || undefined,
      correctionTimestamp: new Date().toISOString(),
    });
  }, [entryId, aiEmotion, selectedEmotion, aiValence, valence, aiArousal, arousal, reason, correctionMode, recordCorrection, onSubmit]);

  const aiDef = getEmotionDefinition(aiEmotion);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: '#FAFAF9' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
          <Pressable onPress={onDismiss} style={{ padding: 8 }}>
            <X size={24} color="#6B7280" />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1F2937' }}>
            {step === 'initial' ? 'Does this feel right?' : step === 'replace' ? 'What emotion fits better?' : 'Anything to add?'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {/* AI result summary */}
          {step === 'initial' && (
            <Animated.View entering={FadeIn}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8, fontWeight: '600' }}>
                AI detected
              </Text>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 36, marginRight: 12 }}>{aiDef.emoji}</Text>
                  <View>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', textTransform: 'capitalize' }}>{aiEmotion}</Text>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>{aiDef.plainLanguage}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Pleasant</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 60, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${(aiValence + 100) / 2}%`, height: '100%', backgroundColor: aiValence >= 0 ? '#10B981' : '#EF4444', borderRadius: 2 }} />
                      </View>
                    </View>
                  </View>
                  <View>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 2 }}>Activated</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 60, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${aiArousal}%`, height: '100%', backgroundColor: '#F59E0B', borderRadius: 2 }} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Replace emotion */}
          {step === 'replace' && (
            <Animated.View entering={FadeInDown.delay(100)}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 }}>
                No worries — emotions can be hard to pin down. Which label feels more like what you were actually feeling?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {ALL_EMOTIONS.map((emotion) => {
                  const def = getEmotionDefinition(emotion);
                  return (
                    <Pressable
                      key={emotion}
                      onPress={() => handleSelectReplacement(emotion)}
                      style={{ backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 18, marginRight: 6 }}>{def.emoji}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', textTransform: 'capitalize' }}>{emotion}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable onPress={() => setStep('initial')} style={{ marginTop: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>Actually, I want to adjust sliders instead</Text>
              </Pressable>
            </Animated.View>
          )}

          {/* V-A sliders */}
          {(step === 'initial' || step === 'replace') && (
            <Animated.View entering={FadeIn.delay(200)} style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>Or adjust how you felt</Text>
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Drag the sliders to refine your emotional state</Text>

              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 }}>
                <View style={{ marginBottom: 20 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Pleasant ↔ Unpleasant</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{valence > 0 ? `+${valence}` : valence}</Text>
                  </View>
                  <Slider
                    value={valence}
                    min={-100} max={100}
                    onChange={setValence}
                    positive={valence >= 0}
                  />
                </View>

                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '500' }}>Calm ↔ Activated</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{arousal}</Text>
                  </View>
                  <Slider value={arousal} min={0} max={100} onChange={setArousal} positive={arousal >= 50} />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Explanation step */}
          {step === 'explain' && (
            <Animated.View entering={FadeInDown.delay(100)}>
              {selectedEmotion && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 8, fontWeight: '600' }}>You selected</Text>
                  <View style={{ backgroundColor: '#EDE9FE', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#7C3AED', flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, marginRight: 12 }}>
                      {getEmotionDefinition(selectedEmotion).emoji}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#7C3AED', textTransform: 'capitalize' }}>{selectedEmotion}</Text>
                  </View>
                </View>
              )}

              <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 16 }}>
                Is there anything that might help us understand this better next time? {'(Optional)'}
              </Text>

              {/* Reason options */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <ReasonChip label="Voice note" icon={<Mic size={14} />} active={correctionMode === 'voice'} onPress={handleVoiceReason} />
                <ReasonChip label="Quick note" icon={<Brain size={14} />} active={correctionMode === 'text'} onPress={handleTextReason} />
                <ReasonChip label="Just the emotion" icon={<Check size={14} />} active={correctionMode === 'slider'} onPress={() => setCorrectionMode('slider')} />
              </View>

              {correctionMode === 'text' && (
                <Animated.View entering={FadeIn.delay(100)} style={{ marginBottom: 16 }}>
                  <TextInput
                    multiline
                    placeholder="What made you feel this way? (optional)"
                    placeholderTextColor="#9CA3AF"
                    value={reason}
                    onChangeText={setReason}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 15,
                      color: '#1F2937',
                      minHeight: 80,
                      textAlignVertical: 'top',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                    }}
                  />
                </Animated.View>
              )}

              {correctionMode === 'voice' && (
                <Animated.View entering={FadeIn.delay(100)} style={{ backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}>
                  {isRecordingVoice ? (
                    <Pressable onPress={stopVoiceRecording}>
                      <ActivityIndicator size="small" color="#6B7280" />
                      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>Recording...</Text>
                    </Pressable>
                  ) : isTranscribingVoice ? (
                    <View>
                      <ActivityIndicator size="small" color="#6B7280" />
                      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>Transcribing...</Text>
                    </View>
                  ) : (
                    <Pressable onPress={startVoiceRecording}>
                      <Mic size={24} color="#6B7280" />
                      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' }}>Tap to record reason</Text>
                    </Pressable>
                  )}
                  {voiceTranscript.length > 0 && (
                    <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
                      {voiceTranscript}
                    </Text>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Bottom action bar */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}>
          {step === 'initial' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={handleReject}
                style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>Not quite right</Text>
              </Pressable>
              <Pressable
                onPress={handleSliderAdjustment}
                style={{ flex: 1, backgroundColor: '#6B7280', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Adjust sliders</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={{ flex: 1, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Yes, that's me</Text>
              </Pressable>
            </View>
          )}

          {step === 'replace' && (
            <Pressable
              onPress={() => setStep('initial')}
              style={{ backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>Go back</Text>
            </Pressable>
          )}

          {step === 'explain' && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => {
                  recordCorrection({
                    entryId,
                    timestamp: new Date().toISOString(),
                    aiEmotion,
                    userEmotion: selectedEmotion ?? aiEmotion,
                    aiValence,
                    userValence: valence,
                    aiArousal,
                    userArousal: arousal,
                    reason: undefined,
                    correctionMode,
                  });
                  onSubmit({
                    userConfirmedAI: false,
                    userEditedEmotion: selectedEmotion ?? aiEmotion,
                    userEditedValence: valence,
                    userEditedArousal: arousal,
                    userCorrectionMode: correctionMode,
                    correctionTimestamp: new Date().toISOString(),
                  });
                }}
                style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitWithReason}
                style={{ flex: 2, backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Save correction</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Slider ──────────────────────────────────────────────────────────────────

function Slider({
  value, min, max, onChange, positive,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  positive: boolean;
}) {
  const [localVal, setLocalVal] = useState(value);
  const trackWidth = SCREEN_W - 64;
  const normalized = (localVal - min) / (max - min);
  const position = normalized * trackWidth;

  return (
    <Pressable
      onPress={(e) => {
        const x = e.nativeEvent.locationX;
        const v = Math.round(min + (x / trackWidth) * (max - min));
        const clamped = Math.max(min, Math.min(max, v));
        setLocalVal(clamped);
        onChange(clamped);
      }}
      style={{ height: 32, justifyContent: 'center' }}
    >
      <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${normalized * 100}%`, height: '100%', backgroundColor: positive ? '#10B981' : '#EF4444', opacity: 0.7, borderRadius: 3 }} />
      </View>
      <View style={{ position: 'absolute', left: Math.max(0, position - 10), width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: positive ? '#10B981' : '#EF4444', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4 }} />
    </Pressable>
  );
}

// ── Reason chip ─────────────────────────────────────────────────────────────

function ReasonChip({ label, icon, active, onPress }: { label: string; icon: React.ReactNode; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: active ? '#EDE9FE' : '#F3F4F6',
        borderWidth: 1,
        borderColor: active ? '#7C3AED' : 'transparent',
      }}
    >
      <Text style={{ color: active ? '#7C3AED' : '#6B7280', marginRight: 6, fontSize: 13, fontWeight: '500' }}>{icon}</Text>
      <Text style={{ color: active ? '#7C3AED' : '#6B7280', fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}
