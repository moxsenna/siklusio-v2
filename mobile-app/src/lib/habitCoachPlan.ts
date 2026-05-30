import { addDays, startOfDay, subDays } from 'date-fns';
import type { DailyRecord, Task } from './cycleUtils';
import type {
  HabitCategory,
  HabitCoachCompletionSummary,
  HabitCoachPlan,
} from './habitCoachTypes';

export function getLocalWeekStart(date: Date) {
  const day = startOfDay(date);
  const dayIndex = day.getDay();
  const diffToMonday = dayIndex === 0 ? 6 : dayIndex - 1;
  return subDays(day, diffToMonday);
}

export function getLocalWeekEnd(date: Date) {
  return addDays(getLocalWeekStart(date), 6);
}

export function getPlanTasksForDate(plan: HabitCoachPlan | null, dateKey: string): Task[] {
  if (!plan) return [];

  const planDay = plan.days.find((day) => day.dateKey === dateKey);
  if (!planDay) return [];

  return planDay.tasks.map((task, index) => ({
    id: index + 1,
    text: task.text,
    emoji: task.emoji,
    done: false,
    coachPlanId: plan.id,
    coachTaskId: task.id,
    category: task.category,
    reason: task.reason,
  }));
}

export function summarizeHabitPlanCompletion(
  plan: HabitCoachPlan,
  activityHistory: Record<string, DailyRecord>
): HabitCoachCompletionSummary {
  const missedCategories = new Set<HabitCategory>();
  const symptoms = new Set<string>();
  let totalTasks = 0;
  let completedTasks = 0;

  for (const day of plan.days) {
    const record = activityHistory[day.dateKey];
    const actualTasks = record?.tasks || [];

    for (const plannedTask of day.tasks) {
      totalTasks += 1;
      const actual = actualTasks.find(
        (task) =>
          task.coachPlanId === plan.id &&
          (task.coachTaskId === plannedTask.id ||
            (!task.coachTaskId &&
              task.text === plannedTask.text &&
              task.category === plannedTask.category))
      );

      if (actual?.done) {
        completedTasks += 1;
      } else {
        missedCategories.add(plannedTask.category);
      }
    }

    for (const symptom of record?.symptoms || []) {
      symptoms.add(symptom);
    }
  }

  return {
    planId: plan.id,
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    missedCategories: Array.from(missedCategories),
    symptoms: Array.from(symptoms),
  };
}
