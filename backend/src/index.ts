import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import { sampleRouter } from "./routes/sample";
import { journalRouter } from "./routes/journal";
import { usageRouter } from "./routes/usage";
import { logger } from "hono/logger";
import {
  generateRecommendation,
  analyzeTranscriptWithRetry,
  isOpenRouterConfigured,
} from "./lib/openrouter";

// ── Cloudflare Worker env bindings type ───────────────────────────────────────
// Matches the secrets / vars configured in the Cloudflare dashboard for the
// vocolens-api Worker.  Add any new bindings here as you create them.
type WorkerEnv = {
  OPENROUTER_API_KEY?: string;
  DEEPGRAM_API_KEY?: string;
};

// Hono generic carries WorkerEnv so c.env is typed everywhere in this file
const app = new Hono<{ Bindings: WorkerEnv }>();

// ── initEnv middleware ────────────────────────────────────────────────────────
// Cloudflare Workers does NOT expose env bindings via process.env.
// This middleware runs on every request and copies the relevant bindings into
// globalThis so that module-level helpers (getApiKey / isOpenRouterConfigured)
// that don't have access to a Hono context can still read them.
app.use("*", async (c, next) => {
  const g = globalThis as Record<string, unknown>;
  if (c.env?.OPENROUTER_API_KEY) {
    g.__OPENROUTER_API_KEY = c.env.OPENROUTER_API_KEY;
  }
  if (c.env?.DEEPGRAM_API_KEY) {
    g.__DEEPGRAM_API_KEY = c.env.DEEPGRAM_API_KEY;
  }
  await next();
});

app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", logger());
app.get("/health", (c) => c.json({ status: "ok", model: "anthropic/claude-3.7-sonnet" }));

app.route("/api/sample", sampleRouter);
app.route("/api/journal", journalRouter);
app.route("/api/usage", usageRouter);

// ── Short-path aliases used by the frontend openrouter-service.ts ─────────────
// The frontend calls /api/recommend and /api/analyze directly.
// These handlers are identical to the ones in journalRouter but registered at
// the top-level app so Hono can match them without path-rewriting tricks.

const recommendSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  primaryEmotion: z.string().optional().default("happiness"),
});

app.post("/api/recommend", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const parsed = recommendSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  if (!isOpenRouterConfigured()) return c.json({ error: "OpenRouter API key not configured" }, 503);
  try {
    const result = await generateRecommendation(parsed.data.transcript, parsed.data.primaryEmotion);
    return c.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Recommendation failed";
    console.error("[/api/recommend]", msg);
    return c.json({ error: msg }, 500);
  }
});

const analyzeSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  audioBase64: z.string().optional(),
});

app.post("/api/analyze", async (c) => {
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  if (!isOpenRouterConfigured()) return c.json({ error: "OpenRouter API key not configured" }, 503);
  try {
    const result = await analyzeTranscriptWithRetry(parsed.data.transcript, 3, parsed.data.audioBase64);
    return c.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    console.error("[/api/analyze]", msg);
    return c.json({ error: msg }, 500);
  }
});

export default app;
