/**
 * Usage Tracking Routes
 * POST /api/usage/record  — record seconds used for a session
 * GET  /api/usage/status  — return current monthly usage (by device-id header)
 */

import { Hono } from "hono";
import { z } from "zod";

export const usageRouter = new Hono();

export const USAGE_LIMIT_MINUTES = 300;

interface DeviceUsage {
  monthlyMinutes: number;
  totalMinutes: number;
  lastResetMonth: string;
}

const usageStore = new Map<string, DeviceUsage>();

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getOrInit(deviceId: string): DeviceUsage {
  if (!usageStore.has(deviceId)) {
    usageStore.set(deviceId, {
      monthlyMinutes: 0,
      totalMinutes: 0,
      lastResetMonth: getCurrentMonth(),
    });
  }
  const record = usageStore.get(deviceId)!;
  const currentMonth = getCurrentMonth();
  if (record.lastResetMonth !== currentMonth) {
    record.monthlyMinutes = 0;
    record.lastResetMonth = currentMonth;
  }
  return record;
}

const recordSchema = z.object({
  seconds: z.number().int().min(1).max(7200),
});

usageRouter.post("/record", async (c) => {
  const deviceId = c.req.header("X-Device-Id") ?? "anonymous";

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Validation failed" }, 400);
  }

  const { seconds } = parsed.data;
  const minutes = seconds / 60;
  const record = getOrInit(deviceId);

  record.totalMinutes += minutes;
  record.monthlyMinutes += minutes;

  console.log(`[Usage] device=${deviceId} session_minutes=${minutes} monthly=${record.monthlyMinutes}/${USAGE_LIMIT_MINUTES}`);

  return c.json({
    success: true,
    monthlyMinutesUsed: record.monthlyMinutes,
    totalMinutesUsed: record.totalMinutes,
    limitMinutes: USAGE_LIMIT_MINUTES,
    remainingMinutes: Math.max(0, USAGE_LIMIT_MINUTES - record.monthlyMinutes),
    isAtLimit: record.monthlyMinutes >= USAGE_LIMIT_MINUTES,
  });
});

usageRouter.get("/status", (c) => {
  const deviceId = c.req.header("X-Device-Id") ?? "anonymous";
  const record = getOrInit(deviceId);

  return c.json({
    monthlyMinutesUsed: record.monthlyMinutes,
    totalMinutesUsed: record.totalMinutes,
    limitMinutes: USAGE_LIMIT_MINUTES,
    remainingMinutes: Math.max(0, USAGE_LIMIT_MINUTES - record.monthlyMinutes),
    isAtLimit: record.monthlyMinutes >= USAGE_LIMIT_MINUTES,
  });
});
