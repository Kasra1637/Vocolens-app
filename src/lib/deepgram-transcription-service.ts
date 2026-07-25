import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { apiFetch } from './api/client';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
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

export async function transcribeAudioFile(
  audioUri: string | null | undefined,
  language: string = 'en'
): Promise<TranscriptionResult> {
  console.log('[Transcription] Starting transcription...', { audioUri: audioUri?.slice(0, 50), language });

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

  console.log('[Transcription] Audio encoded, size:', audioBase64.length, 'chars, mimeType:', mimeType);

  const response = await apiFetch('/api/transcribe', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, language, mimeType }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Transcription] FAILED:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      platform: Platform.OS,
    });
    throw new Error(`Transcription failed (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  console.log('[Transcription] Success:', { hasTranscript: Boolean(data.transcript), length: data.transcript?.length });
  if (!data.success) throw new Error(data.error || 'Transcription failed');
  return { transcript: data.transcript || '', confidence: 0, duration: 0 };
}

export function isDeepgramConfigured(): boolean {
  return true;
}

