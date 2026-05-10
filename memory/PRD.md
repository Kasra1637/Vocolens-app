# PRD - VocoLens Voice Journal App

## Original Problem Statement
Use the source code from the connected GitHub repository for a native mobile app (iOS/Android). Do not remove, simplify, or alter any existing logic, features, UI screens, navigation, backend integrations, or data structures. Make this mobile app run seamlessly in the app.emergent.sh ecosystem. The app is React Native / Expo and must remain a native mobile app (not web).

## App Overview
VocoLens is a React Native / Expo Voice Journal App that uses Plutchik's wheel of emotions for deep emotional analysis of voice journal entries. It uses OpenRouter API (GPT-4o audio-preview + GPT-4o text fallback) for AI-powered emotional analysis.

## Architecture
- **Platform**: React Native / Expo (Expo Router for navigation)
- **Frontend (port 3000)**: Node.js landing page server — shows QR code for Expo Go, polls ngrok for live tunnel URL
- **Metro Dev Server (port 8081)**: Expo native dev server — bundler for iOS/Android via ngrok tunnel
- **Backend (port 8001)**: Python FastAPI — journal analysis (OpenRouter GPT-4o), usage tracking
- **Tunnel**: @expo/ngrok → `exp://y-fws0e-anonymous-8081.exp.direct`
- **State Management**: Zustand with AsyncStorage persistence
- **Styling**: NativeWind (Tailwind CSS for RN) + expo-linear-gradient
- **AI**: OpenRouter API (openai/gpt-4o-audio-preview + openai/gpt-4o fallback)

## Project Structure
```
/app/
├── src/                        # React Native Expo source code
│   ├── app/(tabs)/             # Tab screens: home, entries, insights, milestones, settings
│   ├── app/                    # Other screens: entry-detail, reflection, etc.
│   └── components/, lib/       # Reusable components and utilities
├── assets/                     # Images, sound effects
├── backend/
│   └── server.py               # Python FastAPI backend (Emergent ecosystem)
├── frontend/
│   ├── package.json            # Frontend wrapper start script
│   └── server.js               # Node.js QR code landing page server (port 3000)
├── metro.config.js             # Metro bundler config
└── .env.local                  # Environment variables
```

## How It Works (User Flow)
1. User visits the Emergent preview URL (`https://XXX.preview.emergentagent.com`)
2. Sees a **landing page** with a live QR code and instructions
3. Opens **Expo Go** app on iPhone/Android (free from App Store / Google Play)
4. Taps "Scan QR Code" → points at the QR code on screen
5. VocoLens loads **natively** on their device — microphone, haptics, all features work

## Backend API Endpoints
- `GET /health` - Health check  
- `GET /api/sample/` - Sample greeting
- `GET /api/journal/status` - OpenRouter connection status
- `POST /api/journal/analyze` - Analyze journal transcript (audio+text or text-only)
- `POST /api/journal/weekly-reflection` - Generate weekly digest
- `POST /api/journal/ai-completion` - Generic AI completion
- `GET /api/usage/status` - Get monthly usage
- `POST /api/usage/record` - Record session usage

## Landing Page Endpoints (port 3000, NOT /api/)
- `GET /` - QR code landing page HTML
- `GET /tunnel-url` - JSON with current ngrok tunnel URL (for dynamic QR refresh)

## Environment Variables (/app/.env.local)
- `OPENROUTER_API_KEY` - OpenRouter API key
- `EXPO_PUBLIC_BACKEND_URL` - Backend URL for Expo app
- `EXPO_PUBLIC_DEEPGRAM_API_KEY` - Deepgram API key for voice transcription
- `EXPO_PUBLIC_OPENROUTER_API_KEY` - OpenRouter key for client-side calls

## Node_modules Cleanup (for inotify watcher limit)
The Kubernetes container has a low inotify limit (12288). The following were removed from node_modules to stay under this limit:
- `@sinclair/typebox` nested in jest packages (test-only dependency)
- `lib/typescript` type definition dirs from RN native packages (IDE only, not needed by Metro)
- `ReactAndroid/` and `ReactCommon/` native source trees (EAS build only)
- `android/` and `ios/` native source dirs from packages (EAS build only)
- `cpp/` native source dirs from Skia, Reanimated, Screens

**Note**: If you run `npm install` again, these will be reinstated and Metro will crash with ENOSPC. After `npm install`, re-run the cleanup script at `/app/scripts/cleanup-watchable.sh`.

## Cleanup Script (preserve inotify headroom)
Run this after any `npm install`:
```bash
rm -rf /app/node_modules/@sinclair
find /app/node_modules -name "typebox" -path "*jest*" -type d -exec rm -rf {} + 2>/dev/null || true
find /app/node_modules -maxdepth 3 -name "android" -type d -exec rm -rf {} + 2>/dev/null || true
find /app/node_modules -maxdepth 3 -name "ios" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf /app/node_modules/react-native/ReactAndroid
rm -rf /app/node_modules/react-native/ReactCommon
```

## Prioritized Backlog
- P0: None
- P1: Persist cleanup script so npm install doesn't break things
- P2: EAS Build setup for app store distribution
- P2: MongoDB persistence for usage data
