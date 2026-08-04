# Vocolens Backend

> **TL;DR — `src/worker.js` is the only backend that serves production traffic.**
> `src/index.ts` (Hono) is **not deployed** and does not currently run.

This directory contains two separate, overlapping backend implementations. That
is a known piece of technical debt; this file records which is which so the
distinction isn't rediscovered from scratch each time.

## What actually serves production

**`src/worker.js`** — a single-file Cloudflare Worker.

- Deployed as the Worker `vocolens-api` via `wrangler.toml` (`main = "src/worker.js"`),
  built by Cloudflare's Git-integrated *Workers Builds* on push.
- Serves `https://vocolens-api.kasrammarvel.workers.dev`, which is also the
  hard-coded default base URL in the mobile client (`src/lib/api/client.ts`).
- Secrets (`OPENROUTER_API_KEY`, `DEEPGRAM_API_KEY`, `VOCOLENS_API_KEY`) are set
  in the Cloudflare dashboard / via `wrangler secret put` — never in this repo.

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/`, `/health` | none | liveness |
| GET | `/api/journal/status` | none | reports whether the OpenRouter key is configured |
| GET | `/api/usage/status` | `X-Api-Key` | authoritative monthly balance |
| POST | `/api/usage/commit` | `X-Api-Key` | redeems a reservation once an entry is saved — **charges usage** |
| POST | `/api/transcribe` | `X-Api-Key` | Deepgram `nova-2` STT — **reserves usage** |
| POST | `/api/analyze`, `/api/journal/analyze` | `X-Api-Key` | emotion analysis |
| POST | `/api/recommend`, `/api/journal/recommendation` | `X-Api-Key` | advice generation |
| POST | `/api/journal/weekly-reflection` | `X-Api-Key` | weekly digest |
| POST | `/api/journal/ai-completion` | `X-Api-Key` | generic completion |

Every `POST` requires a matching `X-Api-Key`, and fails closed if the server-side
key is unset. Any non-`POST` request to a path other than the health/status
endpoints returns 404.

All of the `POST` endpoints above cost money and are gated on the monthly
allowance — see [Usage metering](#usage-metering-the-300-minutemonth-cap).

## What is NOT deployed

**`src/index.ts` + `src/routes/*` + `src/env.ts` + `src/lib/openrouter.ts`** — a
Hono application.

Nothing builds, deploys, or successfully boots it:

- No deploy script references it. `wrangler.toml` points at `worker.js`, and
  `wrangler` isn't even a dependency here.
- It has no `serve()` bootstrap, so it would never listen on a port.
- `npm start` crashes immediately with `ERR_MODULE_NOT_FOUND`: the imports are
  extensionless (`"./routes/sample"`), which cannot resolve under
  `"type": "module"`.
- It doesn't typecheck. Both `index.ts` and `routes/journal.ts` import
  `generateRecommendation` from `lib/openrouter.ts`, which **does not export
  it** — so `/api/recommend` and `/api/journal/recommendation` reference a
  function that doesn't exist. `npx tsc --noEmit` reports this as TS2305.

It is now fully superseded: the usage endpoints it used to be the only reference
for have been implemented properly in `worker.js` on top of D1. Its
`src/routes/usage.ts` used an in-memory `Map`, which cannot work in Workers
anyway — isolates are ephemeral and distributed, so counts would be inconsistent
and would reset unpredictably.

Nothing depends on it any more, so it is safe to delete whenever you want to
close out the consolidation (step 5 below).

## Usage metering: the 300 minute/month cap

The cap is a **cost-control** mechanism — every audio second costs money at
Deepgram and OpenRouter — so it is enforced **server-side, in this Worker**. The
app's local counter is a display mirror and is treated as untrusted.

### Required one-time setup

The Worker **fails closed**: without the D1 binding it returns
`503 usage_metering_unavailable` for every paid endpoint rather than silently
serving unlimited free usage. So this must be done before/with the next deploy:

```bash
cd backend
wrangler d1 create vocolens-usage
# copy the printed database_id into wrangler.toml, replacing
# REPLACE_WITH_D1_DATABASE_ID
wrangler d1 execute vocolens-usage --remote --file=./schema.sql
```

### How it works

| Concern | Implementation |
|---|---|
| **What is billed** | `metadata.duration` from Deepgram's response — the actual decoded audio length, measured server-side inside `handleTranscribe`. |
| **When it is billed** | Only when the recording becomes a **saved journal entry**. See [Charged on save](#charged-on-save-not-on-transcribe) below. |
| **Why not the client's number** | A modified client would report `0`. The app never sends a duration — it only redeems an opaque ticket, so it can say *whether* a recording was saved, never *how long* it was. |
| **Where it's checked** | `checkUsageAllowed()`, invoked from the router for every path in `PAID_PATHS`. The check runs **before** the upstream call, so a capped user costs nothing. |
| **What's blocked at the cap** | All seven paid endpoints (transcribe + every OpenRouter route), with `402` and `{"error":"monthly_limit_reached"}`. `/api/usage/commit` is **not** gated: it spends nothing, and the entry that took the user over the cap must still be chargeable. |
| **Storage** | D1 (`DB` binding), tables `usage` (charged) and `usage_pending` (reserved). See `schema.sql`. |
| **Monthly reset** | Derived, not scheduled. Each row stores the `period` (`YYYY-MM`, UTC) its counter belongs to; a request in a new period resets `period_seconds` as part of the same atomic `UPDATE`. No cron job that can fail. |
| **Concurrency** | Increment and rollover happen in a single `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, so simultaneous requests cannot lose each other's writes. Commit claims its reservation with `DELETE ... RETURNING`, so a replayed or concurrent commit cannot double-charge. |
| **Privacy** | Only a SHA-256 `subject_hash` is stored, never a raw install id. |
| **Survives reinstall / cleared data** | **No, deliberately.** The subject is a per-install UUID in AsyncStorage, so a fresh install starts from a full 300 minutes. See [Identity](#identity-per-install-not-per-handset). |

`GET /api/usage/status` (requires `X-Api-Key`) returns the authoritative
balance, including `resetsAt`, and is what the app renders. It is read-only —
opening the app can never consume allowance.

### Charged on save, not on transcribe

Transcribing and saving are separate steps, and a transcript can be produced and
then never become an entry: the transcript comes back empty ("no speech
detected"), the user backs out of the reflection screen, emotion analysis fails,
or a transport error makes the app re-upload the same audio. Charging inside
`/api/transcribe` meant each of those permanently spent ~1 minute of allowance
(the UI nudges toward recordings of ≥50 s) — so a brand-new install that had
never saved an entry could already report **297 of 300 minutes remaining**.

So the charge is two-phase:

1. `POST /api/transcribe` writes the Deepgram-measured duration to
   `usage_pending` and returns `usageTicket`. `usage.period_seconds` is untouched,
   so the balance the app displays does not move. A silent recording gets **no**
   ticket, since it cannot become an entry.
2. `POST /api/usage/commit` with `{ "ticket": "..." }` redeems that reservation
   once the app has persisted the entry, moving the seconds into `usage`.

Properties worth knowing:

* **Reservations expire** after `PENDING_TTL_SECONDS` (2 h) and are purged, so an
  abandoned recording eventually costs nothing.
* **Live reservations still count toward the cap.** `monthlyMinutesUsed` (what the
  user sees) counts charged minutes only, while `isAtLimit` counts charged +
  reserved. That keeps "never commit" from becoming unlimited free transcription,
  at the cost of the two figures diverging briefly. `pendingMinutes` is returned
  for support/debugging.
* **Unknown, expired, or already-redeemed tickets are not errors.** Commit returns
  `200` with `committed: false` and the current balance, so the app can retry
  safely.
* **A failed commit under-counts, in the user's favour.** That is the intended
  direction to fail: an entry the user has already saved must never break because
  a counter could not be updated.

### Identity: per-install, not per-handset

The subject was previously derived from Android SSAID / iOS IDFV precisely
*because* those survive uninstall and "clear app data". That made the allowance
unresettable, but it also meant a genuinely fresh install inherited every minute
ever charged against that handset — a phone that had the app installed, used, and
removed showed the next install a partly-spent allowance it could not explain.

`src/lib/device-id.ts` now uses a random UUID in AsyncStorage, which lives in the
app sandbox and is removed with the app. SecureStore is avoided on purpose: iOS
Keychain items can outlive the app that wrote them, which would reintroduce the
same inheritance.

The trade-off is explicit — reinstalling grants a fresh allowance. The cap is cost
control, not DRM, and penalising every new owner of a second-hand phone to
inconvenience a determined reinstaller is the wrong trade. The real fix is a
server-side account or verified subscription id as the subject, which the opaque
`subject_hash` already allows without a migration.

### Residual gaps — please read

These are **not** fixed by this change and need product decisions:

1. **Cross-install is not enforced.** There is no server-side account: auth is a
   local PIN/biometric, and Adapty is in mock mode with `identifyUser()` never
   called. Metering is therefore per-install, so a user with a second phone — or
   one who reinstalls — gets a second allowance. This is now a deliberate,
   documented trade rather than an accident (see
   [Identity](#identity-per-install-not-per-handset)). The schema stores an opaque
   `subject_hash` specifically so the subject can be switched to an
   account/subscription id later with no migration — that swap is the real fix.

2. **The web build bypasses metering entirely.**
   `src/lib/services/deepgram-realtime-service.ts` opens a WebSocket **straight
   to Deepgram** using `EXPO_PUBLIC_DEEPGRAM_API_KEY`, which is embedded in the
   client bundle. This path never touches the Worker, so it is unmetered, and the
   extracted key can be used with no app at all. Fix: proxy web streaming audio
   through the Worker and remove the key from the bundle. Until then, treat the
   web build as uncapped.

3. **`X-Device-Id` is client-supplied and `X-Api-Key` is a single shared secret**
   baked into the bundle. A determined user can rotate install ids to mint fresh
   allowances. Meaningful hardening requires per-user credentials (see #1);
   short of that, the IP fallback in `resolveSubject()` limits casual abuse.

   Note the IP fallback is a *shared* bucket: every caller that sends no or a
   malformed `X-Device-Id` from the same address is metered together. The app
   always sends a valid id (it generates one locally even if storage fails), so
   this should not be reached in practice — but a client that stops sending the
   header would see minutes it did not spend, pooled from others behind the same
   NAT.

4. **Overshoot is bounded, not eliminated.** The true audio length is only known
   after Deepgram responds, so a session that starts under the cap may finish
   over it. `MAX_AUDIO_SECONDS` (30 min) bounds the worst case per request.

5. **Uncommitted reservations count against the cap for up to 2 h.** A user who
   transcribes repeatedly without saving can be refused before the displayed
   figure reaches 300. This is the deliberate cost-control side of the two-phase
   charge; shortening `PENDING_TTL_SECONDS` narrows the window but leaves less
   slack for a slow reflection flow.

## Consolidation plan

Target end state: `worker.js` is the only backend, and the Hono app is deleted.

1. ~~Create a KV namespace (or D1 table) for usage and add the binding to
   `wrangler.toml`.~~ **Done** — D1 `vocolens-usage`, bound as `DB`.
2. ~~Port `/api/usage/record` and `/api/usage/status` from `src/routes/usage.ts`
   into `worker.js`.~~ **Done differently, on purpose.** `worker.js` owns
   `/api/usage/status`, and there is deliberately **no** `/api/usage/record`:
   accepting a client-reported duration would let a modified client report `0`.
   Usage is measured from Deepgram's own `metadata.duration` and charged via
   `/api/usage/commit`. Do not resurrect `/record`. `USAGE_LIMIT_MINUTES = 300`
   and the UTC `YYYY-MM` rollover are as specified.
3. ~~Verify both endpoints return 200.~~ **Done.**
4. Port anything else still wanted from the Hono app — most notably
   `analyzeTranscriptWithRetry`'s 3-attempt retry and the `audioBase64`
   multimodal path, neither of which `worker.js` has. Note that the Hono
   recommendation route is *not* a usable reference: the
   `generateRecommendation` it imports was never implemented. Use
   `handleRecommend` in `worker.js` instead.
5. Only then delete `src/index.ts`, `src/routes/`, `src/env.ts`,
   `src/lib/openrouter.ts`, and the Hono/zod dependencies from `package.json`.

Do steps 1–3 as their own deployable change before starting step 5, so a
rollback never leaves the usage endpoints missing.

## Divergences to be aware of while both exist

These matter if logic is copied between the two implementations:

- **`personalizationContext`**: the client sends it to `/api/analyze` and
  `worker.js` appends it to the prompt. The Hono `analyzeSchema` has no such
  field, so zod would silently strip it.
- **Retry / audio**: only the Hono lib has `analyzeTranscriptWithRetry` and the
  `audioBase64` prosody path.
- **Response validation**: `worker.js` post-validates results (minimum advice
  length with a hard-coded grounding fallback, `dominantEmotion` checked against
  the 8 base emotions); Hono returns the model output as-is.
- **Error codes**: `worker.js` uses 502 for upstream failures; Hono never
  returns 502.
- **Auth scope**: `worker.js` requires `X-Api-Key` on every `POST`; Hono only
  guards `/api/*` and exempts all `GET`s, leaving `GET /api/usage/status`
  unauthenticated.
- **Prompt copies**: the prompt text exists in both `worker.js` and
  `lib/openrouter.ts`. Edit both, or finish the consolidation.
