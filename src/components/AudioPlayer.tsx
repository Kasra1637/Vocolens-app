/**
 * Audio Player Component
 *
 * Provides playback controls for voice journal recordings
 * with play, pause, and progress tracking functionality.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Play, Pause, ArrowCounterClockwise } from 'phosphor-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { tapHaptic, errorHaptic } from '@/lib/haptics';

interface AudioPlayerProps {
  audioUri: string;
  primaryColor: string;
  isDarkMode?: boolean;
  compact?: boolean;
}

export function AudioPlayer({ audioUri, primaryColor, isDarkMode = false, compact = false }: AudioPlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const playScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, [sound]);

  useEffect(() => {
    if (isPlaying) {
      // Start pulsing animation when playing
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.1, { damping: 10, stiffness: 100 }),
          withSpring(1, { damping: 10, stiffness: 100 })
        ),
        -1,
        false
      );
    } else {
      // Stop animation when paused
      cancelAnimation(pulseScale);
      pulseScale.value = withSpring(1);
    }
  }, [isPlaying]);

  const loadAndPlayAudio = async () => {
    try {
      setIsLoading(true);
      tapHaptic();

      console.log('[AudioPlayer] Loading audio from URI:', audioUri);

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, progressUpdateIntervalMillis: 100 },
        onPlaybackStatusUpdate
      );

      console.log('[AudioPlayer] Audio loaded successfully');
      setSound(newSound);
      setIsPlaying(true);

      // Get duration
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
        console.log('[AudioPlayer] Duration:', status.durationMillis);
      }

      // Start position tracking
      startPositionTracking(newSound);
    } catch (error) {
      console.error('[AudioPlayer] Error loading audio:', error);
      console.error('[AudioPlayer] Audio URI:', audioUri);
      if (error instanceof Error) {
        console.error('[AudioPlayer] Error message:', error.message);
        console.error('[AudioPlayer] Error name:', error.name);
      }
      errorHaptic();
    } finally {
      setIsLoading(false);
    }
  };

  const startPositionTracking = (soundInstance: Audio.Sound) => {
    if (positionInterval.current) {
      clearInterval(positionInterval.current);
    }

    positionInterval.current = setInterval(async () => {
      const status = await soundInstance.getStatusAsync();
      if (status.isLoaded && status.positionMillis !== undefined) {
        setPosition(status.positionMillis);
      }
    }, 100);
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        // Audio finished playing
        setIsPlaying(false);
        setPosition(0);
        if (positionInterval.current) {
          clearInterval(positionInterval.current);
        }
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      if (!sound) {
        // Load and play audio
        await loadAndPlayAudio();
      } else {
        // Toggle play/pause
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            tapHaptic();
            if (positionInterval.current) {
              clearInterval(positionInterval.current);
            }
          } else {
            await sound.playAsync();
            setIsPlaying(true);
            tapHaptic();
            startPositionTracking(sound);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      errorHaptic();
    }
  };

  const handleRestart = async () => {
    try {
      if (sound) {
        tapHaptic();
        await sound.setPositionAsync(0);
        setPosition(0);
        if (!isPlaying) {
          await sound.playAsync();
          setIsPlaying(true);
          startPositionTracking(sound);
        }
      }
    } catch (error) {
      console.error('Error restarting audio:', error);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const playAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  if (compact) {
    // Compact mode - just a play button
    return (
      <Pressable
        onPress={handlePlayPause}
        onPressIn={() => (playScale.value = withSpring(0.9))}
        onPressOut={() => (playScale.value = withSpring(1))}
        disabled={isLoading}
        className="active:opacity-70"
      >
        <Animated.View
          style={[
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: primaryColor,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isLoading ? 0.5 : 1,
            },
            isPlaying ? pulseAnimatedStyle : playAnimatedStyle,
          ]}
        >
          {isPlaying ? (
            <Pause size={20} color="#FFFFFF" fill="#FFFFFF" weight="duotone" />
          ) : (
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" weight="duotone" />
          )}
        </Animated.View>
      </Pressable>
    );
  }

  // Full player mode
  return (
    <View
      className="rounded-2xl p-4"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* Progress Bar */}
      <View className="mb-3">
        <View
          className="h-1.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <Animated.View
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              backgroundColor: primaryColor,
              borderRadius: 999,
            }}
          />
        </View>
        <View className="flex-row justify-between mt-1">
          <Text
            style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255, 255, 255, 0.7)' }}
            className="text-xs"
          >
            {formatTime(position)}
          </Text>
          <Text
            style={{ fontFamily: 'Inter_400Regular', color: 'rgba(255, 255, 255, 0.7)' }}
            className="text-xs"
          >
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-center" style={{ gap: 16 }}>
        {/* Restart Button */}
        <Pressable
          onPress={handleRestart}
          disabled={!sound || isLoading}
          className="active:opacity-70"
          style={{ opacity: sound ? 1 : 0.3 }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
          >
            <ArrowCounterClockwise size={18} color="#FFFFFF" weight="duotone" />
          </View>
        </Pressable>

        {/* Play/Pause Button */}
        <Pressable
          onPress={handlePlayPause}
          onPressIn={() => (playScale.value = withSpring(0.9))}
          onPressOut={() => (playScale.value = withSpring(1))}
          disabled={isLoading}
          className="active:opacity-70"
        >
          <Animated.View
            style={[
              {
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: primaryColor,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: Platform.OS === 'android' ? 0 : 6,
                opacity: isLoading ? 0.5 : 1,
              },
              isPlaying ? pulseAnimatedStyle : playAnimatedStyle,
            ]}
          >
            {isPlaying ? (
              <Pause size={28} color="#FFFFFF" fill="#FFFFFF" weight="duotone" />
            ) : (
              <Play size={28} color="#FFFFFF" fill="#FFFFFF" weight="duotone" style={{ marginLeft: 2 }} />
            )}
          </Animated.View>
        </Pressable>

        {/* Spacer for symmetry */}
        <View style={{ width: 40 }} />
      </View>
    </View>
  );
}
