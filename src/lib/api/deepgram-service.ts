import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { apiFetch } from './client';
import { getDeviceId } from '../device-id';
import {
  applyServerUsage,
  usageLimitErrorFrom,
  UsageLimitError,
} from './usage-service';

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  duration: number;
}

export async function transcribeAudio(
  audioUri: string | null | undefined,
  options: { language?: string } = {}
): Promise<TranscriptionResult> {
  if (!audioUri || typeof audioUri !== 'string' || audioUri.trim().length === 0) {
    throw new Error('Audio file URI is missing.');
  }
  const mimeType = Platform.OS === 'android' ? 'audio/mp4' : Platform.OS === 'web' ? 'audio/webm' : 'audio/wav';
  const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const response = await apiFetch('/api/transcribe', {
    method: 'POST',
    headers: { 'X-Device-Id': await getDeviceId() },
    body: JSON.stringify({ audioBase64, language: options.language || 'en', mimeType }),
  });

  // Monthly allowance exhausted — terminal, never retried.
  const limitError = await usageLimitErrorFrom(response);
  if (limitError) throw limitError;

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Transcription failed');

  // The server returns the authoritative balance it just metered.
  applyServerUsage(data.usage);

  return {
    transcript: data.transcript || '',
    confidence: data.confidence || 0,
    duration: data.duration || 0,
  };
}

export async function transcribeAudioWithRetry(
  audioUri: string,
  options: { language?: string } = {},
  maxRetries: number = 3
): Promise<TranscriptionResult> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transcribeAudio(audioUri, options);
    } catch (error) {
      // Retrying a limit rejection just burns requests — the answer is final
      // until the allowance resets.
      if (error instanceof UsageLimitError) throw error;
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError || new Error('Transcription failed after all retries');
}

export function isDeepgramConfigured(): boolean {
  return true;
}
