-- Vocolens usage metering schema (Cloudflare D1)
--
-- Apply with:
--   wrangler d1 execute vocolens-usage --remote --file=./schema.sql
--
-- Why D1 and not KV:
--   The monthly cap is a cost-control mechanism, so the counter has to be
--   correct under concurrency. KV is eventually consistent (writes take up to
--   ~60s to propagate globally) and offers no atomic read-modify-write, so two
--   concurrent transcriptions could both read the same balance and each write
--   back a value that loses the other's increment. D1 is SQLite with a single
--   strongly-consistent primary and supports an atomic
--   INSERT ... ON CONFLICT DO UPDATE with arithmetic, which lets us increment
--   the counter AND perform the monthly rollover in one indivisible statement.

CREATE TABLE IF NOT EXISTS usage (
  -- Opaque SHA-256 of the caller-supplied subject (device id today, account id
  -- later). Hashed so the table holds no raw device identifiers.
  subject_hash      TEXT PRIMARY KEY NOT NULL,

  -- Billing period this row's `period_seconds` belongs to, as 'YYYY-MM' (UTC).
  -- When a request arrives with a different period, `period_seconds` resets.
  period            TEXT NOT NULL,

  -- Audio seconds consumed in `period`. REAL because Deepgram reports
  -- fractional seconds.
  period_seconds    REAL NOT NULL DEFAULT 0,

  -- Never reset. Useful for support and cost reconciliation.
  lifetime_seconds  REAL NOT NULL DEFAULT 0,

  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

-- Supports "who used what this month" cost reporting.
CREATE INDEX IF NOT EXISTS idx_usage_period ON usage (period);
