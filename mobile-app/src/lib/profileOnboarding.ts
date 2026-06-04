export interface CloudProfileOnboardingState {
  nickname?: string | null;
  children_count?: string | null;
  last_period_date?: string | null;
  onboarding_completed?: boolean | null;
}

export function isCloudOnboardingCompleted(
  profile: CloudProfileOnboardingState | null | undefined,
): boolean {
  if (!profile) return false;
  return profile.onboarding_completed === true;
}
