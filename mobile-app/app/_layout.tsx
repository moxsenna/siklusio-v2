import '../global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme as useDeviceColorScheme, Modal, View, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { storage } from '../src/lib/storage';
import { AuthProvider } from '../src/context/AuthContext';
import { CycleProvider } from '../src/context/CycleContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { analytics } from '../src/lib/analytics';

import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
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
    if (loaded && storageLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, storageLoaded]);

  if (!loaded || !storageLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function NavigationTracker() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    if (pathname) {
      const screenClass = segments[segments.length - 1] || 'root';
      analytics.logScreenView(pathname, screenClass);
    }
  }, [pathname, segments]);

  return null;
}

function RootLayoutNav() {
  const { colorScheme, setThemeMode } = useTheme();
  const [showDarkPrompt, setShowDarkPrompt] = useState(false);
  const deviceScheme = useDeviceColorScheme() || 'light';

  useEffect(() => {
    // Detect custom system theme and prompt if system mode is dark and no preference is set yet
    const savedTheme = storage.getItem('user-theme');
    const promptShown = storage.getItem('theme-dark-prompt-shown');

    if (!savedTheme && deviceScheme === 'dark' && promptShown !== 'true') {
      const timer = setTimeout(() => {
        setShowDarkPrompt(true);
      }, 1500); // Wait on app initialization to show elegantly
      return () => clearTimeout(timer);
    }
  }, [deviceScheme]);

  const handleActivateDarkMode = () => {
    setThemeMode('dark');
    storage.setItem('theme-dark-prompt-shown', 'true');
    setShowDarkPrompt(false);
  };

  const handleKeepLightMode = () => {
    setThemeMode('light');
    storage.setItem('theme-dark-prompt-shown', 'true');
    setShowDarkPrompt(false);
  };

  return (
    <AuthProvider>
      <CycleProvider>
        <SafeAreaProvider>
          <NavigationTracker />
          
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colorScheme === 'dark' ? '#120917' : '#fdf2f8' },
              animation: 'none',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="admin" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>

          {/* Gorgeous System Dark Mode Prompt Modal */}
          <Modal
            visible={showDarkPrompt}
            transparent={true}
            animationType="fade"
            onRequestClose={handleKeepLightMode}
          >
            <View className="flex-1 items-center justify-center p-6 bg-black/60">
              <View className="bg-white dark:bg-[#1c0f24] rounded-[32px] p-6 w-full max-w-[340px] shadow-2xl border border-pink-100 dark:border-[#ec4899]/15">
                
                {/* Visual Header/Emoji Decor */}
                <View className="w-16 h-16 rounded-full bg-pink-50 dark:bg-purple-950/40 flex items-center justify-center mb-4 mx-auto border border-pink-100 dark:border-[#ec4899]/10">
                  <Text className="text-3xl">🌙</Text>
                </View>

                <Text className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#ec4899] text-center">
                  Rekomendasi Tema ✨
                </Text>

                <Text className="text-xl font-extrabold text-center mb-1 text-fuchsia-950 dark:text-pink-50 mt-1">
                  Aktifkan Mode Gelap?
                </Text>

                <Text className="text-xs text-pink-905/70 dark:text-pink-300/80 text-center mb-6 leading-relaxed">
                  Kami mendeteksi perangkat Bunda menggunakan Mode Gelap. Apakah Bunda ingin mengaktifkan tema Night Sanctuary (Mode Gelap) agar mata lebih nyaman saat membaca?
                </Text>

                {/* Confirm Action Buttons */}
                <View className="gap-2">
                  <TouchableOpacity 
                    onPress={handleActivateDarkMode}
                    className="w-full py-4 bg-primary rounded-2xl items-center justify-center shadow-sm active:scale-95"
                  >
                    <Text className="text-white font-bold text-sm tracking-wider uppercase">
                      Ya, Aktifkan 🌙
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleKeepLightMode}
                    className="w-full py-2 items-center justify-center active:scale-95"
                  >
                    <Text className="text-pink-700 dark:text-pink-400 font-extrabold text-xs tracking-wider uppercase">
                      Gunakan Mode Terang
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          </Modal>

        </SafeAreaProvider>
      </CycleProvider>
    </AuthProvider>
  );
}
