import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHabitCoachCycleDays,
  buildSevenDayPlanWindow,
  getPlanDateOffsetBounds,
  getPlanDayNumber,
  isFuturePlanDate,
} from "./habitCoachFlow";
import type { HabitCoachPlan } from "./habitCoachTypes";

const plan: HabitCoachPlan = {
  id: "plan-1",
  weekStart: "2026-05-29",
  weekEnd: "2026-06-04",
  mode: "initial",
  status: "active",
  userGoal: "energi stabil",
  coachSummary: "Mulai dari target kecil.",
  creditCost: 50,
  days: [
    { dateKey: "2026-05-29", dayIndex: 1, focus: "Hidrasi", tasks: [] },
    { dateKey: "2026-05-30", dayIndex: 2, focus: "Nutrisi", tasks: [] },
    { dateKey: "2026-05-31", dayIndex: 3, focus: "Istirahat", tasks: [] },
    { dateKey: "2026-06-01", dayIndex: 4, focus: "Gerak ringan", tasks: [] },
    { dateKey: "2026-06-02", dayIndex: 5, focus: "Tenang", tasks: [] },
    { dateKey: "2026-06-03", dayIndex: 6, focus: "Tidur", tasks: [] },
    { dateKey: "2026-06-04", dayIndex: 7, focus: "Review", tasks: [] },
  ],
};

test("buildSevenDayPlanWindow starts today and includes seven date keys", () => {
  const window = buildSevenDayPlanWindow(new Date(2026, 4, 31, 14, 30));

  assert.equal(window.weekStart, "2026-05-31");
  assert.equal(window.weekEnd, "2026-06-06");
  assert.deepEqual(window.dateKeys, [
    "2026-05-31",
    "2026-06-01",
    "2026-06-02",
    "2026-06-03",
    "2026-06-04",
    "2026-06-05",
    "2026-06-06",
  ]);
});

test("getPlanDateOffsetBounds returns zero bounds when plan is missing", () => {
  assert.deepEqual(getPlanDateOffsetBounds(null, "2026-06-01"), {
    minOffset: 0,
    maxOffset: 0,
  });
});

test("getPlanDateOffsetBounds uses active plan dates relative to today", () => {
  assert.deepEqual(getPlanDateOffsetBounds(plan, "2026-06-01"), {
    minOffset: -3,
    maxOffset: 3,
  });
});

test("isFuturePlanDate compares date keys by calendar date", () => {
  assert.equal(isFuturePlanDate("2026-06-02", "2026-06-01"), true);
  assert.equal(isFuturePlanDate("2026-06-01", "2026-06-01"), false);
  assert.equal(isFuturePlanDate("2026-05-31", "2026-06-01"), false);
});

test("getPlanDayNumber returns the matching plan day index", () => {
  assert.equal(getPlanDayNumber(plan, "2026-06-02"), 5);
  assert.equal(getPlanDayNumber(plan, "2026-06-08"), null);
  assert.equal(getPlanDayNumber(null, "2026-06-02"), null);
});

test("buildHabitCoachCycleDays maps cycle info for each requested date", () => {
  const days = buildHabitCoachCycleDays(["2026-06-01", "2026-06-02"], (date) => {
    const day = date.getDate();
    return {
      phase: day === 1 ? "Folikular" : "Ovulasi",
      displayPhase: day === 1 ? "Normal" : "Masa Subur",
      cycleDay: day === 1 ? 9 : 10,
      isManualPeriod: day === 2,
    };
  });

  assert.deepEqual(days, [
    {
      dateKey: "2026-06-01",
      dayIndex: 1,
      phase: "Folikular",
      displayPhase: "Normal",
      cycleDay: 9,
      isManualPeriod: false,
    },
    {
      dateKey: "2026-06-02",
      dayIndex: 2,
      phase: "Ovulasi",
      displayPhase: "Masa Subur",
      cycleDay: 10,
      isManualPeriod: true,
    },
  ]);
});
