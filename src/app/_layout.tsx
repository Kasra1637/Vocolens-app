import "react-native-get-random-values";
import "react-native-reanimated";
import "../../global.css";
import { LogBox, AppState } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "@/lib/useColorScheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthGate } from "@/components/AuthGate";
import { MilestoneCelebration } from "@/components/MilestoneCelebration";
import { useEffect, useRef } from "react";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import useOnboardingStore, { THEME_COLORS } from "@/lib/state/onboarding-store";

LogBox.ignoreLogs([
  "Expo AV has been deprecated",
  "Disconnected from Metro",
  "SafeAreaView has been deprecated",
  "expo-notifications",
  "[expo-notifications]",
]);

export const unstable_settings = {
  initialRouteName: "(tabs)",
  animationEnabled: false,
};

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav({
  colorScheme,
  themeBg,
}: {
  colorScheme: "light" | "dark" | null | undefined;
  themeBg: string;
}) {
  // Build navigation themes using the user's selected theme darkest stop.
  // This ensures @react-navigation never paints a conflicting background
  // colour behind tab screens on any theme — not just Midnight Glow.
  const AppDarkTheme  = { ...DarkTheme,    colors: { ...DarkTheme.colors,    background: themeBg, card: themeBg } };
  const AppLightTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: themeBg, card: themeBg } };

  return (
    <ThemeProvider value={colorScheme === "dark" ? AppDarkTheme : AppLightTheme}>
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false, contentStyle: { backgroundColor: themeBg } }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="entry-detail"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="reflection"
          options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen
          name="privacy-settings"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="legal"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="correction-history"
          options={{ headerShown: false, presentation: "card" }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const colorScheme = useColorScheme();

  // ── OTA Update: check on launch + when returning from background ──────────
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    async function checkForUpdate() {
      if (__DEV__) return; // Skip in development
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // Restart app with new bundle
        }
      } catch (e) {
        // Silent fail — don't block the app if update check fails
        console.log('[Updates] Check failed:', e);
      }
    }

    // Check on launch
    checkForUpdate();

    // Check when app returns from background
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkForUpdate();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // Read the user's chosen theme so every background colour adapts —
  // never hardcoded to Midnight Glow's darkest stop.
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const themeBg = THEME_COLORS[selectedTheme].backgroundGradient[1];

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: themeBg }}>
        <StatusBar style="light" />
        <AuthGate>
          <RootLayoutNav colorScheme={colorScheme} themeBg={themeBg} />
          <MilestoneCelebration />
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
