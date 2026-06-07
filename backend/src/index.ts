import { Hono } from "hono";
import { cors } from "hono/cors";
import { sampleRouter } from "./routes/sample";
import { journalRouter } from "./routes/journal";
import { usageRouter } from "./routes/usage";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", logger());
app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/sample", sampleRouter);
app.route("/api/journal", journalRouter);
app.route("/api/usage", usageRouter);

// ── Short-path aliases used by the frontend openrouter-service.ts ─────────────
// Frontend calls /api/recommend and /api/analyze — forward to the journal router
app.post("/api/recommend", (c) => {
  // Re-route: mutate path so journalRouter matches its "/recommendation" sub-route
  const url = new URL(c.req.url);
  url.pathname = "/recommendation";
  const rewritten = new Request(url.toString(), c.req.raw);
  return journalRouter.fetch(rewritten, c.env);
});

app.post("/api/analyze", (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/analyze";
  const rewritten = new Request(url.toString(), c.req.raw);
  return journalRouter.fetch(rewritten, c.env);
});

export default app;
