#!/bin/bash
# cleanup-watchable.sh
# Run this after `npm install` to stay under the container's inotify watcher limit (12288).
# Removes TypeScript type defs, native source trees, and test-only deps that Metro doesn't need.
set -e

echo "[cleanup] Removing @sinclair/typebox from jest nested modules..."
rm -rf /app/node_modules/@sinclair 2>/dev/null || true
find /app/node_modules -name "typebox" -path "*jest*" -type d -exec rm -rf {} + 2>/dev/null || true
find /app/node_modules -name "typebox" -path "*testing-library*" -type d -exec rm -rf {} + 2>/dev/null || true
find /app/node_modules -name "typebox" -path "*@types*" -type d -exec rm -rf {} + 2>/dev/null || true

echo "[cleanup] Removing TypeScript lib dirs from native packages..."
find /app/node_modules -maxdepth 3 -name "typescript" -path "*/lib/typescript" -type d -exec rm -rf {} + 2>/dev/null || true
find /app/node_modules -maxdepth 4 -name "typescript" -path "*/dist/typescript" -type d -exec rm -rf {} + 2>/dev/null || true

echo "[cleanup] Removing Android/iOS native source trees (only needed for EAS Build)..."
find /app/node_modules -maxdepth 3 -name "android" -type d -exec rm -rf {} + 2>/dev/null || true
find /app/node_modules -maxdepth 3 -name "ios" -type d -exec rm -rf {} + 2>/dev/null || true
rm -rf /app/node_modules/react-native/ReactAndroid 2>/dev/null || true
rm -rf /app/node_modules/react-native/ReactCommon 2>/dev/null || true

echo "[cleanup] Removing large C++ source dirs..."
find /app/node_modules -maxdepth 3 -name "cpp" -type d 2>/dev/null | while read d; do
  count=$(find "$d" -type d 2>/dev/null | wc -l)
  [ "$count" -gt 5 ] && rm -rf "$d" && echo "  Removed $d ($count dirs)"
done

TOTAL=$(find /app/node_modules -type d 2>/dev/null | wc -l)
echo "[cleanup] Done. Total node_modules dirs: $TOTAL (limit: 12288)"
if [ "$TOTAL" -gt 12000 ]; then
  echo "[cleanup] WARNING: Close to inotify limit. Metro may crash. Run cleanup again or remove more packages."
fi
