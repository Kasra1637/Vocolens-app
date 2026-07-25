import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiFetch } from './api/client';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
}

/**
 * Get the Deepgram API key from environment (same logic as realtime service).
 */
function getDeepgramApiKey(): string | null {
  const fromConstants = Constants.expoConfig?.extra?.EXPO_PUBLIC_DEEPGRAM_API_KEY;
  if (fromConstants && fromConstants !== 'undefined' && fromConstants !== 'null') {
    return String(fromConstants).trim();
  }
  const apiKeyStr = (process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ?? '').trim();
  return (apiKeyStr && apiKeyStr !== 'undefined' && apiKeyStr !== 'null') ? apiKeyStr : null;
}

async function fetchAudioAsBlob(audioUri: string): Promise<Blob> {
  const response = await fetch(audioUri);
  return response.blob();
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Transcribe audio directly via Deepgram REST API (client-side).
 * This bypasses the backend worker and its X-Api-Key auth gate,
 * using the EXPO_PUBLIC_DEEPGRAM_API_KEY directly.
 */
async function transcribeDirectly(
  audioBase64: string,
  language: string,
  mimeType: string
): Promise<TranscriptionResult> {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error('Deepgram API key not configured');
  }

  // Convert base64 to binary
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const url = `https://api.deepgram.com/v1/listen?model=nova-2&language=${language}&punctuate=true&smart_format=true`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': mimeType,
    },
    body: bytes,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deepgram error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const alt = data?.results?.channels?.[0]?.alternatives?.[0];
  const transcript = alt?.transcript || '';
  const confidence = alt?.confidence || 0;
  const duration = data?.metadata?.duration || 0;

  return { transcript, confidence, duration };
}

/**
 * Transcribe via the backend worker (/api/transcribe).
 * Requires EXPO_PUBLIC_VOCOLENS_API_KEY to be set and matching the server.
 */
async function transcribeViaBackend(
  audioBase64: string,
  language: string,
  mimeType: string
): Promise<TranscriptionResult> {
  const response = await apiFetch('/api/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, language, mimeType }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Transcription failed');
  return { transcript: data.transcript || '', confidence: 0, duration: 0 };
}

/**
 * Transcribe an audio file. Tries direct Deepgram API first (no backend auth
 * needed), then falls back to the backend worker if the Deepgram key is missing.
 */
export async function transcribeAudioFile(
  audioUri: string | null | undefined,
  language: string = 'en'
): Promise<TranscriptionResult> {
  if (!audioUri || typeof audioUri !== 'string' || audioUri.trim().length === 0) {
    throw new Error('Audio file URI is missing.');
  }

  const mimeType = Platform.OS === 'android' ? 'audio/mp4' : Platform.OS === 'web' ? 'audio/webm' : 'audio/wav';

  let audioBase64: string;
  if (Platform.OS === 'web') {
    const blob = await fetchAudioAsBlob(audioUri);
    audioBase64 = await blobToBase64(blob);
  } else {
    audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  // Strategy: try direct Deepgram API first (bypasses backend auth gate).
  // Fall back to backend worker if direct call fails or key is missing.
  const deepgramKey = getDeepgramApiKey();

  if (deepgramKey) {
    try {
      return await transcribeDirectly(audioBase64, language, mimeType);
    } catch (directError) {
      console.warn('[Transcription] Direct Deepgram call failed, trying backend:', directError);
      // Fall through to backend
    }
  }

  // Fallback: route through backend worker
  return await transcribeViaBackend(audioBase64, language, mimeType);
}

export function isDeepgramConfigured(): boolean {
  return Boolean(getDeepgramApiKey());
}
