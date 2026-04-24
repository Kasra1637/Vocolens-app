/**
 * useLiveTranscription Hook
 *
 * Combines real-time audio recording with Deepgram Nova-3 live transcription.
 * Handles permissions, audio streaming, and real-time transcript updates.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { DeepgramLiveService, TranscriptResult } from '../deepgram-live-service';
import { LiveAudioRecorder, PermissionState, AudioPermissionResult } from '../live-audio-recorder';

export interface LiveTranscriptionState {
  // Permission state
  permissionStatus: PermissionState;
  canAskAgain: boolean;

  // Recording state
  isRecording: boolean;
  isConnecting: boolean;

  // Transcription state
  partialTranscript: string;
  finalTranscript: string;
  isTranscribing: boolean;

  // Error state
  error: string | null;
}

export interface LiveTranscriptionActions {
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

export function useLiveTranscription(): [LiveTranscriptionState, LiveTranscriptionActions] {
  // State
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('undetermined');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Services
  const deepgramRef = useRef<DeepgramLiveService | null>(null);
  const audioRecorderRef = useRef<LiveAudioRecorder | null>(null);
  const audioFileUriRef = useRef<string | null>(null);

  // Initialize services on mount
  useEffect(() => {
    // Initialize Deepgram service
    deepgramRef.current = new DeepgramLiveService({
      onTranscript: (result: TranscriptResult) => {
        console.log('[useLiveTranscription] Transcript:', result.text, 'Final:', result.isFinal);

        if (result.isFinal) {
          // Append to final transcript
          setFinalTranscript((prev) => {
            const newText = prev ? `${prev} ${result.text}` : result.text;
            return newText.trim();
          });
          setPartialTranscript(''); // Clear partial
        } else {
          // Update partial transcript
          setPartialTranscript(result.text);
        }

        setIsTranscribing(true);
      },
      onError: (err: Error) => {
        console.error('[useLiveTranscription] Deepgram error:', err);
        setError(err.message);
        setIsTranscribing(false);
      },
      onOpen: () => {
        console.log('[useLiveTranscription] Deepgram connected');
        setIsTranscribing(true);
      },
      onClose: () => {
        console.log('[useLiveTranscription] Deepgram disconnected');
        setIsTranscribing(false);
      },
    });

    // Initialize audio recorder
    audioRecorderRef.current = new LiveAudioRecorder({
      onAudioData: (audioBuffer: ArrayBuffer) => {
        // Send audio data to Deepgram in real-time
        deepgramRef.current?.sendAudio(audioBuffer);
      },
      onError: (err: Error) => {
        console.error('[useLiveTranscription] Audio error:', err);
        setError(err.message);
      },
      sampleRate: 16000,
    });

    // Check initial permission status
    audioRecorderRef.current.checkPermission().then((result: AudioPermissionResult) => {
      setPermissionStatus(result.status);
      setCanAskAgain(result.canAskAgain);
    });

    // Cleanup on unmount
    return () => {
      deepgramRef.current?.disconnect();
      audioRecorderRef.current?.cleanup();
    };
  }, []);

  /**
   * Request microphone permission
   * Must be called before starting recording
   */
  const requestPermission = useCallback(async (): Promise<AudioPermissionResult> => {
    if (!audioRecorderRef.current) {
      throw new Error('Audio recorder not initialized');
    }

    try {
      const result = await audioRecorderRef.current.requestPermission();
      setPermissionStatus(result.status);
      setCanAskAgain(result.canAskAgain);
      setError(null);
      return result;
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
    if (!audioRecorderRef.current) {
      throw new Error('Audio recorder not initialized');
    }

    try {
      await audioRecorderRef.current.openSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open settings';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Start live recording and transcription
   * Requests permission if needed, connects to Deepgram, and starts recording
   */
  const startRecording = useCallback(async (): Promise<void> => {
    if (!audioRecorderRef.current || !deepgramRef.current) {
      throw new Error('Services not initialized');
    }

    try {
      setError(null);
      setIsConnecting(true);

      // Step 1: Request permission (MANDATORY before recording)
      const permission = await requestPermission();

      if (permission.status !== 'granted') {
        setIsConnecting(false);
        throw new Error('Microphone permission denied');
      }

      // Step 2: Connect to Deepgram WebSocket
      console.log('[useLiveTranscription] Connecting to Deepgram...');
      await deepgramRef.current.connect();

      // Step 3: Start audio recording
      console.log('[useLiveTranscription] Starting recording...');
      await audioRecorderRef.current.startRecording();

      setIsRecording(true);
      setIsConnecting(false);
      setFinalTranscript('');
      setPartialTranscript('');

      console.log('[useLiveTranscription] Recording started successfully');
    } catch (err) {
      console.error('[useLiveTranscription] Start recording failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      setIsRecording(false);
      setIsConnecting(false);

      // Clean up on error
      deepgramRef.current?.disconnect();
      await audioRecorderRef.current?.cancelRecording();

      throw err;
    }
  }, [requestPermission]);

  /**
   * Stop recording and finalize transcription
   * Returns the final transcript
   */
  const stopRecording = useCallback(async (): Promise<string> => {
    if (!audioRecorderRef.current || !deepgramRef.current) {
      throw new Error('Services not initialized');
    }

    if (!isRecording) {
      console.warn('[useLiveTranscription] Not recording');
      return finalTranscript;
    }

    try {
      console.log('[useLiveTranscription] Stopping recording...');

      // Step 1: Stop audio recording and get file URI
      const audioUri = await audioRecorderRef.current.stopRecording();
      audioFileUriRef.current = audioUri;

      // Step 2: Finalize Deepgram transcription
      await deepgramRef.current.finalize();

      setIsRecording(false);

      // Wait a moment for any final transcript updates
      await new Promise((resolve) => setTimeout(resolve, 500));

      const complete = finalTranscript.trim();
      console.log('[useLiveTranscription] Recording stopped, final transcript:', complete);

      return complete;
    } catch (err) {
      console.error('[useLiveTranscription] Stop recording failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(message);

      setIsRecording(false);
      deepgramRef.current?.disconnect();

      throw err;
    }
  }, [isRecording, finalTranscript]);

  /**
   * Cancel recording without saving
   */
  const cancelRecording = useCallback(async (): Promise<void> => {
    if (!audioRecorderRef.current || !deepgramRef.current) {
      return;
    }

    try {
      console.log('[useLiveTranscription] Cancelling recording...');

      await audioRecorderRef.current.cancelRecording();
      deepgramRef.current.disconnect();

      setIsRecording(false);
      setFinalTranscript('');
      setPartialTranscript('');
      setError(null);

      console.log('[useLiveTranscription] Recording cancelled');
    } catch (err) {
      console.error('[useLiveTranscription] Cancel recording failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel recording');
    }
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback((): void => {
    setFinalTranscript('');
    setPartialTranscript('');
    setError(null);
    setIsTranscribing(false);
    audioFileUriRef.current = null;
  }, []);

  // Return state and actions
  const state: LiveTranscriptionState = {
    permissionStatus,
    canAskAgain,
    isRecording,
    isConnecting,
    partialTranscript,
    finalTranscript,
    isTranscribing,
    error,
  };

  const actions: LiveTranscriptionActions = {
    requestPermission,
    openSettings,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };

  return [state, actions];
}
