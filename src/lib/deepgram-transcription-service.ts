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

export function isDeepgramConfigured(): boolean {
  return true;
}

