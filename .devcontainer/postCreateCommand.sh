#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# postCreateCommand.sh
#
# Runs once after the Codespace / devcontainer is first built.
# Purpose:
#   1. Install npm dependencies
#   2. Patch the Expo CLI port-resolution logic so it auto-accepts an
#      alternative port when 8081 is occupied (common in hosted envs)
#   3. Write convenient shell aliases to ~/.bashrc
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  Vocolens — Cloud Dev Environment Setup              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── 1. Install dependencies ───────────────────────────────────────────────────
echo "▶ Installing npm dependencies..."
npm install --legacy-peer-deps --no-fund --no-audit
echo "✓ Dependencies installed"

# ── 2. Patch Expo CLI port resolver ──────────────────────────────────────────
# Hosted environments (Codespaces, Kiro sandbox, etc.) have port 8081 occupied
# by system processes. The default Expo CLI behaviour asks the user interactively
# whether to use a different port. In non-interactive environments it aborts.
# This patch makes Expo silently accept the next free port when running with
# EXPO_NO_PROMPT=1 or when stdout is not a TTY.
EXPO_PORT_JS="$REPO_ROOT/node_modules/expo/node_modules/@expo/cli/build/src/utils/port.js"

if [[ -f "$EXPO_PORT_JS" ]]; then
  echo "▶ Patching Expo CLI port resolver..."

  # Back up the original
  cp "$EXPO_PORT_JS" "${EXPO_PORT_JS}.bak"

  # Replace the NON_INTERACTIVE branch: instead of returning null (which causes
  # Expo to skip starting Metro), return the alternative port.
  # Also add an explicit check for EXPO_NO_PROMPT and non-TTY environments.
  node - <<'EOF'
const fs = require('fs');
const path = process.env.EXPO_PORT_JS || '/dev/null';
if (!fs.existsSync(path)) process.exit(0);

let src = fs.readFileSync(path, 'utf8');

// Patch 1: NON_INTERACTIVE → return port instead of null
src = src.replace(
  /} else if \(error\.code === 'NON_INTERACTIVE'\) \{\s*_log\.warn\(_chalk\(\)\.default\.yellow\(error\.message\)\);\s*return null;/,
  `} else if (error.code === 'NON_INTERACTIVE') {
            _log.warn(_chalk().default.yellow(error.message));
            return port;`
);

// Patch 2: After logging the "Port X is..." message, auto-accept if no TTY
const autoAcceptSnippet = `
        // Auto-accept in non-interactive / CI / Codespaces environments
        if (process.env.EXPO_NO_PROMPT || process.env.CI || !process.stdout.isTTY) {
            _log.log(\`\\u203A Auto-selecting port \${port} (non-interactive environment)\`);
            return port;
        }`;

src = src.replace(
  /(_log\.log\(`\\u203A \$\{message\}`\);)/,
  `$1${autoAcceptSnippet}`
);

fs.writeFileSync(path, src, 'utf8');
console.log('Port resolver patched successfully.');
EOF
  echo "✓ Expo CLI port resolver patched"
else
  echo "⚠  Expo CLI port resolver not found at expected path — skipping patch"
  echo "   (This is OK if you are on a different Expo version)"
fi

# ── 3. Shell aliases ──────────────────────────────────────────────────────────
echo "▶ Writing shell aliases to ~/.bashrc..."

cat >> ~/.bashrc << 'BASHRC'

# ── Vocolens cloud dev aliases ─────────────────────────────────────────────────
alias expo-tunnel='RCT_METRO_PORT=8084 EXPO_NO_PROMPT=1 npx expo start --tunnel --clear'
alias expo-lan='RCT_METRO_PORT=8084 EXPO_NO_PROMPT=1 npx expo start --lan --clear'
alias expo-web='RCT_METRO_PORT=8084 EXPO_NO_PROMPT=1 npx expo start --web --clear'
alias eas-preview='eas build --platform all --profile preview --non-interactive --no-wait'
alias eas-prod='eas build --platform all --profile production --non-interactive --no-wait'

# Show the current ngrok tunnel URL (if running)
alias tunnel-url='curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    for t in d.get(\"tunnels\", []):
        if t[\"proto\"] == \"https\":
            print(\"Tunnel URL:\", t[\"public_url\"])
            print(\"Expo Go:   \", t[\"public_url\"].replace(\"https://\", \"exp+vocolens://expo-development-client/?url=\"))
except:
    print(\"No active tunnel found. Run: expo-tunnel\")
"'

export RCT_METRO_PORT=8084
export EXPO_NO_PROMPT=1
BASHRC

echo "✓ Shell aliases written"

# ── 4. Verify tools ───────────────────────────────────────────────────────────
echo ""
echo "▶ Verifying tool versions..."
echo "  node:      $(node --version)"
echo "  npm:       $(npm --version)"
echo "  expo:      $(npx expo --version 2>/dev/null || echo 'not found')"
echo "  eas:       $(eas --version 2>/dev/null || echo 'not found')"
echo "  ngrok:     $(ngrok version 2>/dev/null || echo 'not found')"
echo ""

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Setup complete! To start developing:               ║"
echo "║                                                      ║"
echo "║    expo-tunnel   ← QR code via tunnel (phone)       ║"
echo "║    expo-lan      ← LAN preview (same network)       ║"
echo "║    expo-web      ← Web preview in browser           ║"
echo "║    tunnel-url    ← Print active tunnel URL          ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
