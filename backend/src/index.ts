import { Hono } from "hono";
import { cors } from "hono/cors";
import { sampleRouter } from "./routes/sample";
import { journalRouter } from "./routes/journal";
import { usageRouter } from "./routes/usage";
import { transcribeRouter } from "./routes/transcribe";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", cors({ origin: "*", credentials: true }));
app.use("*", logger());
app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/sample", sampleRouter);
app.route("/api/journal", journalRouter);
app.route("/api/usage", usageRouter);
app.route("/api/transcribe", transcribeRouter);

export default app;
