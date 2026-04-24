/**
 * Deepgram Live Transcription Service
 *
 * Handles real-time audio streaming to Deepgram Nova-3 model
 * for live transcription with interim results.
 */

import Constants from 'expo-constants';

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface DeepgramLiveConfig {
  onTranscript: (result: TranscriptResult) => void;
  onError: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class DeepgramLiveService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private config: DeepgramLiveConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(config: DeepgramLiveConfig) {
    this.config = config;
  }

  /**
   * Connect to Deepgram WebSocket for live streaming
   */
  async connect(): Promise<void> {
    const apiKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_DEEPGRAM_API_KEY ||
                   process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;

    if (!apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    // Deepgram WebSocket URL with Nova-3 configuration
    const url = new URL('wss://api.deepgram.com/v1/listen');

    // Configure Nova-3 with live streaming parameters
    url.searchParams.append('model', 'nova-3');
    url.searchParams.append('language', 'multi'); // Auto-detect language
    url.searchParams.append('encoding', 'linear16'); // PCM format
    url.searchParams.append('sample_rate', '16000');
    url.searchParams.append('channels', '1');
    url.searchParams.append('interim_results', 'true'); // Enable partial transcripts
    url.searchParams.append('punctuate', 'true');
    url.searchParams.append('smart_format', 'true');
    url.searchParams.append('utterance_end_ms', '1000'); // Finalize after 1s silence

    return new Promise((resolve, reject) => {
      try {
        // For React Native, we need to include the API key as a query parameter
        // since WebSocket constructor doesn't support custom headers
        url.searchParams.append('token', apiKey);

        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
          console.log('[Deepgram] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.config.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle transcription results
            if (data.channel?.alternatives?.[0]) {
              const alternative = data.channel.alternatives[0];
              const transcript = alternative.transcript;

              // Only emit non-empty transcripts
              if (transcript && transcript.trim().length > 0) {
                this.config.onTranscript({
                  text: transcript,
                  isFinal: data.is_final === true || data.speech_final === true,
                  confidence: alternative.confidence,
                });
              }
            }
          } catch (error) {
            console.error('[Deepgram] Error parsing message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[Deepgram] WebSocket error:', error);
          this.config.onError(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('[Deepgram] WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.config.onClose?.();

          // Attempt reconnection if not manually closed
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[Deepgram] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
              this.connect().catch((err) => {
                console.error('[Deepgram] Reconnection failed:', err);
              });
            }, 1000 * this.reconnectAttempts);
          }
        };
      } catch (error) {
        console.error('[Deepgram] Connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Send audio data to Deepgram
   * @param audioData Audio buffer (PCM format, 16-bit, 16kHz, mono)
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[Deepgram] Cannot send audio: WebSocket not connected');
      return;
    }

    try {
      this.ws.send(audioData);
    } catch (error) {
      console.error('[Deepgram] Error sending audio:', error);
      this.config.onError(new Error('Failed to send audio data'));
    }
  }

  /**
   * Finalize the transcription and close connection
   */
  async finalize(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Send close frame to finalize transcription
      this.ws.send(JSON.stringify({ type: 'CloseStream' }));

      // Wait a moment for final results
      await new Promise((resolve) => setTimeout(resolve, 500));

      this.disconnect();
    } catch (error) {
      console.error('[Deepgram] Error finalizing:', error);
      this.disconnect();
    }
  }

  /**
   * Disconnect from Deepgram
   */
  disconnect(): void {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Normal closure');
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
