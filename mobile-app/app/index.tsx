import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useCycle } from '../src/context/CycleContext';

export default function IndexPage() {
  const { session, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted } = useCycle();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;

    if (!session) {
      router.replace('/auth');
    } else if (!isOnboardingCompleted) {
      router.replace('/onboarding');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  }, [session, authLoading, isOnboardingCompleted]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf2f8' }}>
      <ActivityIndicator size="large" color="#ec4899" />
    </View>
  );
}
