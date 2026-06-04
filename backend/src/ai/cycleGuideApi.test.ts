import test from "node:test";
import assert from "node:assert/strict";
import { buildCycleGuideSnapshot } from "./cycleGuideSummary";
import { buildCycleGuideMessages } from "./prompts";

test("buildCycleGuideSnapshot keeps only cycle guide context fields", () => {
  const snapshot = buildCycleGuideSnapshot({
    currentPhase: "Ovulasi",
    cycleDay: 14,
    daysToNextPeriod: 14,
    fertileWindow: { start: "2026-06-01", end: "2026-06-06" },
    ovulationDate: "2026-06-04",
    nextPeriodDate: "2026-06-18",
    cycleConfidence: "high",
    periodConfidence: "medium",
    lastPredictionDeltaDays: 1,
    guideLevel: "personal",
    activityHistory: { shouldNotLeak: true },
  });

  assert.deepEqual(snapshot, {
    currentPhase: "Ovulasi",
    cycleDay: 14,
    daysToNextPeriod: 14,
    fertileWindow: { start: "2026-06-01", end: "2026-06-06" },
    ovulationDate: "2026-06-04",
    nextPeriodDate: "2026-06-18",
    cycleConfidence: "high",
    periodConfidence: "medium",
    lastPredictionDeltaDays: 1,
    guideLevel: "personal",
  });
});

test("buildCycleGuideMessages does not allow habit checklist generation", () => {
  const messages = buildCycleGuideMessages({
    nickname: "Maya",
    guideLevel: "active",
    cycleSnapshot: { currentPhase: "Luteal" },
    habitSnapshot: { completionRate: 70 },
  });

  assert.match(messages[0].content, /Jangan membuat checklist habit baru/);
  assert.match(messages[0].content, /arahk?an ke Habit Coach/i);
});
