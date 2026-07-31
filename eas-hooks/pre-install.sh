#!/bin/bash
#
# Writes the client-safe EXPO_PUBLIC_* build vars into .env for Metro to inline.
#
# SECURITY — provider secrets must never be written here.
#
#   EXPO_PUBLIC_DEEPGRAM_API_KEY and EXPO_PUBLIC_OPENROUTER_API_KEY are real,
#   billable provider credentials. Anything Metro inlines is recoverable from
#   the shipped bundle with `unzip` + `strings`, so writing them here would
#   publish them to every user who downloads the app.
#
#   Neither is needed on the device: transcription goes through the Worker's
#   POST /api/transcribe and analysis through /api/journal/*, both of which
#   hold the provider keys as server-side bindings. See the matching comment
#   in app.config.js.
#
#   This script also must not `cat .env`, because EAS build logs are visible to
#   anyone with access to the project.
#
set -euo pipefail

echo "Writing .env from EAS environment variables..."
: > .env

# Client-safe vars only. Add new entries here deliberately, never by globbing
# EXPO_PUBLIC_* — that is how provider secrets get leaked back in.
for var in \
  EXPO_PUBLIC_ADAPTY_KEY \
  EXPO_PUBLIC_BACKEND_URL \
  EXPO_PUBLIC_VOCOLENS_API_KEY \
  EXPO_PUBLIC_ALLOW_TESTER_SKIP
do
  value="${!var:-}"
  if [ -n "$value" ]; then
    printf '%s=%s\n' "$var" "$value" >> .env
    echo "  set $var"
  else
    echo "  skip $var (not set)"
  fi
done

# Names only — never values.
echo "Wrote $(wc -l < .env) var(s) to .env"
