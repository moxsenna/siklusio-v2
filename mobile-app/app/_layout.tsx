import '../global.css';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import { storage } from '../src/lib/storage';
import { AuthProvider } from '../src/context/AuthContext';
import { CycleProvider } from '../src/context/CycleContext';
import { View } from 'react-native';

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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <CycleProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <View className="flex-1 bg-[#fdf2f8] md:bg-gradient-to-tr md:from-pink-100 md:to-teal-50 justify-center items-center">
            <View className="w-full h-full md:max-w-[520px] md:shadow-2xl md:border-x md:border-outline-variant/40 md:overflow-hidden bg-background">
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              </Stack>
            </View>
          </View>
        </ThemeProvider>
      </CycleProvider>
    </AuthProvider>
  );
}
