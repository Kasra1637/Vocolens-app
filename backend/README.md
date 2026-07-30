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
| POST | `/api/transcribe` | `X-Api-Key` | Deepgram `nova-2` speech-to-text |
| POST | `/api/analyze`, `/api/journal/analyze` | `X-Api-Key` | emotion analysis |
| POST | `/api/recommend`, `/api/journal/recommendation` | `X-Api-Key` | advice generation |
| POST | `/api/journal/weekly-reflection` | `X-Api-Key` | weekly digest |
| POST | `/api/journal/ai-completion` | `X-Api-Key` | generic completion |

Every `POST` requires a matching `X-Api-Key`, and fails closed if the server-side
key is unset. Any non-`POST` request to a path other than the health/status
endpoints returns 404.

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

It is kept in the tree for one reason only: **`src/routes/usage.ts` is the sole
implementation of the `/api/usage/*` endpoints**, which the client calls but the
Worker does not implement. Treat it as a reference spec, not as running code.

## Known gap: usage endpoints 404 in production

`src/lib/api/usage-service.ts` in the app calls:

- `POST /api/usage/record`
- `GET /api/usage/status`

Neither exists in `worker.js`, so both return `{"error":"Not found"}` (404). The
client degrades silently — it updates the local Zustand store first and only
logs a warning — so the 300-minute monthly cap is currently enforced
**client-side only** and is not authoritative across reinstalls or devices.

Porting these to the Worker needs durable storage (KV or D1). The Hono version
uses an in-memory `Map`, which is not viable in Workers: isolates are ephemeral
and distributed, so per-isolate state would produce inconsistent counts. Any
port must therefore add a KV/D1 binding to `wrangler.toml` first.

## Consolidation plan

Target end state: `worker.js` is the only backend, and the Hono app is deleted.

1. Create a KV namespace (or D1 table) for usage and add the binding to
   `wrangler.toml`.
2. Port `/api/usage/record` and `/api/usage/status` from `src/routes/usage.ts`
   into `worker.js`, backed by that store. Keep `USAGE_LIMIT_MINUTES = 300`.
   Prefer a UTC month key (`YYYY-MM`) for the rollover, matching the existing
   client logic.
3. Verify against the deployed Worker that both endpoints return 200 and that
   the client stops logging `[UsageService] Backend record failed: 404`.
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
