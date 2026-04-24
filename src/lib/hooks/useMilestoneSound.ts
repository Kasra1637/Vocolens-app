import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

// Celebration fanfare — the largest (33 KB) sound file in assets
const CELEBRATION_ASSET = require('../../../assets/sound-effect-1767694881912.mp3');
// Badge-pop — short 8 KB click for the badge icon bounce-in
const BADGE_POP_ASSET   = require('../../../assets/sound-effect-1767694938911.mp3');

export function useMilestoneSound() {
  const celebrationRef = useRef<Audio.Sound | null>(null);
  const badgePopRef    = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,   // play even on silent/vibrate
          allowsRecordingIOS: false,
        });

        const { sound: cel } = await Audio.Sound.createAsync(CELEBRATION_ASSET, {
          shouldPlay: false,
          volume: 0.85,
        });
        const { sound: pop } = await Audio.Sound.createAsync(BADGE_POP_ASSET, {
          shouldPlay: false,
          volume: 0.7,
        });

        if (mounted) {
          celebrationRef.current = cel;
          badgePopRef.current    = pop;
        } else {
          await cel.unloadAsync();
          await pop.unloadAsync();
        }
      } catch {
        // Ignore — sounds are a nice-to-have, not required
      }
    })();

    return () => {
      mounted = false;
      celebrationRef.current?.unloadAsync().catch(() => {});
      badgePopRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const playCelebration = async () => {
    try {
      const sound = celebrationRef.current;
      if (!sound) return;
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      // no-op
    }
  };

  const playBadgePop = async () => {
    try {
      const sound = badgePopRef.current;
      if (!sound) return;
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch {
      // no-op
    }
  };

  return { playCelebration, playBadgePop };
}
