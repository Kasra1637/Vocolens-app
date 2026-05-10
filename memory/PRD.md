# PRD - VocoLens Voice Journal App

## Original Problem Statement
Use the source code from the connected GitHub repository for a native mobile app. Do not remove, simplify, or alter any existing logic, features, UI screens, navigation, backend integrations, or data structures. Make this mobile app run seamlessly in the app.emergent.sh ecosystem.

## App Overview
VocoLens is a React Native / Expo Voice Journal App that uses Plutchik's wheel of emotions for deep emotional analysis of voice journal entries. It uses OpenRouter API (GPT-4o audio-preview + GPT-4o text fallback) for AI-powered emotional analysis.

## Architecture
- **Platform**: React Native / Expo (Expo Router for navigation)
- **Frontend**: Expo web, pre-built static bundle served by `serve` on port 3000
- **Backend**: Python FastAPI on port 8001 (replaces original Hono/TypeScript backend)
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
│   └── server.py               # Python FastAPI backend (created for Emergent ecosystem)
├── frontend/
│   └── package.json            # Frontend wrapper (created for Emergent ecosystem)
├── dist/                       # Pre-built Expo web bundle (output of `npx expo export --platform web`)
├── metro.config.js             # Metro bundler config (updated: 0.0.0.0 bind, PORT env var)
└── .env.local                  # Environment variables incl. EXPO_PUBLIC_BACKEND_URL
```

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

## Backend API Endpoints
- `GET /health` - Health check
- `GET /api/sample/` - Sample greeting
- `GET /api/journal/status` - OpenRouter connection status
- `POST /api/journal/analyze` - Analyze journal transcript (audio+text or text-only)
- `POST /api/journal/weekly-reflection` - Generate weekly digest
- `POST /api/journal/ai-completion` - Generic AI completion
- `GET /api/usage/status` - Get monthly usage
- `POST /api/usage/record` - Record session usage

## Environment Variables
- `OPENROUTER_API_KEY` - OpenRouter API key (in .env.local)
- `EXPO_PUBLIC_BACKEND_URL` - Backend URL for the Expo app (in .env.local, set to APP_URL)
- `EXPO_PUBLIC_DEEPGRAM_API_KEY` - Deepgram API key for transcription
- `EXPO_PUBLIC_OPENROUTER_API_KEY` - OpenRouter key for client-side calls
- `APP_URL` - Set by Emergent supervisor: https://486cce79-9f32-4661-b20c-0a03390aa836.preview.emergentagent.com

## What's Been Implemented

### Original App Features (from GitHub, preserved intact)
- Multi-step onboarding flow with theme selection (6 color themes)
- Voice journal recording with Deepgram transcription
- AI emotional analysis using Plutchik's wheel (8 emotions)
- Entries list with collapsible transcripts
- Insights screen with weekly reflections
- Milestones/badges screen
- Settings with PIN protection, export, reset

### Emergent Platform Integration (May 2026)
- **Python FastAPI backend** (`/app/backend/server.py`): Replicates all Hono/TypeScript backend routes in Python, loads env from `/app/.env.local`, implements journal analysis, usage tracking, sample routes
- **Frontend wrapper** (`/app/frontend/package.json`): Wrapper that runs pre-built Expo web bundle via `serve` on port 3000 (avoids inotify watcher limit in Kubernetes)
- **Static web build** (`/app/dist/`): Pre-built Expo web app via `npx expo export --platform web`
- **Metro config update**: Updated to bind on `0.0.0.0` and use `PORT` env var
- **EXPO_PUBLIC_BACKEND_URL**: Set in `.env.local` to Emergent APP_URL for correct API routing

## Known Limitations
- **No hot reload**: Frontend uses pre-built static bundle, not the dev server. Requires manual rebuild after code changes: `cd /app && npx expo export --platform web --output-dir dist`
- **Usage store is in-memory**: Same as original Hono backend - resets on server restart (by design)
- **In-memory usage**: No MongoDB persistence for usage data

## Rebuild After Code Changes
When frontend code changes, rebuild with:
```bash
cd /app && rm -rf dist && npx expo export --platform web --output-dir dist
sudo supervisorctl restart frontend
```

## Prioritized Backlog
- P0: None
- P1: Auto-rebuild on code changes (webpack watch mode)
- P2: CSV re-import functionality
- P2: MongoDB persistence for usage data
