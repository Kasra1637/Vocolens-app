import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useFonts,
  Comfortaa_400Regular,
  Comfortaa_500Medium,
  Comfortaa_600SemiBold,
  Comfortaa_700Bold,
} from '@expo-google-fonts/comfortaa';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  Edit3,
  Save,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  MessageSquare,
  Lightbulb,
  Target,
  Play,
  Square,
  Volume2,
  BarChart2,
  RefreshCw,
  CheckCircle2,
  Heart,
  AlertTriangle,
  Wind,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { tapHaptic, selectHaptic, successHaptic, confirmHaptic } from '@/lib/haptics';
import * as Speech from 'expo-speech';
import { getThemeColors, getThemeGradients, getThemeShadows } from '@/lib/theme';
import useJournalStore from '@/lib/state/journal-store';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { useDeleteEntry } from '@/lib/hooks';
import { formatShortDuration, EMOTION_COLORS, EmotionType, EmotionScores, getEmotionSubLabel } from '@/lib/types';
import { AudioPlayer } from '@/components/AudioPlayer';

const ALL_EMOTIONS: EmotionType[] = [
  'happiness', 'trust', 'anticipation', 'surprise',
  'fear', 'sadness', 'disgust', 'anger',
];

export default function EntryDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'emotions' | 'analysis' | 'reflection' | null>('emotions');
  const [barContainerWidth, setBarContainerWidth] = useState(0);
  const onBarContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setBarContainerWidth(e.nativeEvent.layout.width);
  }, []);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Get selected theme and dark mode
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const Colors = getThemeColors(selectedTheme, isDarkMode);
  const Gradients = getThemeGradients(selectedTheme, isDarkMode);
  const Shadows = getThemeShadows(selectedTheme);

  const getEntry = useJournalStore((s) => s.getEntry);
  const updateEntry = useJournalStore((s) => s.updateEntry);
  const deleteEntryMutation = useDeleteEntry();

  const [fontsLoaded] = useFonts({
    Comfortaa_400Regular,
    Comfortaa_500Medium,
    Comfortaa_600SemiBold,
    Comfortaa_700Bold,
  });

  const entry = id ? getEntry(id) : null;

  const handleBack = () => {
    tapHaptic();
    if (isSpeaking) Speech.stop();
    if (isEditing) {
      setIsEditing(false);
      setEditedTranscript('');
    } else {
      router.back();
    }
  };

  const handleEdit = () => {
    if (!entry) return;
    selectHaptic();
    setIsEditing(true);
    setEditedTranscript(entry.transcript);
  };

  const handleSave = () => {
    if (!entry) return;
    successHaptic();
    updateEntry(entry.id, { transcript: editedTranscript });
    setIsEditing(false);
    setEditedTranscript('');
  };

  const handleCancelEdit = () => {
    tapHaptic();
    setIsEditing(false);
    setEditedTranscript('');
  };

  const handleDeletePress = () => {
    selectHaptic();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (!entry) return;
    confirmHaptic();
    if (isSpeaking) Speech.stop();
    deleteEntryMutation.mutate(entry.id);
    setShowDeleteModal(false);
    router.back();
  };

  const handleDeleteCancel = () => {
    tapHaptic();
    setShowDeleteModal(false);
  };

  const toggleSection = (section: 'emotions' | 'analysis' | 'reflection') => {
    tapHaptic();
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleToggleSpeech = async () => {
    if (!entry?.aiReflection) return;
    selectHaptic();
    if (isSpeaking) {
      await Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(entry.aiReflection, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
      });
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  if (!entry) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: Colors.background }}
      >
        <LinearGradient
          colors={Gradients.background}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <Text
          style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
          className="text-lg"
        >
          Entry not found
        </Text>
      </View>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (timeFormat === '24h') {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <LinearGradient
        colors={Gradients.background}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5"
        style={{ paddingTop: insets.top + 12, paddingBottom: 16 }}
      >
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <View className="flex-row items-center" style={{ gap: 12 }}>
          {!isEditing && (
            <>
              <Pressable
                onPress={handleEdit}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
              >
                <Edit3 size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={handleDeletePress}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'transparent' }}
              >
                <Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </>
          )}
          {isEditing && (
            <>
              <Pressable
                onPress={handleCancelEdit}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <X size={18} color="#EF4444" strokeWidth={2.5} />
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
              >
                <Save size={18} color="#22C55E" strokeWidth={2.5} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Entry Header */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <Text
            style={{ fontFamily: 'Comfortaa_700Bold', color: '#FFFFFF' }}
            className="text-2xl mb-2"
          >
            {entry.title}
          </Text>
          <Text
            style={{ fontFamily: 'Comfortaa_400Regular', color: 'rgba(255, 255, 255, 0.8)' }}
            className="text-sm mb-4"
          >
            {formatDate(entry.createdAt)}
          </Text>

          {/* Meta Info */}
          <View className="flex-row items-center mb-2" style={{ gap: 16 }}>
            <View className="flex-row items-center">
              <Calendar size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
                className="text-sm ml-2"
              >
                {formatTime(entry.createdAt)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Clock size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
                className="text-sm ml-2"
              >
                {formatShortDuration(entry.duration)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Activity size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
                className="text-sm ml-2"
              >
                {entry.emotionIntensity}%
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* AI Reflection (TTS) - shown when available from OpenRouter */}
        {entry.aiReflection && entry.aiReflection.trim().length > 0 && (
          <Animated.View entering={FadeInDown.delay(150).duration(600)} className="mb-6">
            <Pressable
              onPress={() => toggleSection('reflection')}
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Volume2 size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                      className="text-base ml-2"
                    >
                      AI Reflection
                    </Text>
                    <View
                      className="ml-2 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    >
                      <Text style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF', fontSize: 9 }}>
                        OPENROUTER
                      </Text>
                    </View>
                  </View>
                  {expandedSection === 'reflection' ? (
                    <ChevronUp size={20} color="#FFFFFF" strokeWidth={2} />
                  ) : (
                    <ChevronDown size={20} color="#FFFFFF" strokeWidth={2} />
                  )}
                </View>

                {expandedSection === 'reflection' && (
                  <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    <Text
                      style={{
                        fontFamily: 'Comfortaa_400Regular',
                        lineHeight: 24,
                        color: 'rgba(255, 255, 255, 0.95)',
                        marginBottom: 16,
                      }}
                      className="text-sm"
                    >
                      {entry.aiReflection}
                    </Text>

                    {/* TTS Play/Stop Button */}
                    <Pressable
                      onPress={handleToggleSpeech}
                      className="flex-row items-center justify-center rounded-2xl py-3 px-5"
                      style={{
                        backgroundColor: isSpeaking
                          ? 'rgba(239, 68, 68, 0.25)'
                          : 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        borderColor: isSpeaking
                          ? 'rgba(239, 68, 68, 0.5)'
                          : 'rgba(255, 255, 255, 0.3)',
                      }}
                    >
                      {isSpeaking ? (
                        <Square size={16} color="#FFFFFF" strokeWidth={2} />
                      ) : (
                        <Play size={16} color="#FFFFFF" strokeWidth={2} />
                      )}
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_600SemiBold',
                          color: '#FFFFFF',
                          fontSize: 13,
                          marginLeft: 8,
                        }}
                      >
                        {isSpeaking ? 'Stop Reading' : 'Listen to Reflection'}
                      </Text>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Conversation Prompt */}
        {entry.conversationPrompt && (
          <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mb-6">
            <View
              className="rounded-2xl p-4"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <View className="flex-row items-center mb-2">
                <MessageSquare size={16} color="rgba(255, 255, 255, 0.8)" strokeWidth={2} />
                <Text
                  style={{
                    fontFamily: 'Comfortaa_600SemiBold',
                    color: 'rgba(255, 255, 255, 0.8)',
                  }}
                  className="text-xs uppercase ml-2"
                >
                  Conversation Starter
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  color: '#FFFFFF',
                  lineHeight: 22,
                }}
                className="text-sm italic"
              >
                "{entry.conversationPrompt}"
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Transcript */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <View
            className="rounded-3xl overflow-hidden mb-6"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <View className="p-5">
              <Text
                style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                className="text-base mb-3"
              >
                Full Transcript
              </Text>
              {isEditing ? (
                <TextInput
                  value={editedTranscript}
                  onChangeText={setEditedTranscript}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                  style={{
                    fontFamily: 'Comfortaa_400Regular',
                    fontSize: 14,
                    lineHeight: 24,
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                    padding: 12,
                    minHeight: 200,
                  }}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Comfortaa_400Regular',
                    lineHeight: 24,
                    color: 'rgba(255, 255, 255, 0.95)',
                  }}
                  className="text-sm"
                >
                  {entry.transcript}
                </Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Audio Playback */}
        {entry.audioUri && (
          <Animated.View entering={FadeInDown.delay(350).duration(600)} className="mb-6">
            <View
              className="rounded-3xl overflow-hidden"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <View className="p-5">
                <Text
                  style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                  className="text-base mb-4"
                >
                  Recording
                </Text>
                <AudioPlayer
                  audioUri={entry.audioUri}
                  primaryColor={Colors.primary}
                  isDarkMode={isDarkMode}
                  compact={false}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* Emotion Breakdown - Collapsible */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Pressable
            onPress={() => toggleSection('emotions')}
            className="rounded-3xl overflow-hidden mb-6"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <View className="p-5">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <BarChart2 size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                    className="text-base ml-2"
                  >
                    Emotion Breakdown
                  </Text>
                  {entry.emotionScores && (
                    <View
                      className="ml-2 px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    >
                      <Text style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF', fontSize: 9 }}>
                        TOP 4
                      </Text>
                    </View>
                  )}
                </View>
                {expandedSection === 'emotions' ? (
                  <ChevronUp size={20} color="#FFFFFF" strokeWidth={2} />
                ) : (
                  <ChevronDown size={20} color="#FFFFFF" strokeWidth={2} />
                )}
              </View>

              {expandedSection === 'emotions' && (
                <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                  {entry.emotionScores ? (
                    /* Top 4 emotions by score — Plutchik intensity labels */
                    <View style={{ gap: 10 }} onLayout={onBarContainerLayout}>
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_600SemiBold',
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: 10,
                          textTransform: 'uppercase',
                          letterSpacing: 0.8,
                          marginBottom: 4,
                        }}
                      >
                        Top Emotions — Plutchik Intensity
                      </Text>
                      {ALL_EMOTIONS
                        .map((emotion) => ({ emotion, score: entry.emotionScores![emotion] ?? 0 }))
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 4)
                        .map(({ emotion, score }, rank) => {
                          const isPrimary = emotion === entry.primaryEmotion;
                          const barWidth = barContainerWidth > 0 ? (score / 100) * barContainerWidth : 0;
                          // Prefer user override, then saved AI label, then compute from score
                          const intensityLabel =
                            entry.userOverrideLabels?.[emotion] ??
                            entry.emotionIntensityLabels?.[emotion] ??
                            getEmotionSubLabel(emotion, score);
                          const subLabelMatchesBase =
                            intensityLabel.toLowerCase() === emotion.toLowerCase();
                          // Opacity steps: 1 → 0.75 → 0.55 → 0.4 for visual hierarchy
                          const barOpacity = [1, 0.75, 0.55, 0.4][rank];
                          return (
                            <View key={emotion}>
                              <View className="flex-row items-center justify-between mb-1">
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View>
                                    <Text
                                      style={{
                                        fontFamily: isPrimary ? 'Comfortaa_600SemiBold' : 'Comfortaa_400Regular',
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                      }}
                                    >
                                      {intensityLabel}
                                    </Text>
                                    {!subLabelMatchesBase && (
                                      <Text
                                        style={{
                                          fontFamily: 'Comfortaa_400Regular',
                                          color: 'rgba(255,255,255,0.4)',
                                          fontSize: 9,
                                          textTransform: 'uppercase',
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        {emotion}
                                      </Text>
                                    )}
                                  </View>
                                  {isPrimary && (
                                    <View
                                      className="ml-2 px-2 py-0.5 rounded-full"
                                      style={{ backgroundColor: `${Colors.primary}40` }}
                                    >
                                      <Text style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF', fontSize: 9 }}>
                                        PRIMARY
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontFamily: 'Comfortaa_700Bold',
                                    color: 'rgba(255,255,255,0.8)',
                                    fontSize: 13,
                                  }}
                                >
                                  {score}
                                </Text>
                              </View>
                              <View
                                className="h-2 rounded-full"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                              >
                                <View
                                  className="h-full rounded-full"
                                  style={{
                                    width: barWidth,
                                    backgroundColor: Colors.primary,
                                    opacity: barOpacity,
                                  }}
                                />
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  ) : (
                    /* Fallback: detected emotions only */
                    <View onLayout={onBarContainerLayout}>
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_600SemiBold',
                          color: 'rgba(255, 255, 255, 0.8)',
                        }}
                        className="text-xs uppercase mb-3"
                      >
                        Detected Emotions
                      </Text>
                      <View style={{ gap: 10 }}>
                        {entry.emotions.map((emotion, index) => {
                          const isPrimary = emotion === entry.primaryEmotion;
                          const intensity = isPrimary
                            ? entry.emotionIntensity
                            : Math.round(entry.emotionIntensity * (0.7 - index * 0.1));
                          const barWidth = barContainerWidth > 0 ? (intensity / 100) * barContainerWidth : 0;
                          // Prefer user override, then saved AI label, then compute
                          const subLabel = entry.userOverrideLabels?.[emotion]
                            ?? entry.emotionIntensityLabels?.[emotion]
                            ?? getEmotionSubLabel(emotion, intensity);
                          const subLabelMatchesBase =
                            subLabel.toLowerCase() === emotion.toLowerCase();

                          return (
                            <View key={emotion}>
                              <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center flex-1 mr-2">
                                  <View>
                                    <Text
                                      style={{
                                        fontFamily: isPrimary ? 'Comfortaa_600SemiBold' : 'Comfortaa_400Regular',
                                        color: '#FFFFFF',
                                        fontSize: 13,
                                      }}
                                    >
                                      {subLabel}
                                    </Text>
                                    {!subLabelMatchesBase && (
                                      <Text
                                        style={{
                                          fontFamily: 'Comfortaa_400Regular',
                                          color: 'rgba(255,255,255,0.4)',
                                          fontSize: 9,
                                          textTransform: 'uppercase',
                                          letterSpacing: 0.5,
                                        }}
                                      >
                                        {emotion}
                                      </Text>
                                    )}
                                  </View>
                                  {isPrimary && (
                                    <View
                                      className="ml-2 px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontFamily: 'Comfortaa_600SemiBold',
                                          color: '#FFFFFF',
                                          fontSize: 9,
                                        }}
                                      >
                                        PRIMARY
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={{
                                    fontFamily: 'Comfortaa_700Bold',
                                    color: '#FFFFFF',
                                    fontSize: 13,
                                  }}
                                >
                                  {intensity}%
                                </Text>
                              </View>
                              <View
                                className="h-2 rounded-full"
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                              >
                                <View
                                  className="h-full rounded-full"
                                  style={{
                                    width: barWidth,
                                    backgroundColor: Colors.primary,
                                  }}
                                />
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          </Pressable>
        </Animated.View>

        {/* Your Reflection Card — valence/arousal, body sensation, grounding */}
        {(entry.valence !== undefined || entry.arousal !== undefined || entry.bodySensation || entry.groundingUsed) && (
          <Animated.View entering={FadeInDown.delay(450).duration(600)}>
            <View
              className="rounded-3xl overflow-hidden mb-6"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <Heart size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                      className="text-base ml-2"
                    >
                      Your Reflection
                    </Text>
                  </View>
                  {/* User validation chip */}
                  {entry.userValidated ? (
                    <View
                      className="flex-row items-center px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.25)' }}
                    >
                      <CheckCircle2 size={12} color="#22C55E" strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_600SemiBold',
                          color: '#22C55E',
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                      >
                        Confirmed
                      </Text>
                    </View>
                  ) : entry.aiCorrected ? (
                    <View
                      className="flex-row items-center px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(234, 179, 8, 0.25)' }}
                    >
                      <RefreshCw size={12} color="#EAB308" strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_600SemiBold',
                          color: '#EAB308',
                          fontSize: 10,
                          marginLeft: 4,
                        }}
                      >
                        Adjusted
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Valence & Arousal Bars */}
                {(entry.valence !== undefined || entry.arousal !== undefined) && (
                  <View style={{ gap: 12, marginBottom: 16 }}>
                    {/* Valence */}
                    {entry.valence !== undefined && (
                      <View>
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text
                            style={{
                              fontFamily: 'Comfortaa_500Medium',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: 12,
                            }}
                          >
                            Valence
                          </Text>
                          <Text
                            style={{
                              fontFamily: 'Comfortaa_600SemiBold',
                              color: '#FFFFFF',
                              fontSize: 12,
                            }}
                          >
                            {entry.valence > 0 ? '+' : ''}{entry.valence}
                          </Text>
                        </View>
                        <View
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.abs(entry.valence)}%`,
                              backgroundColor: entry.valence >= 0 ? '#22C55E' : '#EF4444',
                              marginLeft: entry.valence < 0 ? `${100 - Math.abs(entry.valence)}%` : 0,
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text style={{ fontFamily: 'Comfortaa_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                            Unpleasant
                          </Text>
                          <Text style={{ fontFamily: 'Comfortaa_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                            Pleasant
                          </Text>
                        </View>
                      </View>
                    )}
                    {/* Arousal */}
                    {entry.arousal !== undefined && (
                      <View>
                        <View className="flex-row items-center justify-between mb-1.5">
                          <Text
                            style={{
                              fontFamily: 'Comfortaa_500Medium',
                              color: 'rgba(255, 255, 255, 0.8)',
                              fontSize: 12,
                            }}
                          >
                            Arousal
                          </Text>
                          <Text
                            style={{
                              fontFamily: 'Comfortaa_600SemiBold',
                              color: '#FFFFFF',
                              fontSize: 12,
                            }}
                          >
                            {entry.arousal}%
                          </Text>
                        </View>
                        <View
                          className="h-2.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${entry.arousal}%`,
                              backgroundColor: Colors.primary,
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1">
                          <Text style={{ fontFamily: 'Comfortaa_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                            Calm
                          </Text>
                          <Text style={{ fontFamily: 'Comfortaa_400Regular', color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                            Activated
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Body Sensation & Grounding Chips */}
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {entry.bodySensation && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                      }}
                    >
                      <AlertTriangle size={12} color="#FFFFFF" strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_500Medium',
                          color: '#FFFFFF',
                          fontSize: 11,
                          marginLeft: 6,
                          textTransform: 'capitalize',
                        }}
                      >
                        {entry.bodySensation.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  )}
                  {entry.groundingUsed && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor: `${Colors.primary}30`,
                        borderWidth: 1,
                        borderColor: `${Colors.primary}50`,
                      }}
                    >
                      <Wind size={12} color={Colors.primary} strokeWidth={2} />
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_500Medium',
                          color: '#FFFFFF',
                          fontSize: 11,
                          marginLeft: 6,
                        }}
                      >
                        Grounding used
                      </Text>
                    </View>
                  )}
                  {entry.distressLevel && (
                    <View
                      className="flex-row items-center px-3 py-2 rounded-full"
                      style={{
                        backgroundColor:
                          entry.distressLevel === 'high'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : entry.distressLevel === 'moderate'
                            ? 'rgba(234, 179, 8, 0.2)'
                            : 'rgba(34, 197, 94, 0.2)',
                        borderWidth: 1,
                        borderColor:
                          entry.distressLevel === 'high'
                            ? 'rgba(239, 68, 68, 0.4)'
                            : entry.distressLevel === 'moderate'
                            ? 'rgba(234, 179, 8, 0.4)'
                            : 'rgba(34, 197, 94, 0.4)',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Comfortaa_500Medium',
                          color:
                            entry.distressLevel === 'high'
                              ? '#EF4444'
                              : entry.distressLevel === 'moderate'
                              ? '#EAB308'
                              : '#22C55E',
                          fontSize: 11,
                          textTransform: 'capitalize',
                        }}
                      >
                        {entry.distressLevel} distress
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Refine Analysis Button */}
        {!entry.userValidated && (
          <Animated.View entering={FadeInDown.delay(480).duration(600)} className="mb-6">
            <Pressable
              onPress={() => {
                selectHaptic();
                // Route to reflection screen with entry data for re-analysis
                router.push({
                  pathname: '/reflection',
                  params: {
                    entryId: entry.id,
                    transcript: entry.transcript,
                    mode: 'refine',
                  },
                });
              }}
              className="flex-row items-center justify-center rounded-2xl py-3.5 px-5"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
            >
              <RefreshCw size={16} color="#FFFFFF" strokeWidth={2} />
              <Text
                style={{
                  fontFamily: 'Comfortaa_600SemiBold',
                  color: '#FFFFFF',
                  fontSize: 13,
                  marginLeft: 8,
                }}
              >
                Refine Analysis
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* AI Analysis - Collapsible */}
        {entry.aiAnalysis && entry.aiAnalysis.trim().length > 1 && (
          <Animated.View entering={FadeInDown.delay(500).duration(600)}>
            <Pressable
              onPress={() => toggleSection('analysis')}
              className="rounded-3xl overflow-hidden mb-6"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Lightbulb size={18} color="#FFFFFF" strokeWidth={2} />
                    <Text
                      style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                      className="text-base ml-2"
                    >
                      AI Analysis
                    </Text>
                    {entry.aiCorrected && (
                      <View
                        className="ml-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(234, 179, 8, 0.25)' }}
                      >
                        <Text style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#EAB308', fontSize: 9 }}>
                          ADJUSTED
                        </Text>
                      </View>
                    )}
                  </View>
                  {expandedSection === 'analysis' ? (
                    <ChevronUp size={20} color="#FFFFFF" strokeWidth={2} />
                  ) : (
                    <ChevronDown size={20} color="#FFFFFF" strokeWidth={2} />
                  )}
                </View>

                {expandedSection === 'analysis' && (
                  <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                    <Text
                      style={{
                        fontFamily: 'Comfortaa_400Regular',
                        lineHeight: 24,
                        color: 'rgba(255, 255, 255, 0.95)',
                      }}
                      className="text-sm"
                    >
                      {entry.aiAnalysis}
                    </Text>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Topics */}
        {entry.topics && entry.topics.length > 0 && entry.topics.some((t) => t && t.trim().length > 0) && (
          <Animated.View entering={FadeInDown.delay(600).duration(600)}>
            <View
              className="rounded-3xl overflow-hidden mb-6"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <View className="p-5">
                <View className="flex-row items-center mb-3">
                  <Target size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text
                    style={{ fontFamily: 'Comfortaa_600SemiBold', color: '#FFFFFF' }}
                    className="text-base ml-2"
                  >
                    Topics
                  </Text>
                </View>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {entry.topics
                    .filter((t) => t && t.trim().length > 0)
                    .map((topic, index) => (
                      <View
                        key={index}
                        className="px-3 py-2 rounded-full"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.15)',
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.25)',
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Comfortaa_500Medium',
                            color: '#FFFFFF',
                          }}
                          className="text-xs capitalize"
                        >
                          {topic}
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={handleDeleteCancel}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <Animated.View
            entering={FadeIn.duration(200)}
            className="rounded-3xl p-6 w-full max-w-sm"
            style={{
              backgroundColor: isDarkMode ? '#1A1229' : '#FFFFFF',
              ...Shadows.large,
            }}
          >
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <Trash2 size={32} color="#EF4444" strokeWidth={2} />
              </View>
              <Text
                className="text-2xl font-bold mb-2 text-center"
                style={{
                  fontFamily: 'Comfortaa_700Bold',
                  color: isDarkMode ? '#FFFFFF' : '#1A1229',
                }}
              >
                Delete Entry?
              </Text>
              <Text
                className="text-center text-base"
                style={{
                  fontFamily: 'Comfortaa_400Regular',
                  color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(26, 18, 41, 0.7)',
                }}
              >
                This will permanently delete this journal entry. This action cannot be undone.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleDeleteConfirm}
                className="rounded-2xl overflow-hidden"
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 16, alignItems: 'center' }}
                >
                  <Text
                    className="text-white text-base font-bold"
                    style={{ fontFamily: 'Comfortaa_700Bold' }}
                  >
                    Delete Entry
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={handleDeleteCancel}
                className="rounded-2xl py-4 items-center"
                style={{
                  borderWidth: 2,
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : Colors.primary,
                }}
              >
                <Text
                  className="text-base font-bold"
                  style={{
                    fontFamily: 'Comfortaa_700Bold',
                    color: isDarkMode ? '#FFFFFF' : Colors.primary,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
