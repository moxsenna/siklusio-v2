export interface CycleProfileSyncGuardInput {
  userId: string | null | undefined;
  isProfileLoading: boolean;
  hasLastPeriodDate: boolean;
  cycleLength: number;
  periodLength: number;
}

export function canSyncCycleProfile(input: CycleProfileSyncGuardInput): boolean {
  return Boolean(
    input.userId &&
    !input.isProfileLoading &&
    input.hasLastPeriodDate &&
    input.cycleLength > 0 &&
    input.periodLength > 0,
  );
}
