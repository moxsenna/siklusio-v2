import test from 'node:test';
import assert from 'node:assert/strict';
import { format } from 'date-fns';
import {
  getLocalWeekStart,
  mapApiHabitPlan,
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

test('mapApiHabitPlan maps Supabase snake_case rows into mobile plan shape', () => {
  const mapped = mapApiHabitPlan({
    id: 'plan-api',
    week_start: '2026-06-01',
    week_end: '2026-06-07',
    mode: 'initial',
    status: 'active',
    user_goal: 'promil aktif',
    coach_summary: 'Mulai ringan.',
    credit_cost: 50,
    habit_coach_plan_days: [
      {
        date_key: '2026-06-02',
        day_index: 2,
        focus: 'Nutrisi',
        tasks: [
          {
            id: 'task-2',
            text: 'Makan protein sederhana',
            emoji: 'plate',
            category: 'nutrition',
            reason: 'Menjaga energi.',
          },
        ],
      },
      {
        date_key: '2026-06-01',
        day_index: 1,
        focus: 'Hidrasi',
        tasks: [
          {
            id: 'task-1',
            text: 'Minum air 6 gelas',
            emoji: 'water',
            category: 'hydration',
            reason: 'Mendukung cairan tubuh.',
          },
        ],
      },
    ],
  });

  assert.equal(mapped.id, 'plan-api');
  assert.equal(mapped.weekStart, '2026-06-01');
  assert.equal(mapped.coachSummary, 'Mulai ringan.');
  assert.equal(mapped.days[0].dateKey, '2026-06-01');
  assert.equal(mapped.days[1].tasks[0].category, 'nutrition');
});
