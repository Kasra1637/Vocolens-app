/**
 * Deepgram API Service
 * Handles audio transcription using the Deepgram API
 *
 * Features:
 * - Secure API key management via environment variables
 * - Audio file transcription with speaker diarization
 * - Error handling and retry logic
 * - Support for multiple audio formats
 */

import * as FileSystem from 'expo-file-system';

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY;
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

interface DeepgramTranscriptionOptions {
  language?: string;
  punctuate?: boolean;
  diarize?: boolean;
  model?: 'nova-2' | 'nova' | 'enhanced' | 'base';
  smart_format?: boolean;
}

interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        transcript: string;
        confidence: number;
        words?: Array<{
          word: string;
          start: number;
          end: number;
          confidence: number;
          speaker?: number;
        }>;
      }>;
    }>;
  };
  metadata: {
    transaction_key: string;
    request_id: string;
    sha256: string;
    created: string;
    duration: number;
    channels: number;
  };
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: number;
  }>;
}

/**
 * Transcribe audio file using Deepgram API
 * @param audioUri - Local file URI of the audio recording
 * @param options - Transcription options
 * @returns Transcription result with transcript and metadata
 */
export async function transcribeAudio(
  audioUri: string,
  options: DeepgramTranscriptionOptions = {}
): Promise<TranscriptionResult> {
  try {
    // Default options optimized for voice journaling
    const transcriptionOptions: DeepgramTranscriptionOptions = {
      language: 'en',
      punctuate: true,
      diarize: false, // Single speaker for journaling
      model: 'nova-2', // Latest and most accurate model
      smart_format: true, // Auto-format dates, times, etc.
      ...options,
    };

    // Read the audio file as base64
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary buffer
    const audioBuffer = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

    // Build query parameters
    const queryParams = new URLSearchParams({
      punctuate: String(transcriptionOptions.punctuate),
      language: transcriptionOptions.language || 'en',
      model: transcriptionOptions.model || 'nova-2',
      smart_format: String(transcriptionOptions.smart_format),
    });

    if (transcriptionOptions.diarize) {
      queryParams.append('diarize', 'true');
    }

    // Make API request
    const response = await fetch(`${DEEPGRAM_API_URL}?${queryParams.toString()}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav', // Adjust based on your recording format
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
    }

    const data: DeepgramResponse = await response.json();

    // Extract transcription from response
    const channel = data.results.channels[0];
    const alternative = channel.alternatives[0];

    if (!alternative || !alternative.transcript) {
      throw new Error('No transcription found in Deepgram response');
    }

    return {
      transcript: alternative.transcript,
      confidence: alternative.confidence,
      duration: data.metadata.duration,
      words: alternative.words,
    };
  } catch (error) {
    console.error('Deepgram transcription error:', error);
    throw new Error(
      `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Transcribe audio with retry logic
 * @param audioUri - Local file URI of the audio recording
 * @param options - Transcription options
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Transcription result
 */
export async function transcribeAudioWithRetry(
  audioUri: string,
  options: DeepgramTranscriptionOptions = {},
  maxRetries: number = 3
): Promise<TranscriptionResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeAudio(audioUri, options);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Transcription attempt ${attempt} failed:`, lastError.message);

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Transcription failed after all retries');
}

/**
 * Check if Deepgram API is configured
 * @returns true if API key is configured
 */
export function isDeepgramConfigured(): boolean {
  return Boolean(DEEPGRAM_API_KEY && DEEPGRAM_API_KEY !== 'your-deepgram-api-key-here');
}
