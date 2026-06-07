/**
 * app.config.js  (replaces the static app.json at bundle time)
 *
 * Why this file exists
 * ─────────────────────
 * app.json's `extra` block is static — it cannot read environment variables.
 * That means Constants.expoConfig.extra.EXPO_PUBLIC_DEEPGRAM_API_KEY was
 * always `undefined` at runtime, even after the EAS secrets were set correctly.
 *
 * This file runs at bundle time (both `eas update` and `eas build`) and
 * injects EXPO_PUBLIC_* keys into `extra` so they are reliably accessible
 * via Constants.expoConfig.extra on the device — in addition to the normal
 * process.env path which only works in some bundler contexts.
 *
 * Safe to commit — no secret values are hardcoded here, only env var references.
 */

export default ({ config }) => ({
  ...config,
  name: 'vocolens',
  slug: 'vocolens',
  scheme: 'vocolens',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vocolens.app',
  },
  android: {
    package: 'com.vocolens.app',
    softwareKeyboardLayoutMode: 'pan',
  },
  web: {
    bundler: 'metro',
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        ios: { useFrameworks: 'static' },
        android: { usesCleartextTraffic: true },
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission:
          'Allow Vocolens to use biometrics to unlock your private journal.',
      },
    ],
    'expo-updates',
    // react-native-purchases has no Expo config plugin — native linking only
  ],
  owner: 'kasra1637',
  runtimeVersion: '1.0.0',
  updates: {
    url: 'https://u.expo.dev/743d876a-6e89-4b1f-9e42-816a67b84a35',
  },
  extra: {
    router: {},
    eas: {
      projectId: '743d876a-6e89-4b1f-9e42-816a67b84a35',
    },
    // Injected at bundle time from EAS secrets or local .env file.
    // These values land in Constants.expoConfig.extra on the device.
    // IMPORTANT: Use `|| undefined` not `?? null` — if the key is missing,
    // injecting JS null means Constants.expoConfig.extra returns null at
    // runtime. The guard `apiKey === 'null'` only catches the STRING "null",
    // not the JS value null, so null slips through and produces the header
    // "Authorization: Token null" → Deepgram 401 INVALID_AUTH.
    // undefined is falsy and is caught correctly by the `!apiKey` guard.
    EXPO_PUBLIC_DEEPGRAM_API_KEY:
      process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || undefined,
    EXPO_PUBLIC_OPENROUTER_API_KEY:
      process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || undefined,
    EXPO_PUBLIC_BACKEND_URL:
      process.env.EXPO_PUBLIC_BACKEND_URL || undefined,
  },
});
