import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCycleGuidePreview } from './cycleGuideSummary';

test('returns starter level for new users with no manual period history', () => {
  const preview = buildCycleGuidePreview({
    currentPhase: 'Folikular',
    cycleDay: 7,
    daysToNextPeriod: 21,
    cycleConfidence: 'low',
    periodConfidence: 'low',
    hasManualLogs: false,
    activityHistory: {},
    activeHabitPlanSummary: null,
  });

  assert.equal(preview.level, 'starter');
  assert.match(preview.title, /Panduan awal/);
  assert.equal(preview.canShowPersonalPatterns, false);
});

test('returns active level when user has recent activity but low cycle confidence', () => {
  const preview = buildCycleGuidePreview({
    currentPhase: 'Luteal',
    cycleDay: 22,
    daysToNextPeriod: 6,
    cycleConfidence: 'low',
    periodConfidence: 'medium',
    hasManualLogs: true,
    activityHistory: {
      '2026-05-01': { symptoms: ['fatigue'], tasks: [] },
      '2026-05-02': { symptoms: [], tasks: [] },
    },
    activeHabitPlanSummary: { completionRate: 80 },
  });

  assert.equal(preview.level, 'active');
  assert.equal(preview.canShowPersonalPatterns, false);
});

test('returns personal level when confidence and logs are enough', () => {
  const preview = buildCycleGuidePreview({
    currentPhase: 'Ovulasi',
    cycleDay: 14,
    daysToNextPeriod: 14,
    cycleConfidence: 'high',
    periodConfidence: 'high',
    hasManualLogs: true,
    activityHistory: {
      '2026-05-01': { symptoms: ['cramps'], tasks: [] },
      '2026-05-02': { symptoms: ['fatigue'], tasks: [] },
      '2026-05-03': { symptoms: [], tasks: [] },
    },
    activeHabitPlanSummary: { completionRate: 67 },
  });

  assert.equal(preview.level, 'personal');
  assert.equal(preview.canShowPersonalPatterns, true);
});
