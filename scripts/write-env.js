/**
 * Writes client-safe EXPO_PUBLIC_* vars from the environment into .env so Metro
 * can inline them.
 *
 * SECURITY — this script must never write provider secrets.
 *
 *   Metro inlines anything named EXPO_PUBLIC_*, and inlined values are
 *   recoverable from the shipped bundle with `unzip` + `strings`. This script
 *   previously copied EVERY EXPO_PUBLIC_* var it found, which meant a provider
 *   key present in the shell (e.g. left over from a local experiment) would be
 *   silently embedded in a release build.
 *
 *   The keys below are real, billable credentials and are not needed on the
 *   device — transcription and analysis both go through the Worker, which holds
 *   them as server-side bindings. See app.config.js and eas-hooks/pre-install.sh.
 */

const fs = require('fs');

/** Never write these, even if present in the environment. */
const DENY_LIST = [
  'EXPO_PUBLIC_DEEPGRAM_API_KEY',
  'EXPO_PUBLIC_OPENROUTER_API_KEY',
];

const written = [];
const blocked = [];
let content = '';

Object.keys(process.env).forEach(function (key) {
  if (!key.startsWith('EXPO_PUBLIC_')) return;

  if (DENY_LIST.includes(key)) {
    blocked.push(key);
    return;
  }

  content += key + '=' + process.env[key] + '\n';
  written.push(key);
});

if (blocked.length) {
  // Names only — never values.
  console.warn(
    'write-env: refused to embed provider secret(s): ' + blocked.join(', ') +
      '\n  These must stay server-side. Unset them or remove them from the build ' +
      'environment.'
  );
}

if (content) {
  fs.writeFileSync('.env', content);
  console.log('.env written with keys: ' + written.join(', '));
} else {
  console.log('No client-safe EXPO_PUBLIC_ variables found in environment');
}
