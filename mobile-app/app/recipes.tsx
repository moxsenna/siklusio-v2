import React, { useMemo, useState, useEffect } from "react";
import { View, SafeAreaView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { differenceInDays, startOfDay } from "date-fns";
import { useCyclePrediction, useCycleProfile, useCycleActions } from "@/src/hooks/useCycleSelectors";
import { useTodayKey } from "@/src/hooks/useTodayKey";
import { parseLocalDate } from "@/src/lib/dateUtils";
import { TodayRecipesModal } from "@/src/features/habits/TodayRecipesModal";

/**
 * /recipes route — standalone page for the Today's Recipes feature.
 * Wraps the existing TodayRecipesModal component, pulling cycle context data
 * the same way the habits tab does.
 */
export default function RecipesScreen() {
  const router = useRouter();
  const { currentPhase, nextPeriodDate } = useCyclePrediction();
  const { userNickname } = useCycleProfile();
  const { getDayInfo } = useCycleActions();
  const todayDateKey = useTodayKey();
  const todayDate = useMemo(() => parseLocalDate(todayDateKey), [todayDateKey]);
  const todayCycleInfo = useMemo(() => getDayInfo(todayDate), [getDayInfo, todayDate]);
  const effectiveCurrentPhase = todayCycleInfo.phase || currentPhase;
  const effectiveCycleDay = todayCycleInfo.cycleDay;
  const effectiveDaysToNextPeriod = differenceInDays(
    startOfDay(nextPeriodDate),
    startOfDay(todayDate),
  );

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#fff",
        minHeight: Platform.OS === "web" ? "100%" : undefined,
      }}
    >
      <View style={{ flex: 1 }}>
        <TodayRecipesModal
          visible={true}
          generatedForDate={todayDateKey}
          currentPhase={effectiveCurrentPhase}
          cycleDay={effectiveCycleDay}
          daysToNextPeriod={effectiveDaysToNextPeriod}
          nickname={userNickname}
          onClose={handleClose}
        />
      </View>
    </SafeAreaView>
  );
}
