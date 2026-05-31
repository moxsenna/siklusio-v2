import { addDays, startOfDay, subDays } from 'date-fns';
import type { DailyRecord, Task } from './cycleUtils';
import type {
  HabitCategory,
  HabitCoachCompletionSummary,
  HabitCoachPlan,
  HabitCoachTask,
} from './habitCoachTypes';

const habitCategories: HabitCategory[] = [
  'hydration',
  'nutrition',
  'movement',
  'rest',
  'emotional',
  'promil',
  'partner',
];

function normalizeCategory(value: unknown): HabitCategory {
  return habitCategories.includes(value as HabitCategory)
    ? (value as HabitCategory)
    : 'emotional';
}

function normalizeCoachTask(task: any, index: number): HabitCoachTask {
  return {
    id: String(task?.id || `task-${index + 1}`),
    text: String(task?.text || ''),
    emoji: String(task?.emoji || 'star'),
    category: normalizeCategory(task?.category),
    reason: String(task?.reason || ''),
  };
}

export function mapApiHabitPlan(row: any): HabitCoachPlan {
  if (!row) {
    throw new Error('Habit coach plan is empty');
  }

  const rawDays = Array.isArray(row.habit_coach_plan_days)
    ? row.habit_coach_plan_days
    : Array.isArray(row.days)
      ? row.days
      : [];

  return {
    id: String(row.id),
    weekStart: String(row.week_start || row.weekStart || ''),
    weekEnd: String(row.week_end || row.weekEnd || ''),
    mode: row.mode === 'renewal' ? 'renewal' : 'initial',
    status: row.status || 'active',
    userGoal: String(row.user_goal || row.userGoal || ''),
    coachSummary: String(row.coach_summary || row.coachSummary || ''),
    creditCost: Number(row.credit_cost || row.creditCost || 0),
    days: rawDays
      .map((day: any) => ({
        dateKey: String(day.date_key || day.dateKey || ''),
        dayIndex: Number(day.day_index || day.dayIndex || 0),
        focus: String(day.focus || ''),
        tasks: Array.isArray(day.tasks)
          ? day.tasks.map((task: any, index: number) => normalizeCoachTask(task, index))
          : [],
      }))
      .sort((a: any, b: any) => a.dayIndex - b.dayIndex),
  };
}

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

function taskSignature(task: Task) {
  return `${(task.text || "").trim().toLowerCase()}::${task.category || ""}`;
}

export function mergeCoachTasksWithSavedState(
  plannedTasks: Task[],
  savedTasks?: Task[]
): Task[] {
  if (!savedTasks || savedTasks.length === 0) {
    return plannedTasks;
  }

  const savedByCoachTaskId = new Map<string, Task>();
  const savedBySignature = new Map<string, Task>();
  const plannedCoachPlanIds = new Set(
    plannedTasks.map((task) => task.coachPlanId).filter(Boolean)
  );

  for (const savedTask of savedTasks) {
    if (
      savedTask.coachPlanId &&
      plannedCoachPlanIds.size > 0 &&
      !plannedCoachPlanIds.has(savedTask.coachPlanId)
    ) {
      continue;
    }

    if (savedTask.coachTaskId) {
      savedByCoachTaskId.set(savedTask.coachTaskId, savedTask);
    }
    savedBySignature.set(taskSignature(savedTask), savedTask);
  }

  return plannedTasks.map((task) => {
    const match =
      (task.coachTaskId ? savedByCoachTaskId.get(task.coachTaskId) : undefined) ||
      savedBySignature.get(taskSignature(task));

    return {
      ...task,
      done: Boolean(match?.done),
    };
  });
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
