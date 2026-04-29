# PRD - Voice Journal App

## Original Problem Statement
Add an option to reset all app data and start from scratch. Adds a "Danger Zone" section in settings with a "Reset All Data" button that clears all user entries, stats, badges, PIN, and settings, returning the app to its initial state. The `resetBadges` function is updated to fully re-initialize badge states and clear pending celebrations.

## Architecture
- **Platform**: React Native / Expo
- **State Management**: Zustand with AsyncStorage persistence
- **Styling**: NativeWind (Tailwind CSS for RN) + expo-linear-gradient

## Core Stores
- `onboarding-store` - Theme, onboarding state, user preferences
- `journal-store` - Journal entries
- `badges-store` - Badges, achievements, celebrations
- `user-stats-store` - Streaks, usage, mood stats
- `settings-store` - Notifications, dark mode, time format
- `pin-store` - PIN code
- `emotion-correction-store` - AI emotion corrections/personalizations
- `subscription-store` - Subscription status
- `auth-store` - Auth state (ephemeral)

## What's Been Implemented
- **Jan 2026**: "Reset All Data" feature
  - Added "Danger Zone" section at bottom of Settings screen
  - Red-themed warning UI with AlertTriangle icon and Trash2 icon on button
  - Simple confirmation modal with "Yes, Reset Everything" / "Cancel" buttons
  - Resets ALL 8 stores: journal, badges, stats, settings, pin, emotion corrections, subscription, onboarding
  - Clears PIN from secure storage via `removePin()`
  - Updated `resetBadges()` to fully re-initialize badge states from BADGE_DEFINITIONS and clear pendingCelebrations
  - Redirects to onboarding screen after reset
  - All data-testid attributes added for testing

## Prioritized Backlog
- P0: None
- P1: None
- P2: Data export before reset option

## Next Tasks
- None pending
