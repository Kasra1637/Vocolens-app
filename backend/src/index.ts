import { Hono } from "hono";
import { cors } from "hono/cors";
import "./env";
import { sampleRouter } from "./routes/sample";
import { journalRouter } from "./routes/journal";
import { usageRouter } from "./routes/usage";
import { logger } from "hono/logger";

const app = new Hono();

// CORS middleware - allow all origins for Blink ecosystem
app.use("*", cors({
  origin: "*",
  credentials: true,
}));

// Logging
app.use("*", logger());

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/journal", journalRouter);
app.route("/api/usage", usageRouter);

export default app;
