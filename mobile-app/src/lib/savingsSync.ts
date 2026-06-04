export interface SavingsSyncPayload {
  target_saving: number;
  current_saving: number;
}

export interface CloudSavingsProfile {
  target_saving?: unknown;
  current_saving?: unknown;
  updated_at?: string | null;
}

export interface MappedSavingsProfile extends SavingsSyncPayload {
  updated_at: string | null;
}

const normalizeSavingsAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount;
};

export function mapCloudSavingsProfile(
  profile: CloudSavingsProfile | null | undefined,
): MappedSavingsProfile {
  return {
    target_saving: normalizeSavingsAmount(profile?.target_saving),
    current_saving: normalizeSavingsAmount(profile?.current_saving),
    updated_at: profile?.updated_at || null,
  };
}

export function buildSavingsProfileUpdate(
  payload: SavingsSyncPayload,
  updatedAt: string,
): SavingsSyncPayload & { updated_at: string } {
  return {
    target_saving: normalizeSavingsAmount(payload.target_saving),
    current_saving: normalizeSavingsAmount(payload.current_saving),
    updated_at: updatedAt,
  };
}

export function isCloudSavingsNewer(
  updatedAt: string | null | undefined,
  localSyncTimeMs: number,
): boolean {
  if (!updatedAt) return false;
  const cloudTime = new Date(updatedAt).getTime();
  return Number.isFinite(cloudTime) && cloudTime > localSyncTimeMs;
}
