import React, { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { useCycleSyncState } from "../src/hooks/useCycleSelectors";
import { isPaymentPendingUser } from "../src/lib/paymentAccess";
import { SiklusioLoadingScreen } from "../src/components/loading/SiklusioLoadingScreen";

export default function IndexPage() {
  const { session, user, isLoading: authLoading } = useAuth();
  const { isOnboardingCompleted, isProfileLoading } = useCycleSyncState();
  const router = useRouter();
  const lastNavigatedRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth session and wait for cloud profile to finish fetching (if logged in)
    if (authLoading || (session && isProfileLoading)) return;

    let targetPath = "";
    if (!session) {
      targetPath = "/auth";
    } else if (isPaymentPendingUser(user)) {
      targetPath = "/payment-pending";
    } else if (!isOnboardingCompleted) {
      targetPath = "/onboarding";
    } else {
      targetPath = "/(tabs)/dashboard";
    }

    if (lastNavigatedRef.current === targetPath) return;
    lastNavigatedRef.current = targetPath;
    router.replace(targetPath as any);
  }, [session, user, authLoading, isOnboardingCompleted, isProfileLoading, router]);

  return <SiklusioLoadingScreen />;
}
