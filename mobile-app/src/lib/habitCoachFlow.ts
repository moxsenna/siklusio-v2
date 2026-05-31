import { addDays, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { parseLocalDate } from './dateUtils';
import type { HabitCoachCycleDay, HabitCoachPlan } from './habitCoachTypes';

export interface SevenDayPlanWindow {
  weekStart: string;
  weekEnd: string;
  dateKeys: string[];
}

export interface PlanDateOffsetBounds {
  minOffset: number;
  maxOffset: number;
}

type DayInfo = {
  phase: string;
  displayPhase: string;
  cycleDay: number;
  isManualPeriod: boolean;
};

export function buildSevenDayPlanWindow(today: Date): SevenDayPlanWindow {
  const start = startOfDay(today);
  const dateKeys = Array.from({ length: 7 }, (_, index) => format(addDays(start, index), 'yyyy-MM-dd'));

  return {
    weekStart: dateKeys[0],
    weekEnd: dateKeys[dateKeys.length - 1],
    dateKeys,
  };
}

export function getPlanDateOffsetBounds(
  plan: HabitCoachPlan | null,
  todayDateKey: string
): PlanDateOffsetBounds {
  if (!plan) {
    return { minOffset: 0, maxOffset: 0 };
  }

  const planDateKeys =
    plan.days.length > 0
      ? plan.days.map((day) => day.dateKey).filter(Boolean)
      : [plan.weekStart, plan.weekEnd].filter(Boolean);

  if (planDateKeys.length === 0) {
    return { minOffset: 0, maxOffset: 0 };
  }

  const today = parseLocalDate(todayDateKey);
  const offsets = planDateKeys.map((dateKey) => differenceInCalendarDays(parseLocalDate(dateKey), today));

  return {
    minOffset: Math.min(...offsets),
    maxOffset: Math.max(...offsets),
  };
}

export function isFuturePlanDate(dateKey: string, todayDateKey: string): boolean {
  return dateKey > todayDateKey;
}

export function getPlanDayNumber(plan: HabitCoachPlan | null, dateKey: string): number | null {
  return plan?.days.find((day) => day.dateKey === dateKey)?.dayIndex ?? null;
}

export function buildHabitCoachCycleDays(
  dateKeys: string[],
  getDayInfo: (date: Date) => DayInfo
): HabitCoachCycleDay[] {
  return dateKeys.map((dateKey, index) => {
    const dayInfo = getDayInfo(parseLocalDate(dateKey));

    return {
      dateKey,
      dayIndex: index + 1,
      phase: dayInfo.phase,
      displayPhase: dayInfo.displayPhase,
      cycleDay: dayInfo.cycleDay,
      isManualPeriod: dayInfo.isManualPeriod,
    };
  });
}
