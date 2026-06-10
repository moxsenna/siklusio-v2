import { useMemo } from "react";
import { useCycle } from "../context/CycleContext";
import type { CycleContextType } from "../context/CycleContext";

export type CycleProfileSlice = Pick<
  CycleContextType,
  | "userNickname"
  | "setUserNickname"
  | "avatarUrl"
  | "setAvatarUrl"
  | "avatarKind"
  | "setAvatarKind"
  | "userBirthDate"
  | "setUserBirthDate"
  | "childrenCount"
  | "setChildrenCount"
  | "husbandName"
  | "setHusbandName"
  | "husbandNickname"
  | "setHusbandNickname"
  | "husbandNumber"
  | "setHusbandNumber"
>;

export type CyclePredictionSlice = Pick<
  CycleContextType,
  | "nextPeriodDate"
  | "ovulationDate"
  | "fertileWindowStart"
  | "fertileWindowEnd"
  | "currentPhase"
  | "daysToNextPeriod"
  | "cycleDay"
  | "effectiveLastPeriod"
  | "hasManualLogs"
  | "predictedCycleLength"
  | "predictedPeriodLength"
  | "cycleConfidence"
  | "periodConfidence"
  | "lastPredictionDeltaDays"
  | "lastPredictedPeriodDate"
  | "lastActualPeriodDate"
>;

export type CycleSavingsSlice = Pick<
  CycleContextType,
  "targetSaving" | "setTargetSaving" | "currentSaving" | "setCurrentSaving"
>;

export type CycleActivityHistorySlice = Pick<
  CycleContextType,
  "activityHistory" | "setActivityHistory"
>;

export type CycleSyncStateSlice = Pick<
  CycleContextType,
  "isOnboardingCompleted" | "setIsOnboardingCompleted" | "isProfileLoading"
>;

export type CycleActionsSlice = Pick<CycleContextType, "getDayInfo">;

export function useCycleProfile(): CycleProfileSlice {
  const ctx = useCycle();
  return useMemo(
    () => ({
      userNickname: ctx.userNickname,
      setUserNickname: ctx.setUserNickname,
      avatarUrl: ctx.avatarUrl,
      setAvatarUrl: ctx.setAvatarUrl,
      avatarKind: ctx.avatarKind,
      setAvatarKind: ctx.setAvatarKind,
      userBirthDate: ctx.userBirthDate,
      setUserBirthDate: ctx.setUserBirthDate,
      childrenCount: ctx.childrenCount,
      setChildrenCount: ctx.setChildrenCount,
      husbandName: ctx.husbandName,
      setHusbandName: ctx.setHusbandName,
      husbandNickname: ctx.husbandNickname,
      setHusbandNickname: ctx.setHusbandNickname,
      husbandNumber: ctx.husbandNumber,
      setHusbandNumber: ctx.setHusbandNumber,
    }),
    [
      ctx.userNickname,
      ctx.setUserNickname,
      ctx.avatarUrl,
      ctx.setAvatarUrl,
      ctx.avatarKind,
      ctx.setAvatarKind,
      ctx.userBirthDate,
      ctx.setUserBirthDate,
      ctx.childrenCount,
      ctx.setChildrenCount,
      ctx.husbandName,
      ctx.setHusbandName,
      ctx.husbandNickname,
      ctx.setHusbandNickname,
      ctx.husbandNumber,
      ctx.setHusbandNumber,
    ],
  );
}

export function useCyclePrediction(): CyclePredictionSlice {
  const ctx = useCycle();
  return useMemo(
    () => ({
      nextPeriodDate: ctx.nextPeriodDate,
      ovulationDate: ctx.ovulationDate,
      fertileWindowStart: ctx.fertileWindowStart,
      fertileWindowEnd: ctx.fertileWindowEnd,
      currentPhase: ctx.currentPhase,
      daysToNextPeriod: ctx.daysToNextPeriod,
      cycleDay: ctx.cycleDay,
      effectiveLastPeriod: ctx.effectiveLastPeriod,
      hasManualLogs: ctx.hasManualLogs,
      predictedCycleLength: ctx.predictedCycleLength,
      predictedPeriodLength: ctx.predictedPeriodLength,
      cycleConfidence: ctx.cycleConfidence,
      periodConfidence: ctx.periodConfidence,
      lastPredictionDeltaDays: ctx.lastPredictionDeltaDays,
      lastPredictedPeriodDate: ctx.lastPredictedPeriodDate,
      lastActualPeriodDate: ctx.lastActualPeriodDate,
    }),
    [
      ctx.nextPeriodDate,
      ctx.ovulationDate,
      ctx.fertileWindowStart,
      ctx.fertileWindowEnd,
      ctx.currentPhase,
      ctx.daysToNextPeriod,
      ctx.cycleDay,
      ctx.effectiveLastPeriod,
      ctx.hasManualLogs,
      ctx.predictedCycleLength,
      ctx.predictedPeriodLength,
      ctx.cycleConfidence,
      ctx.periodConfidence,
      ctx.lastPredictionDeltaDays,
      ctx.lastPredictedPeriodDate,
      ctx.lastActualPeriodDate,
    ],
  );
}

export function useCycleSavings(): CycleSavingsSlice {
  const ctx = useCycle();
  return useMemo(
    () => ({
      targetSaving: ctx.targetSaving,
      setTargetSaving: ctx.setTargetSaving,
      currentSaving: ctx.currentSaving,
      setCurrentSaving: ctx.setCurrentSaving,
    }),
    [ctx.targetSaving, ctx.setTargetSaving, ctx.currentSaving, ctx.setCurrentSaving],
  );
}

export function useCycleActivityHistory(): CycleActivityHistorySlice {
  const ctx = useCycle();
  return useMemo(
    () => ({
      activityHistory: ctx.activityHistory,
      setActivityHistory: ctx.setActivityHistory,
    }),
    [ctx.activityHistory, ctx.setActivityHistory],
  );
}

export function useCycleSyncState(): CycleSyncStateSlice {
  const ctx = useCycle();
  return useMemo(
    () => ({
      isOnboardingCompleted: ctx.isOnboardingCompleted,
      setIsOnboardingCompleted: ctx.setIsOnboardingCompleted,
      isProfileLoading: ctx.isProfileLoading,
    }),
    [ctx.isOnboardingCompleted, ctx.setIsOnboardingCompleted, ctx.isProfileLoading],
  );
}

export function useCycleActions(): CycleActionsSlice {
  const ctx = useCycle();
  return useMemo(() => ({ getDayInfo: ctx.getDayInfo }), [ctx.getDayInfo]);
}