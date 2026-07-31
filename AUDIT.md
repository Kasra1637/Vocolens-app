# Vocolens — Pre-App Store Release Audit

Audit date: 30 July 2026 · Commit audited: `31bf0d6` · App version `1.0.0`

Every finding below was verified directly against the source, not inferred.
Severity key: **S1** = will be rejected or crashes · **S2** = broken/incorrect
behaviour a user will hit · **S3** = correctness, hygiene, maintainability.

---

## Verdict

**Do not submit yet.** The app's architecture and core journalling logic are
sound, but there are **6 S1 blockers**. Two of them (missing microphone usage
string, Adapty in mock mode) guarantee rejection, and three of them will give
away paid access for free in the shipped binary.

Build health at time of audit: `tsc --noEmit` reports **68 errors**;
`jest` reports **25 failed / 45 passed**.

---

## Progress log

Target platform is **Android / Google Play first** — iOS-only items are
deferred, not fixed.

| # | Item | Status |
|---|---|---|
| 1 | Microphone permission | ✅ Fixed for Android (`RECORD_AUDIO` declared). iOS `NSMicrophoneUsageDescription` deferred — not targeting iOS yet. |
| 2 | Adapty mock mode | ❌ **Open — needs your Adapty key + Play Console products** |
| 3 | `ALLOW_TESTER_SKIP` ships in production | ❌ **Open** |
| 4 | Free premium on product-load failure | ✅ Fixed — shows an error, keeps the paywall up |
| 5 | Terms/Privacy links + unreachable `legal`/`privacy-settings` | ❌ **Open** |
| 6 | Hardcoded USD fallback prices | ✅ Fixed — per-month prices computed from live SDK amounts |
| 7 | AI analysis discarded | ✅ Fixed — full analysis threaded through to the saved entry |
| 8 | Empty/failed transcript silently dropped | ✅ Fixed — visible message; `UsageLimitError` now propagates |
| 9 | Audio files never deleted | ✅ Fixed — deleted on entry delete and on all "delete all data" paths |
| 10 | `AudioPlayer` no error feedback | ✅ Fixed — error state in both full and compact modes |
| 11 | `settings-store` migration can throw | ✅ Fixed — null-guarded and version-aware |
| 12 | No PIN recovery / no throttle | ❌ Open |
| 13 | Entitlement local-only | ❌ Open (see privacy note below) |
| 14 | Secrets in client bundle | ❌ Open |
| 15 | Transcripts logged in release builds | ✅ Fixed — all journal content / file paths `__DEV__`-guarded |
| 16 | No usage-row deletion endpoint | ❌ Open |
| 17 | Two inconsistent delete flows | ❌ Open (audio cleanup added to both, but store coverage still differs) |
| 18 | `secure-storage.ts` claims AES, implements XOR | ❌ Open |
| 19 | Privacy policy inaccuracies | ❌ Open |
| 20 | Dead code + mock-transcript landmine | ✅ Fixed — `generateMockTranscript` removed (now fails loudly); dead `emotion-reflection/` tree deleted. Unreachable routes remain (tracked under #5). |
| 21 | Smaller correctness issues | ❌ Open |
| 22 | 68 tsc errors / 25 failing tests | ❌ Open |

### Privacy-model note

The product goal is **local-first: user data stays on the device.** Storage is
indeed local-only (AsyncStorage + SecureStore, no cloud sync). However **audio
and transcripts do leave the device** for processing — Deepgram for
transcription and OpenRouter for analysis, both proxied through the Worker.
That is inherent to the feature set, not a bug, but it means "everything stays
on your device" is accurate about *storage*, not about *processing*. The privacy
policy needs to state that distinction precisely (see #19).

---

## S1 — Release blockers

### 1. `NSMicrophoneUsageDescription` is missing → crash + automatic rejection
`app.config.js` has no `ios.infoPlist` block at all, and `expo-av` (which
requests the mic) is a dependency but **is not in `plugins`**, so its config
plugin never injects a default string.

```
$ grep -rn "infoPlist|NSMicrophone|RECORD_AUDIO|microphonePermission" app.config.js app.json eas.json
>>> NO MATCHES ANYWHERE <<<
```

The mic is genuinely requested at `src/lib/hooks/useRealtimeVoiceRecording.ts:178`
(`Audio.requestPermissionsAsync()`). On iOS, calling this without a purpose
string **terminates the process**. Recording is the app's core function, so this
fails on first use.

Fix:
```js
ios: {
  supportsTablet: true,
  bundleIdentifier: 'com.vocolens.app',
  infoPlist: {
    NSMicrophoneUsageDescription:
      'Vocolens records your voice so it can transcribe your journal entry and analyse how you are feeling.',
  },
},
android: { package: 'com.vocolens.app', permissions: ['RECORD_AUDIO'] },
```

### 2. Adapty is in mock mode — no real purchase is possible (3.1.1)
`src/lib/adaptyClient.ts`:
```ts
const PLACEHOLDER_ADAPTY_KEY = "PLACEHOLDER_ADAPTY_PUBLIC_KEY";   // :63
// :69  falls back to the placeholder when EXPO_PUBLIC_ADAPTY_KEY is unset
// :96  const usingMock = apiKey === PLACEHOLDER_ADAPTY_KEY;
// :103 adapty.enableMock();      ← NOT gated on __DEV__
```
`isUsingMockMode()` is exported at `:73` and **never called anywhere**, so
nothing warns or disables the CTA.

If `EXPO_PUBLIC_ADAPTY_KEY` is not set as an EAS secret, the **release** build
runs `enableMock()`: the reviewer taps "Start my free trial", no StoreKit sheet
appears, and premium is granted locally. That is a 3.1.1 rejection, and no real
revenue is collected.

### 3. A "Skip — I'm a tester" button ships **only in production**
`src/components/onboarding/PaywallScreen.tsx:52` and
`src/components/SubscriptionLapsedPaywall.tsx:52`:
```ts
const ALLOW_TESTER_SKIP = true;   // comment says: flip to false before submitting
```
Rendered at `PaywallScreen.tsx:617` / `SubscriptionLapsedPaywall.tsx:471`:
```tsx
{ALLOW_TESTER_SKIP && !__DEV__ && (   // ← !__DEV__ means PRODUCTION ONLY
  <Pressable onPress={() => { setSubscription(true, "yearly"); nextStep(); }}>
    <Text>Skip — I'm a tester</Text>
```
Note the inverted guard: this button is **invisible in development and visible
in the App Store build**. Set `ALLOW_TESTER_SKIP = false` (or delete both blocks).

### 4. Premium is granted free whenever products fail to load
`PaywallScreen.tsx:316`, `:340`; `SubscriptionLapsedPaywall.tsx:200`, `:218`:
```ts
if (!pkg) { grantAccess(selectedPlan); return; }
```
Any Adapty misconfiguration, network failure, or missing App Store Connect
product silently unlocks the app. This must show an error and keep the paywall up.

### 5. Terms/Privacy links point off-app; the real legal screen is unreachable
The paywalls link to `https://vocolens.com/terms` and `/privacy`
(`PaywallScreen.tsx:589,599`). Meanwhile `src/app/legal.tsx` — 799 lines of
genuine, detailed Privacy Policy and Terms — is registered in `_layout.tsx:86`
but has **no navigation to it anywhere**:
```
$ grep -rn '/legal' src/ --include=*.tsx | grep -v app/legal.tsx
>>> NO NAVIGATION TO /legal ANYWHERE <<<
```
Guideline 3.1.2 requires functional EULA + Privacy links on the paywall. Either
publish those two web pages before submitting, or point the paywall at the
in-app screen. Same for `privacy-settings.tsx` (654 lines, only referenced by
its own route registration) — which is also where **account deletion** lives, so
5.1.1(v) is currently unreachable from the UI.

### 6. Hard-coded USD prices shown when the SDK returns nothing
`PaywallScreen.tsx:55-57` → `$9.99 / $24.99 / $79.99`, used as
`yearlyPkg?.price?.localizedString ?? YEARLY_PRICE` (`:402-404`). In mock mode
(#2) that fallback is always what the user sees, so a non-US reviewer is shown
prices in the wrong currency that don't match App Store Connect — 3.1.2.
`YEARLY_PER_MONTH`/`THREE_MONTH_PER_MONTH` are static strings that are never
recomputed from live prices.

---

## S2 — Functional defects users will hit

### 7. The AI analysis is computed, paid for, then thrown away (default path)
`PendingReflection` (`src/lib/state/reflection-store.ts:4-18`) carries only
`transcript, audioUri, duration, suggestedEmotions, suggestedBodySensations,
initialValence, initialArousal, initialDistress, conversationTopic,
conversationPrompt, aiTitle`.

It has **no field** for `emotionScores`, `emotionIntensityLabels`, `topics`,
`analysis`, `reflection`, `aiTopThreeEmotions`, `aiBlendedEmotions`,
`aiAmbivalenceFlags`. Since `emotionReflectionMode` defaults to `'full'`
(`settings-store.ts:39`), every normal entry is saved through the
`reflectionOverride` branch, which hardcodes:
```ts
topics: ["reflection"],                                            // journal-service.ts
analysis: "Journal entry recorded with user reflection.",
suggestedBodySensations: [],
```
Consequences: `EmotionBreakdownCard` never renders (its guard needs
`aiTopThreeEmotions`), per-emotion score bars degrade to a fallback,
topic-based insights are meaningless, and every entry's "analysis" is the same
canned sentence. The branch that *would* have preserved the full analysis
(`preTranscribedText` only) is unreachable — no caller omits the override.

This is the single biggest product-quality gap: you pay OpenRouter for a rich
analysis on every entry and discard most of it.

### 8. Empty or failed transcript: one haptic buzz, entry silently dropped
`src/app/(tabs)/index.tsx:454-458`:
```ts
} else {
  console.log("No transcript available");
  setRecordingState("idle");
  warningHaptic();
}
```
The user records ≥50 s (`MIN_RECORDING_SECONDS = 50`), gets a buzz, and
everything is discarded with no explanation and no retry — while the server has
**already metered the minutes** from Deepgram's measured duration. Worse, a
`UsageLimitError` raised during transcription is caught and downgraded inside
`useRealtimeVoiceRecording.ts:449-455`, so the dedicated limit alert never fires
for the transcription step.

### 9. Audio recordings are never deleted — growth, orphans, and a privacy gap
There is exactly one `deleteAsync` in `src/`, and it is for temp export files:
```
$ grep -rn "deleteAsync" src/
src/lib/export-journal.ts:146
```
`journal-store.ts:100-104` `deleteEntry` only filters the array. So:
- Deleting an entry orphans its `.m4a`/`.wav` permanently.
- Abandoned flows (empty transcript, reflection dismissed, save failure) orphan files.
- "Delete all data" leaves every raw voice recording on disk — contradicting
  `legal.tsx` and undermining 5.1.1(v).
- Files are written to the **cache** directory (no explicit path passed to
  `new Audio.Recording()`), so the OS may purge them while entries still
  reference the path → playback silently breaks.
- iOS 16-bit LPCM WAV is ≈1.9 MB/min and the UI pushes ≥50 s per entry.

### 10. `AudioPlayer` gives no feedback when the file is gone
`src/components/AudioPlayer.tsx` catch block logs to console only — no error
state, no UI. Tapping Play on a purged/orphaned recording buzzes and stays at
`0:00 / 0:00` with no explanation. The parent gates on `entry.audioUri &&`
(the *string*), never on file existence.

### 11. `settings-store` migration can throw and break rehydration
`src/lib/state/settings-store.ts:57-62` — `version: 3`, but:
```ts
migrate: (persisted: any) => {
  const { timeFormat: _dropped, setTimeFormat: _droppedFn, ...rest } = persisted as any;
  return { ...DEFAULT_SETTINGS, ...rest };
},
```
It never receives/checks `version` (so it cannot tell v1 from v2 data), and
object-rest destructuring of `null`/`undefined` **throws**. Every other store in
the project guards with `persisted?.x ?? default`. Fix: `(persisted ?? {})`.

### 12. No PIN recovery, and no brute-force throttle
- `grep -rn -i "forgot" src/` finds no recovery UI. A user who forgets their
  4-digit PIN and whose biometrics fail is **permanently locked out**, and the
  only escape is reinstalling — which destroys all journal data (local-only, no
  backup). Reviewers commonly flag an unpassable lock screen under 2.1.
- `verifyPin` (`auth-service.ts:299-315`) hashes and compares with no delay or
  attempt limit, so a 4-digit PIN is exhaustible in ≤10,000 tries by anyone
  holding the device.
- `pin-store.ts:41` stores the **plaintext PIN** in a field named `pinHash`
  (in-memory only, excluded from `partialize`, but the name is misleading and
  it's visible in a heap dump).

### 13. Entitlement is a local boolean with no server validation
`subscription-store.ts` persists `{ hasSubscription, planType }` as plain JSON
in AsyncStorage, and `AuthGate.tsx:226` gates the whole app on that flag. It is
trivially spoofable on a jailbroken device and is **lost on reinstall** (the user
must use Restore, which only works once #2 is fixed). No receipt validation
exists server-side.

---

## S3 — Security, privacy, hygiene

### 14. Three real secrets are embedded in the client bundle
`app.config.js:74-105` injects all `EXPO_PUBLIC_*` values into `extra`, and
`scripts/write-env.js` funnels every such env var into a `.env` that Metro
inlines. All are recoverable with `unzip` + `strings`:

| Variable | Status |
|---|---|
| `EXPO_PUBLIC_DEEPGRAM_API_KEY` | **Real secret, actively used from the device.** `deepgram-realtime-service.ts:174` opens `wss://api.deepgram.com` with it as the WebSocket subprotocol token (web realtime path). Anyone can extract it and bill your Deepgram account. |
| `EXPO_PUBLIC_VOCOLENS_API_KEY` | **Real secret, load-bearing.** It is the Worker's *only* auth. Extracting it grants unlimited free use of your Deepgram + OpenRouter spend. |
| `EXPO_PUBLIC_OPENROUTER_API_KEY` | **Real secret, injected for nothing** — no `src/` reader remains; the Worker holds its own binding. Delete this line. |
| `EXPO_PUBLIC_BACKEND_URL`, `EXPO_PUBLIC_ADAPTY_KEY` | Not secrets. Fine. |

Note this also means the **web build bypasses the usage meter entirely** — the
realtime path talks straight to Deepgram, never touching the Worker.

### 15. Transcripts and audio paths are logged in release builds
`babel.config.js` has no `transform-remove-console`, and there are no `__DEV__`
guards on:
- `useRealtimeVoiceRecording.ts:149` — logs transcript content
- `:397`, `:448` — logs transcript content
- `journal-service.ts:534` — logs transcript content
- `index.tsx:381` — logs the full on-device audio path

All readable via Console.app / `adb logcat`. Add
`['transform-remove-console', { exclude: ['error', 'warn'] }]` for production.

### 16. Server-side usage rows cannot be deleted
The deployed Worker stores usage in D1 keyed on a SHA-256 of the device id
(Android SSAID / iOS IDFV — chosen specifically to survive reinstall). There is
**no delete/purge endpoint**:
```
$ grep -niE "delete|purge|erase" backend/src/worker.js
>>> NO deletion endpoint in the deployed Worker <<<
```
So "delete my account" leaves a server-side row tied to a persistent hardware
identifier. Add `DELETE /api/usage` and call it from the deletion flows.

*(Correction to a common misreading: `backend/src/routes/usage.ts` — the
in-memory `Map` version with a bypassable cap — belongs to the **dead, undeployed
Hono app**. The deployed `worker.js` correctly uses D1 with atomic increments.)*

### 17. Two delete flows that do different things
`privacy-settings.tsx:146` `confirmDeleteAccount` does **not** call
`resetSettings()`, `clearCorrections()`, `clearSubscription()`,
`disableBiometric()`, or `resetOnboarding()` — so `emotion-corrections` (which
stores free-text reasons and quoted user phrases), `settings-storage`,
`subscription-store`, `biometric-storage` and `onboarding-storage` (including
`userName`) all survive, despite the screen promising to delete "all entries,
statistics, achievements, and security settings". `settings.tsx:353`
`confirmResetAllData` is the more complete one. Also never removed:
`vocolens_install_id` and `app_encryption_key` in SecureStore
(`clearAllSecureData()` exists and is never called).

Additionally `privacy-settings.tsx` `handleExportData` writes an **unencrypted
JSON of every transcript** to `documentDirectory` and never deletes it — on iOS
that is iCloud-backed, contradicting the policy's "no cloud sync, no
server-side backup" claim. (`export-journal.ts` correctly uses `cacheDirectory`.)

### 18. `secure-storage.ts` claims AES-256 but implements repeating-key XOR
`src/lib/secure-storage.ts:34-51` is `byte ^ keyByte`. The real protection is
SecureStore underneath, so this is not a break — but the file header and the
marketing language in `legal.tsx` overstate it. Reword or implement real crypto.

### 19. Privacy policy inaccuracies to correct before submission
`legal.tsx` is otherwise strong, but: it claims Deepgram/OpenAI "receive no
personally identifying information" (the audio and transcript *are* the personal
data); it never names **OpenRouter**, an actual processor in the chain; it says
data is local-only with no server-side storage (contradicted by #16); it says the
user can delete the local audio file (contradicted by #9); and it names
**GPT-4o** while the backend reports `openai/gpt-5.4-mini`. App Privacy labels
should declare Audio Data, User Content, Device ID, Purchases.

### 20. Dead code, including one dangerous landmine
- **`generateMockTranscript()`** (`journal-service.ts:543,566`) fabricates
  journal text on Deepgram failure. It sits in the currently-unreachable
  `audioUri`-only branch, but if that branch ever becomes reachable the app will
  save invented content as the user's own journal entry. **Delete it.**
- `EmotionReflectionScreen` + the whole `src/components/emotion-reflection/`
  tree is dead: `setShowReflection(true)` is never called (only `useState(false)`
  and two `setShowReflection(false)`). Superseded by `/reflection`.
- `createJournalEntry` branches B and C are unreachable.
- Routes `legal`, `privacy-settings`, `modal` are registered but unreachable.
- `cancelRecording()` is implemented but never wired to any UI — there is no way
  to discard a recording in progress.
- `PendingReflection.suggestedBodySensations` and `.initialDistress` are set but
  never read.

### 21. Smaller correctness issues
- **`recordingDurationRef` is never reset** in `startRecording` (only
  `setDuration(0)`), so a recording stopped before the first 1 s tick saves the
  *previous* session's duration → wrong entry duration, wrong stats, wrong
  "longest session" badge.
- **"Entry not found" is a dead end** (`entry-detail.tsx`) — text only, no back
  button, header rendered after the early return, `headerShown: false`.
- **Reflection X discards a 50 s recording with no confirmation.**
- **Tab-switching mid-recording** doesn't stop the recorder (`reset()` only
  clears state), leaking an active `Audio.Recording`.
- `useDeleteEntry` doesn't invalidate `badges`, so badge counts can stay stale.
- Editing an entry's transcript changes neither `entries.length` nor
  `entries[0].createdAt`, so the AI-insight cache key doesn't change and insights
  keep the pre-edit analysis forever.
- `settings.tsx` "cancel subscription" opens a **Google Play** URL with
  Play-Store wording even on iOS.
- `app.json` still sets `usesCleartextTraffic: true` while `app.config.js` sets
  `false`. `app.config.js` wins, but delete `app.json` to remove the footgun.
- `expo-image-picker` is a dependency but unused — remove it rather than ship a
  linked framework with no purpose string.
- `expo-notifications` is used but not in `plugins` (no icon/sound config).

### 22. Test suite and type health
- **68 `tsc` errors.** Dominated by `TS7006` implicit-`any` (18) and `TS2322`
  type mismatches (16), concentrated in `openrouter-service.ts`, chart
  components, and third-party prop typings. None are fatal to the bundle
  (Metro/Babel strips types), but they mean the type system is not protecting
  these paths.
- **25 failing tests / 45 passing.** All failures trace to one cause:
  `Crypto.CryptoDigestAlgorithm` is `undefined` in the test environment
  (`pin-hash.ts:39`) — an incomplete `expo-crypto` mock. The practical effect is
  that **the PIN/auth security code is effectively untested**, which is exactly
  where you least want that (see #12). Fix the mock.
- `memory/PRD.md` is stale: its "Original Problem Statement" describes a Settings
  share button, not the product.

---

## Recommended order of work

**Must fix before submitting**
1. Add `NSMicrophoneUsageDescription` + Android `RECORD_AUDIO` (#1)
2. Set a real `EXPO_PUBLIC_ADAPTY_KEY`; verify a live sandbox purchase (#2)
3. `ALLOW_TESTER_SKIP = false` in both paywalls (#3)
4. Replace both `if (!pkg) grantAccess(...)` with an error path (#4)
5. Publish `/terms` + `/privacy`, or link the in-app `legal.tsx`; make
   `privacy-settings` reachable so account deletion exists (#5)
6. Remove `generateMockTranscript()` (#20)
7. Guard the `settings-store` migration against null (#11)
8. Strip `console.*` from production; remove transcript logging (#15)
9. Remove `EXPO_PUBLIC_OPENROUTER_API_KEY` from `extra` (#14)

**Strongly recommended before submitting**
10. Delete audio files on entry delete + "delete all data"; move recordings out
    of the cache dir (#9)
11. Surface empty/failed transcript to the user with a retry (#8)
12. Extend `PendingReflection` to carry the full analysis (#7)
13. Add a PIN attempt throttle and a documented recovery/reset path (#12)
14. Add `DELETE /api/usage` and call it on account deletion (#16)
15. Make the two delete flows identical and complete (#17)
16. Correct the privacy policy inaccuracies (#19)

**Follow-up**
17. Fix the `expo-crypto` test mock so the auth suite actually runs (#22)
18. Proxy the web realtime path through the Worker and remove the embedded
    Deepgram key (#14)
19. Delete dead code; add an "Entry not found" back button; reset
    `recordingDurationRef` (#20, #21)
20. Work down the 68 `tsc` errors (#22)
