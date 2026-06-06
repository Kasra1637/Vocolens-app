/**
 * Journal Analysis Routes
 * POST /api/journal/analyze - Analyze transcript (+ optional audio) with GPT-4o
 * GET  /api/journal/status  - Check OpenRouter auth status
 */

import { Hono } from "hono";
import { z } from "zod";
import {
  analyzeTranscriptWithRetry,
  isOpenRouterConfigured,
  generateWeeklyReflection,
  generateAIEmotionalAnalysis,
  generateRecommendation,
} from "../lib/openrouter";

export const journalRouter = new Hono();

// GET /api/journal/status - Auth check
journalRouter.get("/status", (c) => {
  const configured = isOpenRouterConfigured();
  return c.json({
    openrouter: configured ? "connected" : "not_configured",
    model: "openai/gpt-4o-audio-preview (with gpt-4o text fallback)",
    baseUrl: "https://openrouter.ai",
    status: configured ? "ok" : "missing_api_key",
  });
});

// POST /api/journal/analyze - Deep emotional analysis via GPT-4o audio model
const analyzeSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  // Optional base64-encoded WAV audio for prosody analysis via GPT-4o audio model
  audioBase64: z.string().optional(),
});

journalRouter.post("/analyze", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  }

  const { transcript, audioBase64 } = parsed.data;

  if (!isOpenRouterConfigured()) {
    return c.json(
      { error: "OpenRouter API key not configured on server" },
      503
    );
  }

  try {
    const result = await analyzeTranscriptWithRetry(transcript, 3, audioBase64);
    console.log("Chart Data Updated");
    return c.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    console.error("Journal analysis error:", message);
    return c.json({ error: message }, 500);
  }
});

// POST /api/journal/weekly-reflection - Generate weekly narrative digest
const weeklyReflectionEntrySchema = z.object({
  transcript: z.string(),
  primaryEmotion: z.string(),
  emotionIntensity: z.number(),
  topics: z.array(z.string()),
  createdAt: z.string(),
  title: z.string(),
});

const weeklyReflectionSchema = z.object({
  entries: z.array(weeklyReflectionEntrySchema).min(1, "At least one entry required"),
  weekLabel: z.string(),
});

journalRouter.post("/weekly-reflection", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = weeklyReflectionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  }

  if (!isOpenRouterConfigured()) {
    return c.json({ error: "OpenRouter API key not configured on server" }, 503);
  }

  try {
    const result = await generateWeeklyReflection(parsed.data.entries as Parameters<typeof generateWeeklyReflection>[0], parsed.data.weekLabel);
    return c.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weekly reflection failed";
    console.error("Weekly reflection error:", message);
    return c.json({ error: message }, 500);
  }
});

// POST /api/journal/ai-completion - General AI completion endpoint
const aiCompletionSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});

journalRouter.post("/ai-completion", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = aiCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  }

  if (!isOpenRouterConfigured()) {
    return c.json({ error: "OpenRouter API key not configured on server" }, 503);
  }

  try {
    const { systemPrompt, userPrompt, temperature, maxTokens } = parsed.data;
    const result = await generateAIEmotionalAnalysis({ systemPrompt, userPrompt, temperature, maxTokens });
    return c.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI completion failed";
    console.error("AI completion error:", message);
    return c.json({ error: message }, 500);
  }
});


// POST /api/journal/recommendation — Generate a warm, personalised recommendation
const recommendationSchema = z.object({
  transcript: z.string().min(1, "Transcript is required"),
  primaryEmotion: z.string().optional().default("happiness"),
});

journalRouter.post("/recommendation", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = recommendationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  }

  if (!isOpenRouterConfigured()) {
    return c.json({ error: "OpenRouter API key not configured on server" }, 503);
  }

  try {
    const { transcript, primaryEmotion } = parsed.data;
    const result = await generateRecommendation(transcript, primaryEmotion);
    return c.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recommendation generation failed";
    console.error("Recommendation error:", message);
    return c.json({ error: message }, 500);
  }
});
