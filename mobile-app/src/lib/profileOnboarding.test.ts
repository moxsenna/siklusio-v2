import test from "node:test";
import assert from "node:assert/strict";
import { isCloudOnboardingCompleted } from "./profileOnboarding";

test("does not treat a default last_period_date as completed onboarding", () => {
  assert.equal(
    isCloudOnboardingCompleted({
      nickname: null,
      children_count: null,
      last_period_date: "2026-06-01",
      onboarding_completed: false,
    }),
    false,
  );
});

test("treats cloud onboarding as completed only when explicit flag is true", () => {
  assert.equal(
    isCloudOnboardingCompleted({
      nickname: "Maya",
      children_count: "belum punya",
      last_period_date: "2026-05-20",
      onboarding_completed: true,
    }),
    true,
  );
});

test("does not infer completion from profile fields when explicit flag is false", () => {
  assert.equal(
    isCloudOnboardingCompleted({
      nickname: "Maya",
      children_count: "belum punya",
      last_period_date: "2026-05-20",
      onboarding_completed: false,
    }),
    false,
  );
});
