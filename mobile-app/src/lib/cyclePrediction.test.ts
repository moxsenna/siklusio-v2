import test from 'node:test';
import assert from 'node:assert/strict';
import { format, addDays } from 'date-fns';
import {
  calculateAdaptiveCyclePrediction,
  type ActivityHistory,
} from './cyclePrediction';

const date = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const markPeriod = (history: ActivityHistory, startIso: string, duration = 1) => {
  const start = date(startIso);
  for (let index = 0; index < duration; index += 1) {
    history[format(addDays(start, index), 'yyyy-MM-dd')] = {
      symptoms: [],
      tasks: [],
      isPeriod: true,
      updatedAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    };
  }
};

test('falls back to user settings when there are no manual period logs', () => {
  const prediction = calculateAdaptiveCyclePrediction({
    lastPeriodDate: date('2026-01-01'),
    fallbackCycleLength: 29,
    fallbackPeriodLength: 6,
    activityHistory: {},
    today: date('2026-05-30'),
  });

  assert.equal(prediction.predictedCycleLength, 29);
  assert.equal(prediction.predictedPeriodLength, 6);
  assert.equal(prediction.cycleConfidence, 'low');
  assert.equal(prediction.periodConfidence, 'low');
  assert.equal(prediction.lastPredictionDeltaDays, null);
});

test('weights recent cycle intervals more heavily than older intervals', () => {
  const activityHistory: ActivityHistory = {};
  markPeriod(activityHistory, '2026-01-01');
  markPeriod(activityHistory, '2026-01-29');
  markPeriod(activityHistory, '2026-02-27');
  markPeriod(activityHistory, '2026-03-29');
  markPeriod(activityHistory, '2026-04-30');

  const prediction = calculateAdaptiveCyclePrediction({
    lastPeriodDate: date('2026-01-01'),
    fallbackCycleLength: 28,
    fallbackPeriodLength: 5,
    activityHistory,
    today: date('2026-05-05'),
  });

  assert.equal(prediction.predictedCycleLength, 30);
  assert.equal(prediction.cycleConfidence, 'high');
});

test('ignores implausible cycle gaps before calculating the prediction', () => {
  const activityHistory: ActivityHistory = {};
  markPeriod(activityHistory, '2026-01-01');
  markPeriod(activityHistory, '2026-01-30');
  markPeriod(activityHistory, '2026-03-02');
  markPeriod(activityHistory, '2026-05-31');

  const prediction = calculateAdaptiveCyclePrediction({
    lastPeriodDate: date('2026-01-01'),
    fallbackCycleLength: 28,
    fallbackPeriodLength: 5,
    activityHistory,
    today: date('2026-06-01'),
  });

  assert.equal(prediction.predictedCycleLength, 30);
  assert.equal(prediction.cycleConfidence, 'medium');
});

test('calculates weighted period length from consecutive manual period days', () => {
  const activityHistory: ActivityHistory = {};
  markPeriod(activityHistory, '2026-01-01', 4);
  markPeriod(activityHistory, '2026-01-30', 6);

  const prediction = calculateAdaptiveCyclePrediction({
    lastPeriodDate: date('2026-01-01'),
    fallbackCycleLength: 28,
    fallbackPeriodLength: 5,
    activityHistory,
    today: date('2026-02-10'),
  });

  assert.equal(prediction.predictedPeriodLength, 5);
  assert.equal(prediction.periodConfidence, 'medium');
});

test('reports how far the latest actual period start was from the prior prediction', () => {
  const activityHistory: ActivityHistory = {};
  markPeriod(activityHistory, '2026-01-01');
  markPeriod(activityHistory, '2026-01-29');
  markPeriod(activityHistory, '2026-02-28');
  markPeriod(activityHistory, '2026-04-01');

  const prediction = calculateAdaptiveCyclePrediction({
    lastPeriodDate: date('2026-01-01'),
    fallbackCycleLength: 28,
    fallbackPeriodLength: 5,
    activityHistory,
    today: date('2026-04-02'),
  });

  assert.equal(prediction.lastPredictionDeltaDays, 3);
  assert.equal(format(prediction.lastPredictedPeriodDate!, 'yyyy-MM-dd'), '2026-03-29');
  assert.equal(format(prediction.lastActualPeriodDate!, 'yyyy-MM-dd'), '2026-04-01');
});
