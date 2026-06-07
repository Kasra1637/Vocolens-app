# PRD - VocoLens Voice Journal App

## Overview
React Native / Expo Voice Journal with AI Emotion Analysis. **Primary & ONLY LLM: `openai/gpt-5.4-mini` via OpenRouter** (no fallbacks to other providers). Runs seamlessly in the Emergent ecosystem: native phone mockup in the App Preview + Expo Go QR code for real-device testing.

## AI Model Policy (2026-01)
- **All AI features** (analysis, recommendation, weekly reflection, AI completion) route exclusively through `openai/gpt-5.4-mini` on OpenRouter.
- Single source of truth: `MODEL` constant in `/app/backend/src/worker.js` (deployed Cloudflare Worker) and the model strings in `/app/backend/src/lib/openrouter.ts` (local Hono backend).
- **No Claude / Anthropic fallback.** Any deviation breaks OpenRouter usage attribution.

### Bugfix 2026-01: GPT 5.4 Mini showed no activity on OpenRouter
The deployed Cloudflare Worker at `vocolens-api.kasrammarvel.workers.dev` had `MODEL = "anthropic/claude-3-7-sonnet"` hardcoded, so every AI request was being charged to Claude instead of GPT 5.4 Mini.
**Fix applied** in `/app/backend/src/worker.js`: set `MODEL = "openai/gpt-5.4-mini"` and updated all "Empty response from Claude" error strings. Also updated `/health` in `/app/backend/src/index.ts`.
**Action required by user:** redeploy the Cloudflare Worker (via `wrangler deploy` or the Cloudflare dashboard) for changes to take effect on the live Worker URL.

## Architecture
| Service | Port | Description |
|---------|------|-------------|
| Phone Mockup Proxy | 3000 | Node.js — serves iPhone frame, proxies to Metro, handles WS HMR |
| Metro Dev Server | 3001 | Expo bundler with ngrok tunnel (web + native) |
| FastAPI Backend | 8001 | Journal analysis (OpenRouter), usage tracking |

## How the Preview Works
1. Emergent opens `https://gpt54-debug.preview.emergentagent.com` → `proxy-server.js` returns iPhone mockup HTML
2. Inside the mockup, `<iframe src="/app.html">` loads the Expo web app (proxied from Metro:3001)
3. All assets + WebSocket HMR proxied transparently to Metro
4. Right panel polls `/tunnel-url` every 3 s — shows live QR code for Expo Go

## Automation
### After every `npm install` (automatic via `postinstall`)
```
bash /app/scripts/cleanup-watchable.sh   # removes heavy non-runtime dirs
sudo supervisorctl restart frontend       # restarts Metro cleanly
```
This is wired into `/app/package.json` → `"postinstall"` so it fires automatically.

### Why cleanup is needed
Container inotify limit: **12,288** watches. Full node_modules has **13,000+** dirs.
Cleanup removes:
- `@sinclair/typebox` nested in jest packages (test-only)
- `lib/typescript` type-def dirs from native packages (IDE only)
- `android/`, `ios/`, `cpp/` native source trees (EAS Build only, not needed by Metro)

## Tunnel Auto-Refresh
`proxy-server.js` polls ngrok API every 3 s (always, not just until first URL). If the tunnel restarts and the URL changes, the QR code updates instantly in the browser with no page reload.

## Key Files
| File | Purpose |
|------|---------|
| `/app/frontend/proxy-server.js` | Phone mockup + proxy server |
| `/app/frontend/package.json` | Start script: Metro (3001) + proxy (3000) |
| `/app/backend/server.py` | Python FastAPI backend |
| `/app/metro.config.js` | Metro config — uses METRO_PORT=3001 |
| `/app/scripts/cleanup-watchable.sh` | Post-install cleanup script |
| `/app/package.json` | `postinstall` hook wired in |

## Backlog
- P1: EAS Build setup for App Store / Google Play distribution
- P2: MongoDB persistence for usage data

### Bugfix 2026-01: PIN change flow — native keypad would not open
- **Root cause:** `PinEntryScreen` used a hidden `TextInput` with `opacity: 0` (iOS skips the soft-keyboard for fully transparent inputs) and a single `focus()` call on `Modal.onShow` that raced the modal's enter animation.
- **Fix in `/app/src/components/PinEntryScreen.tsx`:**
  - `opacity: 0` → `opacity: 0.01` on the hidden input (iOS keyboard manager now treats it as visible).
  - Replaced single `focus()` with `forceFocus()` — blur+focus on an escalating schedule (0/60/200/450 ms on iOS; 0/150/350/650 ms +`androidFocusDelay` on Android). Cleans up timers on unmount.
  - Added `Keyboard.addListener('keyboardDidHide')` so if the user dismisses the keypad, it re-arms focus automatically while PIN entry is still incomplete.
  - Added a full-screen invisible `Pressable` (`absoluteFill` + `pointerEvents="box-only"`) so tapping anywhere — not just the dot row — re-opens the keypad.
  - Same logic applies to Enter Current PIN, Create New PIN, and Confirm New PIN since all three use the same component.
