import { addDays, subDays, differenceInDays, startOfDay, format } from 'date-fns';
import {
  calculateAdaptiveCyclePrediction,
  type PredictionConfidence,
} from './cyclePrediction';

export type CyclePhase = 'Menstrual' | 'Folikular' | 'Ovulasi' | 'Luteal';

export interface Task {
  id: number;
  text: string;
  emoji: string;
  done: boolean;
}

export interface DailyRecord {
  symptoms: string[];
  tasks: Task[];
  isPeriod?: boolean;
  updatedAt?: string;
}

export interface CycleCalculations {
  nextPeriodDate: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  currentPhase: CyclePhase;
  daysToNextPeriod: number;
  cycleDay: number;
  effectiveLastPeriod: Date;
  hasManualLogs: boolean;
  predictedCycleLength: number;
  predictedPeriodLength: number;
  cycleConfidence: PredictionConfidence;
  periodConfidence: PredictionConfidence;
  lastPredictionDeltaDays: number | null;
  lastPredictedPeriodDate: Date | null;
  lastActualPeriodDate: Date | null;
}

/**
 * Fungsi utilitas murni untuk menghitung seluruh data siklus menstruasi dan masa subur.
 * Bebas dari state React sehingga bisa langsung diimpor ke proyek React Native/Expo.
 */
export function calculateCycleData(
  lastPeriodDate: Date | null,
  cycleLength: number,
  periodLength: number,
  activityHistory: Record<string, DailyRecord>,
  todayOverride?: Date
): CycleCalculations & {
  getDayInfo: (date: Date) => { phase: CyclePhase; displayPhase: string; cycleDay: number; isManualPeriod: boolean };
} {
  const safeCycleLength = Math.max(20, cycleLength || 28);
  const safePeriodLength = Math.max(1, periodLength || 5);

  const today = startOfDay(todayOverride ?? new Date());
  const normalizedLastPeriod = lastPeriodDate ? startOfDay(lastPeriodDate) : today;

  const adaptivePrediction = calculateAdaptiveCyclePrediction({
    lastPeriodDate,
    fallbackCycleLength: safeCycleLength,
    fallbackPeriodLength: safePeriodLength,
    activityHistory,
    today,
  });

  const manualPeriodStarts = adaptivePrediction.manualPeriodStarts;
  const finalCycleLength = adaptivePrediction.predictedCycleLength;
  const finalPeriodLength = adaptivePrediction.predictedPeriodLength;

  // 4. Cari jangkar (anchor) terbaru, baik dari input manual maupun konfigurasi
  let bestAnchor = normalizedLastPeriod;
  const latestManual = manualPeriodStarts.filter((d) => d <= today).pop();
  if (latestManual && latestManual > bestAnchor) {
    bestAnchor = latestManual;
  }

  // 5. Ekstrapolasi jangkar terbaik untuk mendapatkan effectiveLastPeriod saat ini
  const daysSinceAnchor = differenceInDays(today, bestAnchor);
  let effectiveLastPeriod = bestAnchor;

  if (daysSinceAnchor >= finalCycleLength) {
    const cyclesPassed = Math.floor(daysSinceAnchor / finalCycleLength);
    effectiveLastPeriod = addDays(effectiveLastPeriod, cyclesPassed * finalCycleLength);
  } else if (daysSinceAnchor < 0) {
    const cyclesFuture = Math.ceil(Math.abs(daysSinceAnchor) / finalCycleLength);
    effectiveLastPeriod = subDays(effectiveLastPeriod, cyclesFuture * finalCycleLength);
  }

  const nextPeriodDate = addDays(effectiveLastPeriod, finalCycleLength);
  // Ovulasi: secara medis rata-rata 14 hari sebelum hari haid berikutnya
  const ovulationDate = addDays(effectiveLastPeriod, finalCycleLength - 14 - 1);
  const fertileWindowStart = subDays(ovulationDate, 5);
  const fertileWindowEnd = ovulationDate;

  // Fungsi closure untuk mendapatkan detail status pada tanggal tertentu
  const getDayInfo = (date: Date) => {
    const diff = differenceInDays(startOfDay(date), startOfDay(effectiveLastPeriod));
    const daysIntoCycle = ((diff % finalCycleLength) + finalCycleLength) % finalCycleLength;
    const cDay = daysIntoCycle + 1; // 1-indexed

    const ovulationDayIndex = finalCycleLength - 14;
    const startF = ovulationDayIndex - 5;
    const endF = ovulationDayIndex;

    const dateKey = format(date, 'yyyy-MM-dd');
    const isManualPeriod = !!activityHistory[dateKey]?.isPeriod;

    let phase: CyclePhase = 'Luteal';
    let displayPhase = 'Normal';

    if (isManualPeriod || cDay <= finalPeriodLength) {
      phase = 'Menstrual';
      displayPhase = 'Menstruasi';
    } else if (cDay === ovulationDayIndex) {
      phase = 'Ovulasi';
      displayPhase = 'Ovulasi';
    } else if (cDay >= startF && cDay <= endF) {
      phase = 'Ovulasi';
      displayPhase = 'Masa Subur';
    } else if (cDay < ovulationDayIndex) {
      phase = 'Folikular';
      displayPhase = 'Normal';
    } else {
      phase = 'Luteal';
      displayPhase = 'Normal';
    }

    return { phase, displayPhase, cycleDay: cDay, isManualPeriod };
  };

  const todayInfo = getDayInfo(today);
  const cycleDay = todayInfo.cycleDay;
  const currentPhase = todayInfo.phase;
  const daysToNextPeriod = differenceInDays(nextPeriodDate, today);

  return {
    nextPeriodDate,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    currentPhase,
    daysToNextPeriod,
    cycleDay,
    effectiveLastPeriod,
    hasManualLogs: manualPeriodStarts.length > 0,
    predictedCycleLength: finalCycleLength,
    predictedPeriodLength: finalPeriodLength,
    cycleConfidence: adaptivePrediction.cycleConfidence,
    periodConfidence: adaptivePrediction.periodConfidence,
    lastPredictionDeltaDays: adaptivePrediction.lastPredictionDeltaDays,
    lastPredictedPeriodDate: adaptivePrediction.lastPredictedPeriodDate,
    lastActualPeriodDate: adaptivePrediction.lastActualPeriodDate,
    getDayInfo,
  };
}
