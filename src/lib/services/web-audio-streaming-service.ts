/**
 * Web Audio Streaming Service
 *
 * Captures real-time audio from the microphone using Web Audio API
 * and streams it for live transcription.
 *
 * This service is specifically for web platforms where we need
 * raw PCM audio data for real-time streaming to Deepgram.
 */

import { Platform } from 'react-native';

export type AudioDataCallback = (audioData: Int16Array) => void;
export type AudioErrorCallback = (error: Error) => void;
export type AudioStateCallback = () => void;

interface WebAudioStreamingConfig {
  sampleRate?: number;
  channels?: number;
  bufferSize?: number;
}

const DEFAULT_CONFIG: WebAudioStreamingConfig = {
  sampleRate: 16000,
  channels: 1,
  bufferSize: 4096,
};

class WebAudioStreamingService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isStreaming: boolean = false;

  // Callbacks
  private onAudioData: AudioDataCallback | null = null;
  private onError: AudioErrorCallback | null = null;
  private onStart: AudioStateCallback | null = null;
  private onStop: AudioStateCallback | null = null;

  /**
   * Check if Web Audio API is available
   */
  isAvailable(): boolean {
    if (Platform.OS !== 'web') {
      return false;
    }

    return typeof window !== 'undefined' &&
           (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined');
  }

  /**
   * Check if currently streaming
   */
  isCurrentlyStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[WebAudioStreaming] Web Audio API not available');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('[WebAudioStreaming] Permission denied:', error);
      return false;
    }
  }

  /**
   * Start streaming audio from microphone
   */
  async start(
    config: WebAudioStreamingConfig = {},
    callbacks: {
      onAudioData?: AudioDataCallback;
      onError?: AudioErrorCallback;
      onStart?: AudioStateCallback;
      onStop?: AudioStateCallback;
    } = {}
  ): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Web Audio API not available on this platform');
    }

    if (this.isStreaming) {
      console.warn('[WebAudioStreaming] Already streaming');
      return;
    }

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Store callbacks
    this.onAudioData = callbacks.onAudioData || null;
    this.onError = callbacks.onError || null;
    this.onStart = callbacks.onStart || null;
    this.onStop = callbacks.onStop || null;

    try {
      console.log('[WebAudioStreaming] Starting audio capture...');

      // Get microphone stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: mergedConfig.channels,
          sampleRate: mergedConfig.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({
        sampleRate: mergedConfig.sampleRate,
      });

      // Create source node from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for raw audio access
      // Note: ScriptProcessorNode is deprecated but AudioWorklet requires more setup
      // and has cross-origin restrictions that make it harder to use
      this.processorNode = this.audioContext.createScriptProcessor(
        mergedConfig.bufferSize!,
        mergedConfig.channels!,
        mergedConfig.channels!
      );

      // Handle audio processing
      this.processorNode.onaudioprocess = (event) => {
        if (!this.isStreaming) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array for Deepgram
        const int16Data = this.float32ToInt16(inputData);

        // Send audio data to callback
        this.onAudioData?.(int16Data);
      };

      // Connect nodes
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isStreaming = true;
      this.onStart?.();

      console.log('[WebAudioStreaming] Audio capture started successfully');
    } catch (error) {
      console.error('[WebAudioStreaming] Failed to start:', error);
      this.cleanup();
      const err = error instanceof Error ? error : new Error('Failed to start audio capture');
      this.onError?.(err);
      throw err;
    }
  }

  /**
   * Stop streaming audio
   */
  stop(): void {
    if (!this.isStreaming) {
      return;
    }

    console.log('[WebAudioStreaming] Stopping audio capture...');
    this.cleanup();
    this.onStop?.();
    console.log('[WebAudioStreaming] Audio capture stopped');
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    this.isStreaming = false;

    // Disconnect processor
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode.onaudioprocess = null;
      this.processorNode = null;
    }

    // Disconnect source
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    // Stop media stream tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  /**
   * Convert Float32Array audio data to Int16Array
   * Deepgram expects linear16 PCM audio
   */
  private float32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp the value to [-1, 1]
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      // Convert to 16-bit integer
      int16Array[i] = sample < 0
        ? sample * 0x8000
        : sample * 0x7FFF;
    }

    return int16Array;
  }
}

// Export singleton instance
export const webAudioStreamingService = new WebAudioStreamingService();

// Export class for testing
export { WebAudioStreamingService };
