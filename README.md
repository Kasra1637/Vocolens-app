# Vocolens — Cloud-First Expo Development

> **Everything runs in the cloud.**  
> Your local machine is only needed for editing files.  
> Running, previewing, and building all happen on GitHub infrastructure.

---

## Table of contents

1. [How it works — overview](#1-how-it-works--overview)
2. [One-time setup (do this once)](#2-one-time-setup-do-this-once)
3. [Daily development in GitHub Codespaces](#3-daily-development-in-github-codespaces)
4. [Testing on a physical phone](#4-testing-on-a-physical-phone)
5. [Building with EAS (GitHub Actions)](#5-building-with-eas-github-actions)
6. [Live preview on a PR](#6-live-preview-on-a-pr)
7. [Project structure — cloud files](#7-project-structure--cloud-files)
8. [Secrets reference](#8-secrets-reference)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. How it works — overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GitHub (source of truth)                      │
│                                                                       │
│  ┌─────────────────────┐     push / PR     ┌──────────────────────┐ │
│  │  Your browser /     │ ────────────────► │  GitHub Actions CI   │ │
│  │  VS Code (editing)  │                   │  • EAS build         │ │
│  └─────────────────────┘                   │  • Tunnel QR preview │ │
│                                            └──────────────────────┘ │
│  ┌─────────────────────┐                                             │
│  │  GitHub Codespaces  │  ◄── Open in browser, no local install     │
│  │  (devcontainer)     │                                             │
│  │  • Metro bundler    │  ──── ngrok tunnel ────► Expo Go on phone  │
│  │  • expo start       │                                             │
│  └─────────────────────┘                                             │
│                                            ┌──────────────────────┐ │
│                                            │  EAS Build servers   │ │
│                                            │  • Android APK/AAB   │ │
│                                            │  • iOS IPA           │ │
│                                            └──────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

| Task | Where it runs |
|---|---|
| Edit code | Browser / VS Code (local **or** Codespaces) |
| `npm install` | Codespaces (automatic on open) |
| `expo start` + tunnel | Codespaces terminal |
| Live preview on phone | Expo Go → scans QR from tunnel |
| Build APK / IPA | EAS Build (triggered by GitHub Actions) |
| PR live preview | GitHub Actions → ngrok → QR comment on PR |

---

## 2. One-time setup (do this once)

### 2a. Create an Expo account and link the project

1. Sign up at **[expo.dev](https://expo.dev)** (free tier is enough).
2. In the Codespace or locally, run:
   ```bash
   npx eas-cli whoami          # should print your username
   npx eas-cli init            # links this repo to your Expo project
   ```
   This writes an `extra.eas.projectId` into `app.json`. Commit that change.

### 2b. Add GitHub secrets

Go to **[github.com/Kasra1637/Vocolens-app/settings/secrets/actions](https://github.com/Kasra1637/Vocolens-app/settings/secrets/actions)** and add:

| Secret name | Where to get it | Required for |
|---|---|---|
| `EXPO_TOKEN` | [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) | All EAS builds + tunnel preview |
| `NGROK_TOKEN` | [dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) | _(optional)_ Avoids ngrok rate-limits |

### 2c. Add Codespaces secrets (for interactive dev)

Go to **[github.com/settings/codespaces](https://github.com/settings/codespaces)** → *New secret*:

| Secret name | Value |
|---|---|
| `EXPO_TOKEN` | Same token as above |

These are injected into every Codespace as environment variables automatically.

---

## 3. Daily development in GitHub Codespaces

### Open the Codespace

1. Go to **[github.com/Kasra1637/Vocolens-app](https://github.com/Kasra1637/Vocolens-app)**
2. Click **Code → Codespaces → Create codespace on kiro** (or your branch)
3. Wait ~2 min for the container to build and `postCreateCommand` to run  
   _(subsequent opens are instant — the container is cached)_

The terminal will print:

```
╔══════════════════════════════════════════════════════╗
║  Setup complete! To start developing:               ║
║                                                      ║
║    expo-tunnel   ← QR code via tunnel (phone)       ║
║    expo-lan      ← LAN preview (same network)       ║
║    expo-web      ← Web preview in browser           ║
╚══════════════════════════════════════════════════════╝
```

### Start the dev server

**For phone testing (recommended):**
```bash
expo-tunnel          # alias for: npx expo start --tunnel --clear
```

**For web preview inside the Codespace browser:**
```bash
expo-web             # alias for: npx expo start --web --clear
```

**Check the active tunnel URL at any time:**
```bash
tunnel-url
```

### Available npm scripts

```bash
npm start            # expo start (auto-selects port 8084)
npm run tunnel       # expo start --tunnel --clear
npm run lan          # expo start --lan --clear
npm run web          # expo start --web --clear
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
```

---

## 4. Testing on a physical phone

### Prerequisites

- Install **Expo Go** on your phone:
  - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
  - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- Expo Go supports **SDK 55** (the version this project uses). ✓

### Steps

1. In your Codespace, run `expo-tunnel`
2. Wait for the terminal to show `Tunnel ready` and a QR code
3. Open **Expo Go** on your phone
4. Tap **Scan QR code** and scan the QR in the terminal
5. The app loads over the tunnel — no shared WiFi needed

> **Tip:** If you don't see the QR code in the terminal, run `tunnel-url` to print just the URL. You can also manually enter it in Expo Go under "Enter URL manually".

### Fast Refresh

Once the app is open, **Fast Refresh works automatically**. Edit any file in the Codespace editor and the phone updates in real time — no rebuild needed.

---

## 5. Building with EAS (GitHub Actions)

Builds are triggered **automatically on every push**. No manual steps required.

### Build profiles

| Branch | Profile | What it produces |
|---|---|---|
| `main` / `master` | `production` | App Store / Play Store binary (auto-increments version) |
| Any other branch | `preview` | Internal APK + iOS simulator build |

### What happens on push

1. GitHub Actions starts two parallel jobs: **Android** and **iOS**
2. Each job installs deps, authenticates with EAS, and submits a build request
3. EAS queues the build on its servers and the CI job exits immediately (`--no-wait`)
4. The binary compiles on EAS (takes 5–20 min)
5. Download from **[expo.dev/projects](https://expo.dev/projects)** when done

### Trigger a build manually

```bash
# In the Codespace or locally (requires EXPO_TOKEN env var)
eas build --platform android --profile preview --non-interactive
eas build --platform ios     --profile preview --non-interactive
eas build --platform all     --profile production --non-interactive
```

### Check build status

```bash
eas build:list               # list recent builds
eas build:view <build-id>    # details for a specific build
```

Or open the EAS dashboard: **[expo.dev/accounts/\<your-username\>/projects/vocolens/builds](https://expo.dev)**

---

## 6. Live preview on a PR

When you open a pull request and add the **`preview` label**:

1. GitHub Actions starts a Codespaces-like runner
2. Installs deps and launches `expo start --tunnel`
3. Captures the public ngrok URL
4. Posts a comment on the PR with:
   - The tunnel URL
   - A direct deep-link for Expo Go
5. The tunnel stays alive for **30 minutes** so reviewers can test

**To trigger a new preview:** remove and re-add the `preview` label.

> **Note:** Each runner has a fresh environment, so the tunnel URL changes on each run.

---

## 7. Project structure — cloud files

```
Vocolens-app/
├── .devcontainer/
│   ├── Dockerfile              # Node 22 + ngrok + build tools
│   ├── devcontainer.json       # Port forwarding, VS Code extensions, env vars
│   └── postCreateCommand.sh    # Auto-run on container create: install + patch
│
├── .github/
│   └── workflows/
│       ├── eas-build.yml       # Automatic EAS builds on push / PR
│       └── expo-preview.yml    # Live tunnel QR on PR (triggered by label)
│
├── app.json                    # Expo config (SDK 55, plugins)
├── eas.json                    # EAS build profiles (development/preview/production)
├── metro.config.js             # Metro with Watchman disabled (cloud-safe)
└── package.json                # scripts: tunnel, lan, web, typecheck, lint
```

---

## 8. Secrets reference

### GitHub Actions secrets
*(Settings → Secrets and variables → Actions)*

| Secret | Purpose | Required |
|---|---|---|
| `EXPO_TOKEN` | Authenticates EAS CLI in CI | ✅ Yes |
| `NGROK_TOKEN` | Avoids ngrok connection limits in preview workflow | Optional |

### Codespaces secrets
*(github.com/settings/codespaces)*

| Secret | Purpose | Required |
|---|---|---|
| `EXPO_TOKEN` | Authenticates EAS CLI in interactive Codespace sessions | ✅ Recommended |

---

## 9. Troubleshooting

### "Port 8081 is being used by another process"

This is expected in hosted environments — port 8081 is reserved by the container infrastructure. The project is pre-configured to use port **8084** via `RCT_METRO_PORT=8084`. This is handled automatically. If you still see the message, run:

```bash
RCT_METRO_PORT=8084 EXPO_NO_PROMPT=1 npx expo start --tunnel --clear
```

### Metro doesn't start / exits silently

The `postCreateCommand` patches the Expo CLI port resolver. If you reinstall dependencies, re-run the patch:

```bash
bash .devcontainer/postCreateCommand.sh
```

### "EXPO_TOKEN is not set" in CI

Add it as a GitHub Actions secret (see [§ 8](#8-secrets-reference)). The secret name must be exactly `EXPO_TOKEN`.

### Expo Go says "Something went wrong"

The project uses **Expo SDK 55** (stable). Make sure your Expo Go app is up to date from the App Store / Play Store. SDK 55 is supported by the current Expo Go release.

### ngrok tunnel URL not appearing

ngrok has a connection limit on the free tier. Add an `NGROK_TOKEN` secret (see above) to authenticate and remove the limit.

### Build fails with "eas: not found"

The devcontainer installs `eas-cli` globally. If you're running outside a Codespace, install it:

```bash
npm install -g eas-cli
```

---

## Local development (optional)

Local setup is **not required** but works if preferred:

```bash
# Clone
git clone https://github.com/Kasra1637/Vocolens-app.git
cd Vocolens-app

# Install (requires Node 22 + npm)
npm install --legacy-peer-deps

# Start (tunnel mode — QR code works from any network)
npm run tunnel

# Or LAN mode (phone must be on same WiFi)
npm run lan
```

All scripts include `RCT_METRO_PORT=8084` so they work even if 8081 is occupied on your machine.
