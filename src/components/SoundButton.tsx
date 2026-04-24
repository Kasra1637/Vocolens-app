import React, { useRef } from 'react';
import { Pressable, PressableProps } from 'react-native';
import { Audio } from 'expo-av';

interface SoundButtonProps extends PressableProps {
  children?: React.ReactNode;
}

let globalSound: Audio.Sound | null = null;
let soundInitAttempted = false;

const loadClickSound = async () => {
  if (!globalSound && !soundInitAttempted) {
    soundInitAttempted = true;
    try {
      // Optional click sound. If the asset isn't present, skip sound entirely.
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

const playClickSound = async () => {
  try {
    const sound = await loadClickSound();
    if (sound) {
      try {
        await sound.replayAsync();
      } catch {
        // Sound is already playing, that's fine
      }
    }
  } catch (error) {
    console.warn('Error playing click sound:', error);
  }
};

export const SoundButton = React.forwardRef<any, SoundButtonProps>(
  ({ onPress, ...props }, ref) => {
    const handlePress = async (event: any) => {
      await playClickSound();
      onPress?.(event);
    };

    return <Pressable ref={ref} onPress={handlePress} {...props} />;
  }
);

SoundButton.displayName = 'SoundButton';
