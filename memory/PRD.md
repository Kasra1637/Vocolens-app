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

## Files Modified
- `/app/src/app/(tabs)/settings.tsx` — Added imports (Share, Heart, Clipboard), share handlers, and share card JSX section

## Backlog / Next Tasks
- P0: None
- P1: None
- P2: Consider adding referral tracking to the share link (UTM params like existing milestone shares)
