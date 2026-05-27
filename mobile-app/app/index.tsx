import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useCycle } from '../src/context/CycleContext';

export default function IndexPage() {
  const { session, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted } = useCycle();
  const router = useRouter();
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    // Only navigate ONCE — without this guard, any re-render of CycleProvider
    // (which can be triggered by other state updates) re-runs router.replace
    // and creates an infinite navigation loop in React Navigation 7.
    if (navigatedRef.current) return;
    navigatedRef.current = true;

    if (!session) {
      router.replace('/auth');
    } else if (!isOnboardingCompleted) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, authLoading, isOnboardingCompleted, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf2f8' }}>
      <ActivityIndicator size="large" color="#ec4899" />
    </View>
  );
}
