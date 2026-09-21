# Vocolens App — Agent Brief

Expo React Native app (SDK 55), EAS builds, Adapty subscriptions
(`premium` access level), Cloudflare Worker backend (`vocolens-api` + D1).
Production package: `com.vocolens.app`.

## Standing rules (every change)

- One repo = one commit. Never mix app + site changes in a commit.
- Before committing: show `git status` + `git diff` for this folder first.
- Never `--force` push, never commit secrets, `.env`, or credentials.
- `versionCode` (Android) is bumped by hand before every production build —
  keep `app.json` and `app.config.js` in agreement.
- `EXPO_PUBLIC_ADAPTY_KEY` must be set (EAS secret) or release builds run in
  Adapty mock mode with no Play sheet. Never ship mock-mode purchases.
- Verify with `npx tsc --noEmit`, then commit to `main` and push without
  asking, unless told otherwise.

## Durable facts

- Theme: Midnight Glow dark (`#181624` → `#0F0E1A`), primary `#9370DB`,
  secondary `#A78BFA`; glass cards (`white/12`, 2px `white/20`, radius 24).
- Icons: `phosphor-react-native`, `weight="regular"`, 20–24px UI, 10px tab
  labels. Tab bar icons are custom SVG (`TabIcons.tsx`), not Phosphor.
- Fonts: Fraunces 700 headings, Inter 400/500/600/700 body.
- Body map: 8 regions (head, face, neck, chest, stomach, arms, hands, legs);
  heat = count share; intensity optional.
- Privacy posture: on-device storage, no accounts, biometric/PIN lock,
  transient HTTPS transcription + analysis, export JSON / delete / wipe in
  Settings. Keep all user-facing privacy claims consistent with this.
- Google Cloud: single project `vocolens` for Play RTDN Pub/Sub; Adapty
  auto-creates the topic — never invent topic names.
