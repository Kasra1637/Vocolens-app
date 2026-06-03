/**
 * Deepgram Real-Time Transcription Service
 *
 * Provides WebSocket-based real-time speech-to-text using Deepgram's streaming API.
 * Falls back to post-recording transcription if streaming fails.
 */

import Constants from 'expo-constants';

export interface DeepgramRealtimeConfig {
  language?: string;
  model?: string;
  punctuate?: boolean;
  smartFormat?: boolean;
  interimResults?: boolean;
  endpointing?: number;
  utteranceEndMs?: number;
}

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export type TranscriptCallback = (result: TranscriptResult) => void;
export type ErrorCallback = (error: Error) => void;
export type ConnectionCallback = () => void;

const DEFAULT_CONFIG: DeepgramRealtimeConfig = {
  language: 'en',
  model: 'nova-2',
  punctuate: true,
  smartFormat: true,
  interimResults: true,
  endpointing: 300,
  utteranceEndMs: 1000,
};

class DeepgramRealtimeService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  // Callbacks
  private onTranscript: TranscriptCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onOpen: ConnectionCallback | null = null;
  private onClose: ConnectionCallback | null = null;

  // Buffer for audio data when connection is being established
  private audioBuffer: ArrayBuffer[] = [];
  private maxBufferSize: number = 50; // Max chunks to buffer

  // Accumulated transcript
  private finalTranscript: string = '';
  private interimTranscript: string = '';

  /**
   * Get the Deepgram API key from environment
   */
  private getApiKey(): string | null {
    const apiKeyRaw =
      Constants.expoConfig?.extra?.EXPO_PUBLIC_DEEPGRAM_API_KEY ||
      Constants.manifest?.extra?.EXPO_PUBLIC_DEEPGRAM_API_KEY ||
      Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_DEEPGRAM_API_KEY ||
      process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ||
      undefined;
    const apiKeyStr = apiKeyRaw == null ? '' : String(apiKeyRaw).trim();
    return (apiKeyStr && apiKeyStr !== 'undefined' && apiKeyStr !== 'null') ? apiKeyStr : null;
  }

  /**
   * Check if Deepgram is configured
   */
  isConfigured(): boolean {
    return Boolean(this.getApiKey());
  }

  /**
   * Check if currently connected
   */
  isStreamConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Build WebSocket URL with query parameters
   */
  private buildWebSocketUrl(config: DeepgramRealtimeConfig): string {
    const baseUrl = 'wss://api.deepgram.com/v1/listen';
    const params = new URLSearchParams();

    params.append('model', config.model || 'nova-2');
    params.append('language', config.language || 'en');
    params.append('punctuate', String(config.punctuate ?? true));
    params.append('smart_format', String(config.smartFormat ?? true));
    params.append('interim_results', String(config.interimResults ?? true));
    params.append('endpointing', String(config.endpointing ?? 300));
    params.append('utterance_end_ms', String(config.utteranceEndMs ?? 1000));
    params.append('encoding', 'linear16');
    params.append('sample_rate', '16000');
    params.append('channels', '1');

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Connect to Deepgram WebSocket
   */
  async connect(
    config: DeepgramRealtimeConfig = {},
    callbacks: {
      onTranscript?: TranscriptCallback;
      onError?: ErrorCallback;
      onOpen?: ConnectionCallback;
      onClose?: ConnectionCallback;
    } = {}
  ): Promise<void> {
    const apiKey = this.getApiKey();

    if (!apiKey) {
      const error = new Error('Deepgram API key not configured. Please add EXPO_PUBLIC_DEEPGRAM_API_KEY in the ENV tab.');
      callbacks.onError?.(error);
      throw error;
    }

    if (this.isConnecting) {
      console.log('[DeepgramRealtime] Connection already in progress');
      return;
    }

    if (this.isConnected) {
      console.log('[DeepgramRealtime] Already connected');
      return;
    }

    this.isConnecting = true;

    // Store callbacks
    this.onTranscript = callbacks.onTranscript || null;
    this.onError = callbacks.onError || null;
    this.onOpen = callbacks.onOpen || null;
    this.onClose = callbacks.onClose || null;

    // Reset state
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.audioBuffer = [];

    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const wsUrl = this.buildWebSocketUrl(mergedConfig);

    console.log('[DeepgramRealtime] Connecting to:', wsUrl);

    return new Promise((resolve, reject) => {
      try {
        // React Native does not support custom WebSocket headers.
        // Deepgram requires the API key in the URL query string for
        // native clients — passing it as a subprotocol silently fails.
        const authedUrl = `${wsUrl}&token=${encodeURIComponent(apiKey)}`;
        this.ws = new WebSocket(authedUrl);

        this.ws.onopen = () => {
          console.log('[DeepgramRealtime] Connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          // Start keep-alive
          this.startKeepAlive();

          // Flush buffered audio
          this.flushBuffer();

          this.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[DeepgramRealtime] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[DeepgramRealtime] WebSocket error:', event);
          const error = new Error('WebSocket connection error');
          this.onError?.(error);

          if (this.isConnecting) {
            this.isConnecting = false;
            reject(error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('[DeepgramRealtime] Connection closed:', event.code, event.reason);
          this.isConnected = false;
          this.isConnecting = false;
          this.stopKeepAlive();

          // Try to reconnect if unexpected closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[DeepgramRealtime] Reconnecting (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => {
              this.connect(mergedConfig, callbacks).catch(() => {});
            }, 1000 * this.reconnectAttempts);
          } else {
            this.onClose?.();
          }
        };

        // Timeout for connection
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.isConnecting = false;
        const err = error instanceof Error ? error : new Error('Failed to create WebSocket');
        this.onError?.(err);
        reject(err);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    // Handle different message types
    if (data.type === 'Results') {
      const channel = data.channel;
      const alternatives = channel?.alternatives;

      if (alternatives && alternatives.length > 0) {
        const result = alternatives[0];
        const transcript = result.transcript || '';
        const isFinal = data.is_final === true;
        const confidence = result.confidence || 0;

        if (transcript.trim().length > 0) {
          if (isFinal) {
            // Add to final transcript
            if (this.finalTranscript.length > 0) {
              this.finalTranscript += ' ';
            }
            this.finalTranscript += transcript;
            this.interimTranscript = '';
          } else {
            // Update interim transcript
            this.interimTranscript = transcript;
          }

          const transcriptResult: TranscriptResult = {
            transcript: isFinal ? this.finalTranscript : (this.finalTranscript + ' ' + this.interimTranscript).trim(),
            isFinal,
            confidence,
            words: result.words,
          };

          this.onTranscript?.(transcriptResult);
        }
      }
    } else if (data.type === 'UtteranceEnd') {
      // Utterance ended - emit current state
      const transcriptResult: TranscriptResult = {
        transcript: (this.finalTranscript + ' ' + this.interimTranscript).trim(),
        isFinal: true,
        confidence: 1,
      };
      this.onTranscript?.(transcriptResult);
    } else if (data.type === 'Metadata') {
      console.log('[DeepgramRealtime] Metadata:', data);
    } else if (data.type === 'Error') {
      console.error('[DeepgramRealtime] Server error:', data);
      this.onError?.(new Error(data.description || 'Unknown server error'));
    }
  }

  /**
   * Send audio data to Deepgram
   * @param audioData - Raw PCM audio data (Int16Array or ArrayBuffer)
   */
  sendAudio(audioData: ArrayBuffer | Int16Array): void {
    const buffer = audioData instanceof Int16Array ? (audioData.buffer as ArrayBuffer) : audioData;

    if (!this.isStreamConnected()) {
      // Buffer audio while connecting
      if (this.audioBuffer.length < this.maxBufferSize) {
        this.audioBuffer.push(buffer);
      }
      return;
    }

    try {
      this.ws?.send(buffer);
    } catch (error) {
      console.error('[DeepgramRealtime] Failed to send audio:', error);
    }
  }

  /**
   * Flush buffered audio data
   */
  private flushBuffer(): void {
    console.log(`[DeepgramRealtime] Flushing ${this.audioBuffer.length} buffered chunks`);

    for (const chunk of this.audioBuffer) {
      try {
        this.ws?.send(chunk);
      } catch (error) {
        console.error('[DeepgramRealtime] Failed to send buffered chunk:', error);
      }
    }

    this.audioBuffer = [];
  }

  /**
   * Start keep-alive interval
   */
  private startKeepAlive(): void {
    this.stopKeepAlive();

    // Send keep-alive every 8 seconds
    this.keepAliveInterval = setInterval(() => {
      if (this.isStreamConnected()) {
        try {
          this.ws?.send(JSON.stringify({ type: 'KeepAlive' }));
        } catch (error) {
          console.error('[DeepgramRealtime] Keep-alive failed:', error);
        }
      }
    }, 8000);
  }

  /**
   * Stop keep-alive interval
   */
  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Get the final accumulated transcript
   */
  getFinalTranscript(): string {
    return (this.finalTranscript + ' ' + this.interimTranscript).trim();
  }

  /**
   * Close the WebSocket connection
   */
  async disconnect(): Promise<string> {
    console.log('[DeepgramRealtime] Disconnecting...');

    this.stopKeepAlive();

    // Get final transcript before closing
    const transcript = this.getFinalTranscript();

    if (this.ws) {
      // Send close frame
      try {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      } catch (error) {
        // Ignore send errors during close
      }

      // Close connection
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.audioBuffer = [];

    return transcript;
  }

  /**
   * Reset the service state without disconnecting
   */
  reset(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.audioBuffer = [];
  }
}

// Export singleton instance
export const deepgramRealtimeService = new DeepgramRealtimeService();

// Export class for testing
export { DeepgramRealtimeService };
