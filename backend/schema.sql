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


-- ─── Provisional (uncommitted) usage ────────────────────────────────────────
--
-- Transcribing audio and SAVING a journal entry are two separate steps, and the
-- user can abandon the flow in between: the transcript can come back empty, the
-- reflection screen can be backed out of, analysis can fail, or a transport
-- error can make the app re-upload the same file. Charging at transcription
-- time meant all of those permanently consumed the monthly allowance, so a
-- brand-new user who had not saved a single entry could already be shown 297 of
-- 300 minutes remaining.
--
-- So the charge is now two-phase:
--   1. /api/transcribe writes the Deepgram-measured duration here and hands the
--      app an opaque `ticket`. Nothing is added to `usage.period_seconds` yet,
--      so the balance the app displays does not move.
--   2. /api/usage/commit redeems that ticket once the entry has actually been
--      persisted on the device, moving the seconds into `usage`.
--
-- Rows that are never redeemed expire and are purged, so an abandoned recording
-- costs the user nothing. Live (unexpired) rows still count toward the cap while
-- they exist, so the two-phase flow cannot be abused to transcribe without
-- limit by simply never committing.
CREATE TABLE IF NOT EXISTS usage_pending (
  -- Opaque, server-generated ticket handed to the client. Server-generated so a
  -- client can neither forge a charge against another subject nor pick a value
  -- that collides with an existing row.
  ticket            TEXT PRIMARY KEY NOT NULL,

  -- Subject the seconds will be charged to. Commit requires a match, so a
  -- leaked ticket cannot be redeemed against someone else's balance.
  subject_hash      TEXT NOT NULL,

  -- Period the audio was transcribed in, 'YYYY-MM' (UTC).
  period            TEXT NOT NULL,

  -- Deepgram-measured audio seconds awaiting commit.
  seconds           REAL NOT NULL,

  created_at        TEXT NOT NULL,

  -- After this instant the ticket can no longer be redeemed and stops counting
  -- toward the cap.
  expires_at        TEXT NOT NULL
);

-- Sums live pending seconds for a subject when evaluating the cap.
CREATE INDEX IF NOT EXISTS idx_usage_pending_subject
  ON usage_pending (subject_hash, period);

-- Supports the opportunistic purge of expired tickets.
CREATE INDEX IF NOT EXISTS idx_usage_pending_expires
  ON usage_pending (expires_at);
