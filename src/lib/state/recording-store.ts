/**
 * Recording Store
 *
 * Tracks whether a voice recording session is currently active.
 * Used by AuthGate to suppress re-locking when the user is mid-recording,
 * preventing the PIN/biometric lock screen from interrupting an active session.
 *
 * This is ephemeral state only — never persisted.
 */

import { create } from 'zustand';

interface RecordingState {
  /** Whether a voice recording is currently in progress. */
  isRecordingActive: boolean;
  setRecordingActive: (active: boolean) => void;
}

const useRecordingStore = create<RecordingState>()((set) => ({
  isRecordingActive: false,
  setRecordingActive: (active) => set({ isRecordingActive: active }),
}));

export default useRecordingStore;
