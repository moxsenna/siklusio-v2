import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useCycle } from '../src/context/CycleContext';

export default function IndexPage() {
  const { session, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted, isProfileLoading } = useCycle();
  const router = useRouter();
  const lastNavigatedRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth session and wait for cloud profile to finish fetching (if logged in)
    if (authLoading || (session && isProfileLoading)) return;

    let targetPath = '';
    if (!session) {
      targetPath = '/auth';
    } else if (!isOnboardingCompleted) {
      targetPath = '/onboarding';
    } else {
      targetPath = '/(tabs)/dashboard';
    }

    if (lastNavigatedRef.current === targetPath) return;
    lastNavigatedRef.current = targetPath;
    router.replace(targetPath as any);
  }, [session, authLoading, isOnboardingCompleted, isProfileLoading, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf2f8' }}>
      <ActivityIndicator size="large" color="#ec4899" />
    </View>
  );
}
