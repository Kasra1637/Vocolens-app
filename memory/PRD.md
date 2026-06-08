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

### Bugfix 2026-01: PIN change flow — replaced native keypad with in-app keypad
- **Root cause:** the device's native soft-keyboard was unreliable inside the Change PIN modal (especially after the verify→setup step transition). Tapping the PIN input only produced haptic feedback; no keypad appeared. Additionally the PIN was stored in two places (encrypted SecureStore via auth-service + zustand `usePinStore` mirror) and only one was being updated on change, risking stale references.
- **Solution:**
  - New component `/app/src/components/PinKeypad.tsx` — themed in-app numeric keypad (1–9, ⌫, 0, OK) using the active onboarding theme primary colour. Press feedback via Reanimated scale animation + haptics. OK is enabled only when `value.length === maxLength`.
  - Rewrote `/app/src/components/PinEntryScreen.tsx` — removed the hidden `TextInput`, all focus retries, the `keyboardDidHide` listener, and the full-screen Pressable overlay. Input is now driven 100% by `PinKeypad`. Public API (props + `PinEntryScreenHandle.focusKeyboard`) unchanged; `focusKeyboard` is now a no-op for backward compat, so `settings.tsx` works without modification.
  - PIN sync — `auth-service.setPin()` and `auth-service.removePin()` now also mirror to the zustand `usePinStore` via a lazy require, so no consumer of either store can ever see a stale PIN. SecureStore is authoritative; mirror failures are logged but non-fatal.
  - Tagged logging — every PIN op now logs `[auth] …` to aid future debugging without leaking the PIN value itself.
- **Behavioural change for users:** auto-submit at 4 digits is replaced by an explicit OK tap, exactly as specified.
