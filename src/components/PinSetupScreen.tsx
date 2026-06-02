/**
 * PinSetupScreen — compatibility shim
 *
 * All PIN logic (setup + verify) now lives in PinEntryScreen.
 * This file re-exports PinEntryScreen pre-configured for setup mode so that
 * any remaining import of PinSetupScreen continues to work without changes.
 */

import React from 'react';
import { PinEntryScreen } from '@/components/PinEntryScreen';

interface PinSetupScreenProps {
  onComplete: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export function PinSetupScreen({ onComplete, onCancel, title, subtitle }: PinSetupScreenProps) {
  return (
    <PinEntryScreen
      mode="setup"
      onComplete={onComplete}
      onCancel={onCancel}
      title={title}
      subtitle={subtitle}
    />
  );
}
