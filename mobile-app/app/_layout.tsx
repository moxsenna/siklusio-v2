import "../global.css";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFonts } from "expo-font";
import { Stack, usePathname, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";
import { storage } from "../src/lib/storage";
import { AuthProvider } from "../src/context/AuthContext";
import { CycleProvider } from "../src/context/CycleContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { analytics } from "../src/lib/analytics";
import { configureDailyReminderNotificationHandler } from "../src/lib/expoDailyReminderNotifications";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });
  const [storageLoaded, setStorageLoaded] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    storage.init().then(() => setStorageLoaded(true));
  }, []);

  useEffect(() => {
    configureDailyReminderNotificationHandler();
  }, []);

  useEffect(() => {
    if (loaded && storageLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, storageLoaded]);

  if (!loaded || !storageLoaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function NavigationTracker() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    if (pathname) {
      const screenClass = segments[segments.length - 1] || "root";
      analytics.logScreenView(pathname, screenClass);
    }
  }, [pathname, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <AuthProvider>
      <CycleProvider>
        <SafeAreaProvider>
          <NavigationTracker />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#fdf2f8" },
              animation: "none",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="payment-pending" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </CycleProvider>
    </AuthProvider>
  );
}
