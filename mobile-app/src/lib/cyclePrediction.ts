import { addDays, differenceInDays, format, startOfDay, subDays } from "date-fns";
import { parseLocalDate } from "./dateUtils";

export type PredictionConfidence = "low" | "medium" | "high";

export interface ActivityDailyRecord {
  symptoms?: string[];
  tasks?: unknown[];
  isPeriod?: boolean;
  updatedAt?: string;
}

export type ActivityHistory = Record<string, ActivityDailyRecord>;

export interface AdaptiveCyclePredictionInput {
  lastPeriodDate: Date | null;
  fallbackCycleLength: number;
  fallbackPeriodLength: number;
  activityHistory: ActivityHistory;
  today?: Date;
}

export interface AdaptiveCyclePrediction {
  predictedCycleLength: number;
  predictedPeriodLength: number;
  cycleConfidence: PredictionConfidence;
  periodConfidence: PredictionConfidence;
  manualPeriodStarts: Date[];
  lastPredictionDeltaDays: number | null;
  lastPredictedPeriodDate: Date | null;
  lastActualPeriodDate: Date | null;
}

const MIN_CYCLE_LENGTH = 20;
const MAX_CYCLE_LENGTH = 45;
const MAX_PERIOD_LENGTH = 15;
const MAX_ROLLING_CYCLES = 6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const weightedRound = (values: number[]) => {
  if (values.length === 0) return null;

  const totals = values.reduce(
    (acc, value, index) => {
      const weight = index + 1;
      return {
        weighted: acc.weighted + value * weight,
        weights: acc.weights + weight,
      };
    },
    { weighted: 0, weights: 0 },
  );

  return Math.round(totals.weighted / totals.weights);
};

const confidenceForValues = (
  values: number[],
  highCount: number,
  highRange: number,
  mediumCount: number,
  mediumRange: number,
): PredictionConfidence => {
  if (values.length === 0) return "low";

  const range = Math.max(...values) - Math.min(...values);
  if (values.length >= highCount && range <= highRange) return "high";
  if (values.length >= mediumCount && range <= mediumRange) return "medium";
  return "low";
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const rejectOutliers = (values: number[]) => {
  if (values.length < 3) return values;

  const midpoint = median(values);
  const filtered = values.filter((value) => Math.abs(value - midpoint) <= 7);
  return filtered.length > 0 ? filtered : values;
};

export function getManualPeriodStarts(activityHistory: ActivityHistory, today = new Date()) {
  const normalizedToday = startOfDay(today);
  const starts: Date[] = [];
  const historyDates = Object.keys(activityHistory).sort(
    (a, b) => parseLocalDate(a).getTime() - parseLocalDate(b).getTime(),
  );

  for (const dateKey of historyDates) {
    if (!activityHistory[dateKey]?.isPeriod) continue;

    const dateObj = startOfDay(parseLocalDate(dateKey));
    if (dateObj > normalizedToday) continue;

    const prevDayKey = format(subDays(dateObj, 1), "yyyy-MM-dd");
    if (!activityHistory[prevDayKey]?.isPeriod) {
      starts.push(dateObj);
    }
  }

  return starts;
}

function getPeriodDurations(activityHistory: ActivityHistory, starts: Date[]) {
  const durations: number[] = [];

  for (const start of starts) {
    let duration = 0;
    let checkDate = start;

    while (
      activityHistory[format(checkDate, "yyyy-MM-dd")]?.isPeriod &&
      duration < MAX_PERIOD_LENGTH
    ) {
      duration += 1;
      checkDate = addDays(checkDate, 1);
    }

    if (duration > 0) {
      durations.push(duration);
    }
  }

  return durations.slice(-MAX_ROLLING_CYCLES);
}

function getValidCycleIntervals(starts: Date[]) {
  const intervals: number[] = [];

  for (let index = 0; index < starts.length - 1; index += 1) {
    const diff = differenceInDays(starts[index + 1], starts[index]);
    if (diff >= MIN_CYCLE_LENGTH && diff <= MAX_CYCLE_LENGTH) {
      intervals.push(diff);
    }
  }

  return rejectOutliers(intervals.slice(-MAX_ROLLING_CYCLES));
}

function calculateLastPredictionDelta(starts: Date[], fallbackCycleLength: number) {
  if (starts.length < 3) {
    return {
      lastPredictionDeltaDays: null,
      lastPredictedPeriodDate: null,
      lastActualPeriodDate: null,
    };
  }

  const latestActual = starts[starts.length - 1];
  const previousStart = starts[starts.length - 2];
  const intervalsBeforeLatest = getValidCycleIntervals(starts.slice(0, -1));
  const priorPredictedLength = weightedRound(intervalsBeforeLatest) ?? fallbackCycleLength;
  const predictedDate = addDays(previousStart, priorPredictedLength);

  return {
    lastPredictionDeltaDays: differenceInDays(latestActual, predictedDate),
    lastPredictedPeriodDate: predictedDate,
    lastActualPeriodDate: latestActual,
  };
}

export function calculateAdaptiveCyclePrediction({
  lastPeriodDate,
  fallbackCycleLength,
  fallbackPeriodLength,
  activityHistory,
  today = new Date(),
}: AdaptiveCyclePredictionInput): AdaptiveCyclePrediction {
  const safeCycleLength = clamp(fallbackCycleLength || 28, MIN_CYCLE_LENGTH, MAX_CYCLE_LENGTH);
  const safePeriodLength = clamp(fallbackPeriodLength || 5, 1, MAX_PERIOD_LENGTH);
  const manualPeriodStarts = getManualPeriodStarts(activityHistory, today);
  const cycleIntervals = getValidCycleIntervals(manualPeriodStarts);
  const periodDurations = getPeriodDurations(activityHistory, manualPeriodStarts);

  const predictedCycleLength = clamp(
    weightedRound(cycleIntervals) ?? safeCycleLength,
    MIN_CYCLE_LENGTH,
    MAX_CYCLE_LENGTH,
  );
  const predictedPeriodLength = clamp(
    weightedRound(periodDurations) ?? safePeriodLength,
    1,
    MAX_PERIOD_LENGTH,
  );

  const delta = calculateLastPredictionDelta(manualPeriodStarts, safeCycleLength);

  return {
    predictedCycleLength,
    predictedPeriodLength,
    cycleConfidence: confidenceForValues(cycleIntervals, 4, 4, 2, 9),
    periodConfidence: confidenceForValues(periodDurations, 4, 3, 2, 5),
    manualPeriodStarts,
    lastPredictionDeltaDays: delta.lastPredictionDeltaDays,
    lastPredictedPeriodDate: delta.lastPredictedPeriodDate,
    lastActualPeriodDate: delta.lastActualPeriodDate,
  };
}
