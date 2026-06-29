# Vocolens - Product Requirements Document

## Original Problem Statement
Add a new "Share" section to the bottom of the Settings screen with a Heart icon, title "Help someone else feel understood", descriptive subtext, and native share sheet behavior with copy-link fallback.

## Architecture
- **Platform**: React Native / Expo
- **Styling**: NativeWind (Tailwind CSS for RN), glassmorphic design system
- **Icons**: lucide-react-native
- **Fonts**: Inter (400, 600, 700), Fraunces (700 Bold)
- **State**: Zustand stores
- **Backend**: Node.js/TypeScript (Express)
- **Payments**: RevenueCat

## What's Been Implemented
- **Jan 2026**: Added "Help someone else feel understood" share section to Settings screen
  - Heart icon, title, and subtext matching existing card design
  - Native Share API integration with pre-filled message and vocolens.com link
  - Copy-link fallback via expo-clipboard when Share API is unavailable
  - data-testid attributes for testability (`share-app-card`, `copy-link-button`)
- **Jan 2026**: Fixed "Cannot find native module expoprint" crash on Export & Download
  - **Root cause**: `expo-print` was at `^56.0.4` (SDK 56) while the project is on Expo SDK 55 — version mismatch prevented native module autolinking
  - Fixed version to `~55.0.17` to match the SDK
  - Added try/catch fallback in `generatePdfForNative` to gracefully handle missing native module (saves HTML instead of PDF)

## Files Modified
- `/app/src/app/(tabs)/settings.tsx` — Added imports (Share, Heart, Clipboard), share handlers, and share card JSX section
- `/app/src/lib/export-journal.ts` — Fixed generatePdfForNative with fallback, updated exportJournalArchive for conditional file naming
- `/app/package.json` — Fixed expo-print version from `^56.0.4` to `~55.0.17`

## Backlog / Next Tasks
- P0: None
- P1: Run `eas build` (or `npx expo prebuild` locally) to rebuild the native binary with the corrected expo-print version
- P2: Consider adding referral tracking to the share link (UTM params like existing milestone shares)
