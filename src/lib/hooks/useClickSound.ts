import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

let globalSound: Audio.Sound | null = null;
let soundInitAttempted = false;

const initializeSound = async () => {
  if (!globalSound && !soundInitAttempted) {
    soundInitAttempted = true;
    try {
      // Optional click sound. If the asset isn't present, we skip sound entirely.
      // (This avoids Metro "unknown module" crashes when a required asset is missing.)
      const clickSoundAsset = null as unknown as number | null;
      if (!clickSoundAsset) return null;

      const { sound } = await Audio.Sound.createAsync(clickSoundAsset);
      globalSound = sound;
    } catch (error) {
      console.warn('Error loading click sound:', error);
    }
  }
  return globalSound;
};

export const useClickSound = () => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playClickSound = useCallback(async () => {
    try {
      let sound = soundRef.current;

      if (!sound) {
        sound = await initializeSound();
        soundRef.current = sound;
      }

      if (sound) {
        try {
          await sound.replayAsync();
        } catch {
          // Sound might still be playing, that's okay
          try {
            await sound.stopAsync();
            await sound.playAsync();
          } catch (e) {
            // Silently fail
          }
        }
      }
    } catch (error) {
      console.warn('Error playing click sound:', error);
    }
  }, []);

  return playClickSound;
};

// Export a standalone function for use without hooks
export const playClickSoundSync = async () => {
  try {
    const sound = await initializeSound();
    if (sound) {
      try {
        await sound.replayAsync();
      } catch {
        try {
          await sound.stopAsync();
          await sound.playAsync();
        } catch (e) {
          // Silently fail
        }
      }
    }
  } catch (error) {
    console.warn('Error playing click sound:', error);
  }
};
