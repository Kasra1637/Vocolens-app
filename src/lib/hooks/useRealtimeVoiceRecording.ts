/**
 * useRealtimeVoiceRecording Hook
 *
 * Enhanced voice recording hook with real-time transcription support via Deepgram WebSocket.
 * Uses Web Audio API on web platforms for true real-time audio streaming.
 * Falls back to post-recording transcription if real-time streaming fails.
 *
 * Features:
 * - Real-time speech-to-text as user speaks (web platform)
 * - Automatic fallback to post-recording transcription
 * - Seamless permission handling
 * - Network resilience and reconnection
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { PermissionStatus } from 'expo-modules-core';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import {
  deepgramRealtimeService,
  TranscriptResult,
} from '../services/deepgram-realtime-service';
import { webAudioStreamingService } from '../services/web-audio-streaming-service';
import { transcribeAudioFile } from '../deepgram-transcription-service';
import useOnboardingStore from '../state/onboarding-store';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export interface AudioPermissionResult {
  status: PermissionState;
  canAskAgain: boolean;
}

export interface RealtimeVoiceRecordingState {
  // Permission state
  permissionStatus: PermissionState;
  canAskAgain: boolean;

  // Recording state
  isRecording: boolean;
  isPaused: boolean;
  isTranscribing: boolean;
  isStreaming: boolean;

  // Transcript state
  transcript: string;
  interimTranscript: string;
  isFinal: boolean;

  // Error state
  error: string | null;

  // Streaming mode
  streamingMode: 'realtime' | 'post-recording' | 'none';
}

export interface RealtimeVoiceRecordingActions {
  // Permission actions
  requestPermission: () => Promise<AudioPermissionResult>;
  openSettings: () => Promise<void>;

  // Recording actions
  startRecording: () => Promise<void>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  cancelRecording: () => Promise<void>;

  // Utility
  reset: () => void;
  getRecordingUri: () => string | null;
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

export function useRealtimeVoiceRecording(): [
  RealtimeVoiceRecordingState,
  RealtimeVoiceRecordingActions
] {
  const language = useOnboardingStore((s) => s.selectedTranscriptionLanguage);

  // State
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMode, setStreamingMode] = useState<'realtime' | 'post-recording' | 'none'>('none');

  // Refs
  const recordingRef = useRef<Audio.Recording | null>(null);
  const streamingFailedRef = useRef(false);
  const recordingUriRef = useRef<string | null>(null);
  const isWebStreamingRef = useRef(false);

  // Check initial permission status on mount
  useEffect(() => {
    const checkInitialPermission = async () => {
      try {
        const { status, canAskAgain: canAsk } = await Audio.getPermissionsAsync();
        setPermissionStatus(mapPermissionStatus(status));
        setCanAskAgain(canAsk);
      } catch (err) {
        console.error('[useRealtimeVoiceRecording] Initial permission check failed:', err);
      }
    };

    checkInitialPermission();

    // Cleanup on unmount
    return () => {
      if (recordingRef.current) {
        // Only unload if the recording is still active
        recordingRef.current.stopAndUnloadAsync().catch((err) => {
          // Silently ignore if already unloaded
          if (!err.message?.includes('already been unloaded')) {
            console.warn('[useRealtimeVoiceRecording] Cleanup unload error:', err);
          }
        });
      }
      // Stop web audio streaming
      if (isWebStreamingRef.current) {
        webAudioStreamingService.stop();
      }
      deepgramRealtimeService.disconnect().catch(() => {});
    };
  }, []);

  /**
   * Handle transcript updates from Deepgram
   */
  const handleTranscriptUpdate = useCallback((result: TranscriptResult) => {
    console.log('[useRealtimeVoiceRecording] Transcript update:', result.transcript.slice(0, 50), '... isFinal:', result.isFinal);

    if (result.isFinal) {
      setTranscript(result.transcript);
      setInterimTranscript('');
      setIsFinal(true);
    } else {
      // Show interim results as they come in
      setTranscript(result.transcript);
      setIsFinal(false);
    }
  }, []);

  /**
   * Handle streaming errors
   */
  const handleStreamingError = useCallback((err: Error) => {
    console.error('[useRealtimeVoiceRecording] Streaming error:', err);
    streamingFailedRef.current = true;
    setIsStreaming(false);
    setStreamingMode('post-recording');
    // Don't set error - we'll fallback to post-recording
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
   * Start recording with real-time transcription
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      streamingFailedRef.current = false;
      recordingUriRef.current = null;
      isWebStreamingRef.current = false;

      // Request permission first
      const permission = await requestPermission();
      if (permission.status !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false,
        shouldDuckAndroid: false,
        staysActiveInBackground: false,
      });

      // Try to connect to Deepgram for real-time streaming
      // ─── Native (iOS/Android) cannot stream PCM audio to Deepgram ──────────
      // expo-av's Audio.Recording does not expose raw PCM chunks while
      // recording — only the final file once stopAndUnloadAsync() is called.
      // Therefore, on native we DO NOT open the Deepgram realtime WebSocket
      // at all (it would just sit idle with no audio and time out, while the
      // UI misleadingly shows "Live Transcription"). Native uses post-recording
      // transcription via the REST API — fast, reliable, and accurate.
      // True word-by-word native streaming would require a different audio
      // capture library (e.g. react-native-live-audio-stream) and a new build.
      let streamingConnected = false;
      const isWeb = Platform.OS === 'web';
      const canUseWebAudioStreaming = isWeb && webAudioStreamingService.isAvailable();

      if (deepgramRealtimeService.isConfigured() && canUseWebAudioStreaming) {
        try {
          console.log('[useRealtimeVoiceRecording] Connecting to Deepgram realtime (web)...');
          await deepgramRealtimeService.connect(
            {
              language,
              model: 'nova-2',
              punctuate: true,
              smartFormat: true,
              interimResults: true,
            },
            {
              onTranscript: handleTranscriptUpdate,
              onError: handleStreamingError,
              onOpen: () => {
                console.log('[useRealtimeVoiceRecording] Deepgram connected');
                setIsStreaming(true);
                setStreamingMode('realtime');
              },
              onClose: () => {
                console.log('[useRealtimeVoiceRecording] Deepgram disconnected');
                setIsStreaming(false);
              },
            }
          );
          streamingConnected = true;
        } catch (streamErr) {
          console.warn('[useRealtimeVoiceRecording] Real-time streaming unavailable:', streamErr);
          streamingFailedRef.current = true;
          setStreamingMode('post-recording');
        }
      } else {
        // Native (or web with no MediaRecorder support) — use post-recording mode
        setStreamingMode('post-recording');
      }

      // If on web and streaming is connected, use Web Audio API for real-time streaming
      if (streamingConnected && canUseWebAudioStreaming) {
        console.log('[useRealtimeVoiceRecording] Starting Web Audio streaming for real-time transcription...');

        try {
          await webAudioStreamingService.start(
            {
              sampleRate: 16000,
              channels: 1,
              bufferSize: 4096,
            },
            {
              onAudioData: (audioData) => {
                // Send audio data to Deepgram
                deepgramRealtimeService.sendAudio(audioData);
              },
              onError: (err) => {
                console.error('[useRealtimeVoiceRecording] Web Audio error:', err);
                handleStreamingError(err);
              },
              onStart: () => {
                console.log('[useRealtimeVoiceRecording] Web Audio streaming started');
              },
              onStop: () => {
                console.log('[useRealtimeVoiceRecording] Web Audio streaming stopped');
              },
            }
          );
          isWebStreamingRef.current = true;
        } catch (webAudioErr) {
          console.warn('[useRealtimeVoiceRecording] Web Audio streaming failed:', webAudioErr);
          // Continue with file-based recording as fallback
        }
      }

      // Create recording with optimal settings (for file backup and non-web platforms)
      // Android: Use MPEG_4 / AAC — AndroidOutputFormat.DEFAULT produces an undocumented
      // container on many devices (often AMR or 3GP) which Deepgram rejects.
      // MPEG_4 + AAC is universally supported and Deepgram accepts audio/mp4.
      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus',
          bitsPerSecond: 256000,
        },
      };

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setIsPaused(false);
      setTranscript('');
      setInterimTranscript('');
      setIsFinal(false);

      console.log('[useRealtimeVoiceRecording] Recording started, streaming:', streamingConnected, 'webAudio:', isWebStreamingRef.current);
    } catch (err) {
      console.error('[useRealtimeVoiceRecording] Start recording failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      setIsRecording(false);
      setIsStreaming(false);
      throw err;
    }
  }, [requestPermission, handleTranscriptUpdate, handleStreamingError]);

  /**
   * Stop recording and get final transcript
   */
  const stopRecording = useCallback(async (): Promise<string> => {
    if (!recordingRef.current || !isRecording) {
      console.warn('[useRealtimeVoiceRecording] Not recording');
      return transcript;
    }

    try {
      console.log('[useRealtimeVoiceRecording] Stopping recording...');
      setIsRecording(false);
      setIsTranscribing(true);

      // Stop web audio streaming first
      if (isWebStreamingRef.current) {
        webAudioStreamingService.stop();
        isWebStreamingRef.current = false;
      }

      // Stop Deepgram streaming and get transcript
      let streamingTranscript = '';
      if (isStreaming) {
        try {
          streamingTranscript = await deepgramRealtimeService.disconnect();
          console.log('[useRealtimeVoiceRecording] Streaming transcript:', streamingTranscript.slice(0, 100));
        } catch (err) {
          console.warn('[useRealtimeVoiceRecording] Failed to get streaming transcript:', err);
        }
        setIsStreaming(false);
      }

      // Stop recording and get URI
      await recordingRef.current.stopAndUnloadAsync();
      const rawUri = recordingRef.current.getURI();
      recordingRef.current = null;

      // On Android, the file may not be flushed to disk immediately after
      // stopAndUnloadAsync resolves. Poll for up to 3 seconds before giving up.
      // NOTE: Use the legacy subpath — `expo-file-system/legacy` is the only
      // export that still ships `getInfoAsync` in v55+. The previous code
      // destructured `{ FileSystem }` from a default import, which is undefined
      // and silently failed the wait loop on every Android device.
      let uri = rawUri;
      if (uri && Platform.OS === 'android') {
        const FileSystem = await import('expo-file-system/legacy');
        let waited = 0;
        while (waited < 3000) {
          const info = await FileSystem.getInfoAsync(uri);
          if (info.exists && (info as any).size > 0) break;
          await new Promise((r) => setTimeout(r, 200));
          waited += 200;
        }
      }

      recordingUriRef.current = uri;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      console.log('[useRealtimeVoiceRecording] Recording stopped, URI:', uri);

      // Determine final transcript
      let finalTranscript = streamingTranscript;

      // If streaming failed or didn't produce results, use post-recording transcription
      if ((!finalTranscript || finalTranscript.trim().length === 0) && uri) {
        console.log('[useRealtimeVoiceRecording] Using post-recording transcription...');
        setStreamingMode('post-recording');

        try {
          const result = await transcribeAudioFile(uri, language);
          finalTranscript = result.transcript;
          console.log('[useRealtimeVoiceRecording] Post-recording transcript:', finalTranscript.slice(0, 100));
        } catch (transcribeErr) {
          console.error('[useRealtimeVoiceRecording] Post-recording transcription failed:', transcribeErr);
          setError(
            transcribeErr instanceof Error ? transcribeErr.message : 'Transcription failed'
          );
        }
      }

      setTranscript(finalTranscript);
      setIsFinal(true);
      setIsPaused(false);
      setIsTranscribing(false);

      return finalTranscript;
    } catch (err) {
      console.error('[useRealtimeVoiceRecording] Stop recording failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);
      setIsRecording(false);
      setIsTranscribing(false);
      setIsStreaming(false);
      throw err;
    }
  }, [isRecording, isStreaming, transcript]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!recordingRef.current) {
      return;
    }

    try {
      console.log('[useRealtimeVoiceRecording] Cancelling recording...');

      // Stop web audio streaming
      if (isWebStreamingRef.current) {
        webAudioStreamingService.stop();
        isWebStreamingRef.current = false;
      }

      // Disconnect streaming
      if (isStreaming) {
        await deepgramRealtimeService.disconnect();
        setIsStreaming(false);
      }

      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      setIsRecording(false);
      setIsPaused(false);
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      setStreamingMode('none');

      console.log('[useRealtimeVoiceRecording] Recording cancelled');
    } catch (err) {
      console.error('[useRealtimeVoiceRecording] Cancel recording failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel recording');
    }
  }, [isStreaming]);

  /**
   * Pause an active recording
   */
  const pauseRecording = useCallback(async (): Promise<void> => {
    if (!recordingRef.current || !isRecording) return;
    try {
      await recordingRef.current.pauseAsync();
      setIsPaused(true);
      console.log('[useRealtimeVoiceRecording] Recording paused');
    } catch (err) {
      console.error('[useRealtimeVoiceRecording] Pause failed:', err);
      throw err;
    }
  }, [isRecording]);

  /**
   * Resume a paused recording
   */
  const resumeRecording = useCallback(async (): Promise<void> => {
    if (!recordingRef.current || !isRecording) return;
    try {
      await recordingRef.current.startAsync();
      setIsPaused(false);
      console.log('[useRealtimeVoiceRecording] Recording resumed');
    } catch (err) {
      console.error('[useRealtimeVoiceRecording] Resume failed:', err);
      throw err;
    }
  }, [isRecording]);

  /**
   * Reset all state
   */
  const reset = useCallback((): void => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setIsTranscribing(false);
    setIsFinal(false);
    setIsPaused(false);
    setStreamingMode('none');
    deepgramRealtimeService.reset();
  }, []);

  /**
   * Get the recording URI
   */
  const getRecordingUri = useCallback((): string | null => {
    return recordingUriRef.current;
  }, []);

  // Return state and actions
  const state: RealtimeVoiceRecordingState = {
    permissionStatus,
    canAskAgain,
    isRecording,
    isPaused,
    isTranscribing,
    isStreaming,
    transcript,
    interimTranscript,
    isFinal,
    error,
    streamingMode,
  };

  const actions: RealtimeVoiceRecordingActions = {
    requestPermission,
    openSettings,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    reset,
    getRecordingUri,
  };

  return [state, actions];
}
