import test from "node:test";
import assert from "node:assert/strict";
import { format, addDays } from "date-fns";
import { calculateCycleData, type DailyRecord } from "./cycleUtils";

const date = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const markPeriod = (history: Record<string, DailyRecord>, startIso: string, duration = 1) => {
  const start = date(startIso);
  for (let index = 0; index < duration; index += 1) {
    history[format(addDays(start, index), "yyyy-MM-dd")] = {
      symptoms: [],
      tasks: [],
      isPeriod: true,
      updatedAt: `2026-02-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    };
  }
};

test("calculateCycleData exposes adaptive prediction metadata and uses weighted cycle length", () => {
  const activityHistory: Record<string, DailyRecord> = {};
  markPeriod(activityHistory, "2026-01-01");
  markPeriod(activityHistory, "2026-01-27");
  markPeriod(activityHistory, "2026-02-22");
  markPeriod(activityHistory, "2026-03-28");
  markPeriod(activityHistory, "2026-05-01");

  const result = calculateCycleData(date("2026-01-01"), 28, 5, activityHistory, date("2026-05-02"));

  assert.equal(result.predictedCycleLength, 32);
  assert.equal(result.predictedPeriodLength, 1);
  assert.equal(result.cycleConfidence, "medium");
  assert.equal(result.periodConfidence, "high");
  assert.equal(format(result.effectiveLastPeriod, "yyyy-MM-dd"), "2026-05-01");
  assert.equal(format(result.nextPeriodDate, "yyyy-MM-dd"), "2026-06-02");
  assert.equal(result.cycleDay, 2);
});
