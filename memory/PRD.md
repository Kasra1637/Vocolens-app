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

- **Jan 2026**: "Export All Data" feature
  - CSV export of all app data (journal entries, stats, badges, settings, emotion corrections)
  - Uses expo-file-system + expo-sharing for native file write and share sheet
  - "Export as CSV" button in Danger Zone section, above Reset button with divider separator
  - Loading state with "Exporting..." feedback
  - New utility: `/app/src/lib/export-data.ts`

- **Jan 2026**: Font migration & readability improvements
  - Replaced Comfortaa with Inter font family across all 41 files
  - Installed `@expo-google-fonts/inter` (v0.4.2)
  - Standardized typography: headings 22px Bold, body 15px Regular, labels 12px Medium
  - Improved line heights (body text now 22px+, labels 18-20px)
  - Increased touch targets on dropdowns, filters, radio buttons (py-3 minimum)
  - Font colors kept unchanged as requested

- **Jan 2026**: Settings restructure
  - Removed standalone "Danger Zone" section
  - Removed "Privacy Settings" link (Export data, manage entries & account)
  - Moved Export All Data + Reset All Data into the Privacy & Security card
  - Privacy & Security now contains: Change PIN, Privacy Policy & Terms, Export All Data, Reset All Data

## Prioritized Backlog
- P0: None
- P1: None
- P2: CSV re-import functionality

## Next Tasks
- None pending
