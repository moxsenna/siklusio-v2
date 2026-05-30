import test from 'node:test';
import assert from 'node:assert/strict';
import { format } from 'date-fns';
import {
  getLocalWeekStart,
  summarizeHabitPlanCompletion,
  getPlanTasksForDate,
} from './habitCoachPlan';
import type { HabitCoachPlan } from './habitCoachTypes';
import type { DailyRecord } from './cycleUtils';

const plan: HabitCoachPlan = {
  id: 'plan-1',
  weekStart: '2026-05-25',
  weekEnd: '2026-05-31',
  mode: 'initial',
  status: 'active',
  userGoal: 'promil aktif',
  coachSummary: 'Fokus ringan dan konsisten.',
  creditCost: 50,
  days: [
    {
      dateKey: '2026-05-25',
      dayIndex: 1,
      focus: 'hidrasi',
      tasks: [
        {
          id: 'water-1',
          text: 'Minum air 6 gelas',
          emoji: 'water',
          category: 'hydration',
          reason: 'Menjaga energi.',
        },
      ],
    },
  ],
};

test('getLocalWeekStart returns Monday for a date in the same week', () => {
  assert.equal(format(getLocalWeekStart(new Date(2026, 4, 30)), 'yyyy-MM-dd'), '2026-05-25');
});

test('getPlanTasksForDate maps coach tasks into daily checklist tasks', () => {
  const tasks = getPlanTasksForDate(plan, '2026-05-25');
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].text, 'Minum air 6 gelas');
  assert.equal(tasks[0].coachPlanId, 'plan-1');
  assert.equal(tasks[0].category, 'hydration');
});

test('summarizeHabitPlanCompletion counts completed coach tasks only', () => {
  const history: Record<string, DailyRecord> = {
    '2026-05-25': {
      symptoms: ['fatigue'],
      tasks: [
        {
          id: 1,
          text: 'Minum air 6 gelas',
          emoji: 'water',
          done: true,
          coachPlanId: 'plan-1',
          category: 'hydration',
        },
        {
          id: 2,
          text: 'Fallback task',
          emoji: 'star',
          done: true,
        },
      ],
    },
  };

  const summary = summarizeHabitPlanCompletion(plan, history);
  assert.equal(summary.totalTasks, 1);
  assert.equal(summary.completedTasks, 1);
  assert.equal(summary.completionRate, 100);
  assert.deepEqual(summary.symptoms, ['fatigue']);
});
