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
  - Added try/catch in `generatePdfForNative` to gracefully handle missing expo-print native module
  - Falls back to saving HTML file when expo-print is unavailable (included in zip as .html instead of .pdf)

## Files Modified
- `/app/src/app/(tabs)/settings.tsx` — Added imports (Share, Heart, Clipboard), share handlers, and share card JSX section
- `/app/src/lib/export-journal.ts` — Fixed generatePdfForNative with fallback, updated exportJournalArchive for conditional file naming

## Backlog / Next Tasks
- P0: None
- P1: Ensure expo-print native module is included in the next EAS build for proper PDF export
- P2: Consider adding referral tracking to the share link (UTM params like existing milestone shares)
