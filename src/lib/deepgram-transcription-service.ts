/**
 * Deepgram Transcription Service
 *
 * Transcribes audio files using Deepgram Nova-2 model.
 * Since expo-av doesn't support real-time audio streaming,
 * we transcribe the completed audio file after recording stops.
 *
 * Supports both native (iOS/Android) and web platforms.
 */

// expo-file-system v55 removed `EncodingType` and `readAsStringAsync` from
// the top-level export. The legacy subpath retains the v53 API surface that
// this codebase relies on (and crashes without — `EncodingType.Base64` is
// undefined on the new top-level export, which is the real cause of the
// "cannot read property base64 of undefined" runtime error).
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

/**
 * Fetch audio as blob for web platform
 * @param audioUri - URI of the audio file (blob URL or data URL)
 */
async function fetchAudioAsBlob(audioUri: string): Promise<Blob> {
  const response = await fetch(audioUri);
  return response.blob();
}

/**
 * Convert blob to ArrayBuffer
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Transcribe an audio file using Deepgram API
 * @param audioUri - Local file URI of the audio file
 * @returns Transcription result
 */
export async function transcribeAudioFile(audioUri: string | null | undefined, language: string = 'en'): Promise<TranscriptionResult> {
  // Guard: audioUri must be a non-empty string before we attempt any file I/O.
  // On Android, Recording.getURI() can return null if the file was not flushed
  // to disk yet — passing that null to FileSystem.readAsStringAsync is what
  // causes the "cannot read base64 of undefined" crash.
  if (!audioUri || typeof audioUri !== 'string' || audioUri.trim().length === 0) {
    console.error('[Deepgram] transcribeAudioFile called with empty/null URI');
    throw new Error('Audio file URI is missing. The recording may not have saved correctly — please try again.');
  }

  // In Expo SDK 55, EXPO_PUBLIC_* vars are inlined by Metro at bundle time.
  // process.env is the only reliable source across all build profiles.
  const apiKeyStr = (process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ?? '').trim();

  // TEMPORARY DIAGNOSTIC
  Alert.alert(
    'Transcription Service Key Debug',
    `Length: ${apiKeyStr.length}\nFirst 8: ${apiKeyStr.slice(0, 8)}\nEmpty: ${apiKeyStr === ''}\nValue: "${apiKeyStr.slice(0, 12)}..."`
  );

  if (!apiKeyStr || apiKeyStr === 'undefined' || apiKeyStr === 'null' || apiKeyStr === 'your_deepgram_api_key_here') {
    throw new Error(
      'Deepgram API key is not configured. Add EXPO_PUBLIC_DEEPGRAM_API_KEY to your EAS secrets and rebuild.'
    );
  }

  try {
    console.log('[Deepgram] Transcribing audio file:', audioUri);
    console.log('[Deepgram] Platform:', Platform.OS);

    let audioBytes: Uint8Array;
    // Content-type must match the actual file produced by the recorder:
    //   Android → MPEG_4/AAC → audio/mp4
    //   iOS     → WAV/PCM   → audio/wav
    //   Web     → WebM/Opus → audio/webm
    let contentType = Platform.OS === 'android' ? 'audio/mp4'
                    : Platform.OS === 'web'     ? 'audio/webm'
                    : 'audio/wav';

    if (Platform.OS === 'web') {
      // Web platform: Use fetch to get blob and convert to ArrayBuffer
      console.log('[Deepgram] Using web-compatible audio loading...');

      try {
        const blob = await fetchAudioAsBlob(audioUri);
        const arrayBuffer = await blobToArrayBuffer(blob);
        audioBytes = new Uint8Array(arrayBuffer);

        // Determine content type from blob or URI
        if (blob.type) {
          contentType = blob.type;
        } else if (audioUri.includes('webm')) {
          contentType = 'audio/webm';
        }

        console.log('[Deepgram] Web audio loaded, size:', audioBytes.length, 'type:', contentType);
      } catch (fetchErr) {
        console.error('[Deepgram] Failed to fetch audio blob:', fetchErr);
        throw new Error('Failed to load audio file for transcription');
      }
    } else {
      // Native platform (iOS/Android): Use expo-file-system
      console.log('[Deepgram] Using native file system...');

      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to binary
      const binaryString = atob(base64Audio);
      audioBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioBytes[i] = binaryString.charCodeAt(i);
      }

      console.log('[Deepgram] Native audio loaded, size:', audioBytes.length);
    }

    // Build Deepgram API URL with parameters
    const url = new URL('https://api.deepgram.com/v1/listen');
    url.searchParams.append('model', 'nova-2');
    url.searchParams.append('language', language);
    url.searchParams.append('punctuate', 'true');
    url.searchParams.append('smart_format', 'true');
    url.searchParams.append('diarize', 'false');

    console.log('[Deepgram] Sending request to:', url.toString());

    // Prepare body for fetch (platform-specific)
    // ─── Why we use a plain Uint8Array on native ────────────────────────────
    // audioBytes comes from `atob()` which allocates a *shared* backing buffer.
    // Calling `.buffer.slice(byteOffset, byteOffset + byteLength)` on Hermes
    // (React Native's JS engine) produces a detached / zero-length ArrayBuffer
    // that React Native's fetch polyfill cannot serialize — the request body
    // arrives at Deepgram as empty, causing a misleading 401 INVALID_AUTH.
    // Passing the Uint8Array directly avoids the detached-buffer issue because
    // React Native's fetch handles typed arrays correctly without slicing.
    let requestBody: Blob | Uint8Array;
    if (Platform.OS === 'web') {
      // Web: Use Blob for better compatibility
      requestBody = new Blob([audioBytes], { type: contentType });
    } else {
      // Native (iOS/Android): Pass Uint8Array directly — do NOT slice .buffer
      requestBody = audioBytes;
    }

    // Send audio to Deepgram
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKeyStr}`,
        'Content-Type': contentType,
      },
      body: requestBody as BodyInit,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Deepgram] API error:', response.status, errorText);
      throw new Error(`Deepgram API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log('[Deepgram] Response received:', JSON.stringify(data, null, 2));

    // Extract transcript from response
    const channel = data.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    if (!alternative) {
      console.warn('[Deepgram] No transcript in response');
      return {
        transcript: '',
        confidence: 0,
        duration: data.metadata?.duration || 0,
      };
    }

    return {
      transcript: alternative.transcript || '',
      confidence: alternative.confidence || 0,
      duration: data.metadata?.duration || 0,
      words: alternative.words,
    };
  } catch (error) {
    console.error('[Deepgram] Transcription error:', error);
    throw error;
  }
}

/**
 * Check if Deepgram API is configured
 */
export function isDeepgramConfigured(): boolean {
  const apiKeyStr = (process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ?? '').trim();
  return Boolean(apiKeyStr) && apiKeyStr !== 'undefined' && apiKeyStr !== 'null' && apiKeyStr !== 'your_deepgram_api_key_here';
}
