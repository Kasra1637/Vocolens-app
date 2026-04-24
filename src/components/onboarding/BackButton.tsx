/**
 * Back Button Component for Onboarding Screens
 *
 * Positioned in top-left corner, consistent across all onboarding screens.
 */

import React from 'react';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { tapHaptic } from '@/lib/haptics';
import { useClickSound } from '@/lib/hooks/useClickSound';

interface BackButtonProps {
  onPress: () => void;
  show?: boolean;
}

export function BackButton({ onPress, show = true }: BackButtonProps) {
  const playClickSound = useClickSound();

  if (!show) return null;

  const handlePress = () => {
    playClickSound();
    tapHaptic();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="absolute top-2 left-4 z-10 active:opacity-70"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ChevronLeft size={26} color="#FFFFFF" strokeWidth={2.8} />
    </Pressable>
  );
}
