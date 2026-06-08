/**
 * useEntrySavedSound
 *
 * Plays a soft single-note chime when a journal entry is successfully saved.
 * Uses one of the short, gentle sound assets already in the project.
 * Ensures ExoPlayer is accessed on the main thread (requestAnimationFrame).
 */

import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

// Short gentle chime — the lightest/softest asset (8KB)
const CHIME_ASSET = require('../../../assets/sound-effect-1767695069566.mp3');

export function useEntrySavedSound() {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
        });

        const { sound } = await Audio.Sound.createAsync(CHIME_ASSET, {
          shouldPlay: false,
          volume: 0.5, // soft — not intrusive
        });

        if (mounted) {
          soundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch {
        // Sounds are a nice-to-have, not required
      }
    })();

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playChime = useCallback(async () => {
    try {
      const sound = soundRef.current;
      if (!sound) return;
      // Ensure ExoPlayer is accessed on the main/UI thread (Android)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      // no-op
    }
  }, []);

  return playChime;
}
