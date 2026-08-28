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
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/images/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0F0E1A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.vocolens.app',
  },
  android: {
    package: 'com.vocolens.app',
    softwareKeyboardLayoutMode: 'pan',
    permissions: ['RECORD_AUDIO'],
    versionCode: 7,
    adaptiveIcon: {
      foregroundImage: './assets/images/icon.png',
      backgroundColor: '#0F0E1A',
    },
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
        android: { usesCleartextTraffic: false },
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
    // react-native-adapty ships an Expo config plugin. `replaceAndroidBackupConfig`
    // lets Adapty manage the Android Auto Backup manifest entry — required
    // because this project also uses expo-secure-store, which otherwise
    // registers its own backup rules and causes a manifest merger conflict.
    ['react-native-adapty', { replaceAndroidBackupConfig: true }],
    // Disable expo-secure-store's own Android backup config since Adapty
    // now owns it (see comment above) — avoids a manifest merger warning.
    ['expo-secure-store', { configureAndroidBackup: false }],
  ],
  owner: 'kasra1637',
  runtimeVersion: '1.0.0',
  updates: {
    url: 'https://u.expo.dev/743d876a-6e89-4b1f-9e42-816a67b84a35',
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 30000,
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
    // SECURITY: EXPO_PUBLIC_DEEPGRAM_API_KEY and EXPO_PUBLIC_OPENROUTER_API_KEY
    // are deliberately NOT injected here.
    //
    // Anything placed in `extra` (or read via process.env.EXPO_PUBLIC_*) is
    // embedded in the shipped bundle and recoverable with `unzip` + `strings`.
    // Both of those are real, billable provider secrets.
    //
    // Neither is needed on the device:
    //   • Transcription goes through the Worker's POST /api/transcribe, which
    //     holds DEEPGRAM_API_KEY as a server-side binding.
    //   • Analysis goes through the Worker's /api/journal/* routes, which hold
    //     OPENROUTER_API_KEY as a server-side binding.
    //
    // Do NOT re-add them. If web realtime streaming is revived later, proxy it
    // through the Worker instead of shipping the key.
    EXPO_PUBLIC_BACKEND_URL:
      process.env.EXPO_PUBLIC_BACKEND_URL || undefined,
    // Set to "true" ONLY by the `preview` build profile in eas.json, so the
    // closed-testing "Skip — I'm a tester" bypass cannot reach production.
    EXPO_PUBLIC_ALLOW_TESTER_SKIP:
      process.env.EXPO_PUBLIC_ALLOW_TESTER_SKIP || undefined,
    EXPO_PUBLIC_VOCOLENS_API_KEY:
      process.env.EXPO_PUBLIC_VOCOLENS_API_KEY || undefined,
    // Adapty Public SDK Key (App settings → General → Api keys in the
    // Adapty Dashboard). Until this is set, src/lib/adaptyClient.ts
    // activates the SDK in mock mode with a placeholder key — no real
    // purchases, no dashboard/App Store/Play Store setup required.
    EXPO_PUBLIC_ADAPTY_KEY:
      process.env.EXPO_PUBLIC_ADAPTY_KEY || undefined,
  },
});
