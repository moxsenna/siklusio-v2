import { addDays, subDays, differenceInDays, startOfDay, format } from 'date-fns';
import { parseLocalDate } from './dateUtils';

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
}

/**
 * Fungsi utilitas murni untuk menghitung seluruh data siklus menstruasi dan masa subur.
 * Bebas dari state React sehingga bisa langsung diimpor ke proyek React Native/Expo.
 */
export function calculateCycleData(
  lastPeriodDate: Date | null,
  cycleLength: number,
  periodLength: number,
  activityHistory: Record<string, DailyRecord>
): CycleCalculations & {
  getDayInfo: (date: Date) => { phase: CyclePhase; displayPhase: string; cycleDay: number; isManualPeriod: boolean };
} {
  const safeCycleLength = Math.max(20, cycleLength || 28);
  const safePeriodLength = Math.max(1, periodLength || 5);

  const today = startOfDay(new Date());
  const normalizedLastPeriod = lastPeriodDate ? startOfDay(lastPeriodDate) : startOfDay(new Date());

  // 1. Dapatkan semua tanggal mulai haid manual dari riwayat aktivitas (diurutkan naik secara kronologis)
  const manualPeriodStarts: Date[] = [];
  const historyDates = Object.keys(activityHistory).sort(
    (a, b) => parseLocalDate(a).getTime() - parseLocalDate(b).getTime()
  );

  for (const dateKey of historyDates) {
    if (activityHistory[dateKey]?.isPeriod) {
      const dateObj = startOfDay(parseLocalDate(dateKey));
      const prevDayKey = format(subDays(dateObj, 1), 'yyyy-MM-dd');
      if (!activityHistory[prevDayKey]?.isPeriod) {
        manualPeriodStarts.push(dateObj);
      }
    }
  }

  // 2. Hitung Rata-rata Panjang Haid (Period Length) secara dinamis dari catatan manual
  let calculatedPeriodLength = safePeriodLength;
  const periodDurations: number[] = [];
  for (const start of manualPeriodStarts) {
    let duration = 0;
    let checkDate = start;
    // Hitung berapa hari berurutan pengguna mencatat haid (maksimal batas wajar medis 15 hari)
    while (activityHistory[format(checkDate, 'yyyy-MM-dd')]?.isPeriod && duration <= 15) {
      duration++;
      checkDate = addDays(checkDate, 1);
    }
    if (duration > 0) {
      periodDurations.push(duration);
    }
  }
  if (periodDurations.length > 0) {
    calculatedPeriodLength = Math.round(periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length);
  }

  // 3. Hitung Rata-rata Panjang Siklus (Cycle Length) secara dinamis
  let calculatedCycleLength = safeCycleLength;
  if (manualPeriodStarts.length >= 2) {
    const cycleIntervals: number[] = [];
    for (let i = 0; i < manualPeriodStarts.length - 1; i++) {
      const diff = differenceInDays(manualPeriodStarts[i + 1], manualPeriodStarts[i]);
      // Hanya gunakan interval wajar secara medis (20 hingga 45 hari) 
      // untuk mencegah gap panjang (misal lupa log berbulan-bulan) merusak rata-rata
      if (diff >= 20 && diff <= 45) {
        cycleIntervals.push(diff);
      }
    }
    if (cycleIntervals.length > 0) {
      calculatedCycleLength = Math.round(cycleIntervals.reduce((a, b) => a + b, 0) / cycleIntervals.length);
    }
  }

  const finalCycleLength = Math.max(20, calculatedCycleLength);
  const finalPeriodLength = Math.max(1, calculatedPeriodLength);

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
    getDayInfo,
  };
}
