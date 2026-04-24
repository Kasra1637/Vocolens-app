/**
 * useVoiceRecording Hook
 *
 * Handles voice recording with expo-av and transcription via Deepgram.
 * Since expo-av doesn't support real-time audio streaming, we record first
 * then transcribe the audio file after recording stops.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { PermissionStatus } from 'expo-modules-core';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { transcribeAudioFile, isDeepgramConfigured } from '../deepgram-transcription-service';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface AudioPermissionResult {
  status: PermissionState;
  canAskAgain: boolean;
}

export interface VoiceRecordingState {
  // Permission state
  permissionStatus: PermissionState;
  canAskAgain: boolean;

  // Recording state
  isRecording: boolean;
  isTranscribing: boolean;

  // Transcript state
  transcript: string;

  // Error state
  error: string | null;
}

export interface VoiceRecordingActions {
  // Permission actions
  requestPermission: () => Promise<AudioPermissionResult>;
  openSettings: () => Promise<void>;

  // Recording actions
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  cancelRecording: () => Promise<void>;

  // Utility
  reset: () => void;
}

function mapPermissionStatus(status: PermissionStatus): PermissionState {
  switch (status) {
    case PermissionStatus.GRANTED:
      return 'granted';
    case PermissionStatus.DENIED:
      return 'denied';
    case PermissionStatus.UNDETERMINED:
    default:
      return 'undetermined';
  }
}

export function useVoiceRecording(): [VoiceRecordingState, VoiceRecordingActions] {
  // State
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);

  // Check initial permission status on mount
  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        const { status, canAskAgain: canAsk } = await Audio.getPermissionsAsync();
        setPermissionStatus(mapPermissionStatus(status));
        setCanAskAgain(canAsk);
      } catch (err) {
        console.error('[useVoiceRecording] Initial permission check failed:', err);
      }
    };

    checkInitialPermission();

    // Cleanup on unmount
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<AudioPermissionResult> => {
    try {
      const { status, canAskAgain: canAsk } = await Audio.requestPermissionsAsync();
      const mappedStatus = mapPermissionStatus(status);
      setPermissionStatus(mappedStatus);
      setCanAskAgain(canAsk);
      setError(null);
      return { status: mappedStatus, canAskAgain: canAsk };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Permission request failed';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Open system settings
   */
  const openSettings = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open settings';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Start recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Request permission first
      const permission = await requestPermission();
      if (permission.status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
      });

      // Create recording with optimal settings for Deepgram
      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 128000,
        },
      };

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setTranscript('');

      console.log('[useVoiceRecording] Recording started');
    } catch (err) {
      console.error('[useVoiceRecording] Start recording failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      setIsRecording(false);
      throw err;
    }
  }, [requestPermission]);

  /**
   * Stop recording and transcribe
   */
  const stopRecording = useCallback(async (): Promise<string> => {
    if (!recordingRef.current || !isRecording) {
      console.warn('[useVoiceRecording] Not recording');
      return transcript;
    }

    try {
      console.log('[useVoiceRecording] Stopping recording...');
      setIsRecording(false);
      setIsTranscribing(true);

      // Stop recording and get URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      console.log('[useVoiceRecording] Recording stopped, URI:', uri);

      // Transcribe the audio file
      if (uri) {
        try {
          console.log('[useVoiceRecording] Transcribing audio...');
          const result = await transcribeAudioFile(uri);
          console.log('[useVoiceRecording] Transcription result:', result.transcript);
          setTranscript(result.transcript);
          setIsTranscribing(false);
          return result.transcript;
        } catch (transcribeErr) {
          console.error('[useVoiceRecording] Transcription failed:', transcribeErr);
          setError(
            transcribeErr instanceof Error ? transcribeErr.message : 'Transcription failed'
          );
          setIsTranscribing(false);
          return '';
        }
      }

      setIsTranscribing(false);
      return '';
    } catch (err) {
      console.error('[useVoiceRecording] Stop recording failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      setIsRecording(false);
      setIsTranscribing(false);
      throw err;
    }
  }, [isRecording, transcript]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!recordingRef.current) {
      return;
    }

    try {
      console.log('[useVoiceRecording] Cancelling recording...');

      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setIsRecording(false);
      setTranscript('');
      setError(null);

      console.log('[useVoiceRecording] Recording cancelled');
    } catch (err) {
      console.error('[useVoiceRecording] Cancel recording failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel recording');
    }
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback((): void => {
    setTranscript('');
    setError(null);
    setIsTranscribing(false);
  }, []);

  // Return state and actions
  const state: VoiceRecordingState = {
    permissionStatus,
    canAskAgain,
    isRecording,
    isTranscribing,
    transcript,
    error,
  };

  const actions: VoiceRecordingActions = {
    requestPermission,
    openSettings,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };

  return [state, actions];
}
