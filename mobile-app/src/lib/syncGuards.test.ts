import { strict as assert } from 'node:assert';
import test from 'node:test';
import { canSyncCycleProfile } from './syncGuards';

test('canSyncCycleProfile blocks sync while cloud profile is loading', () => {
  assert.equal(
    canSyncCycleProfile({
      userId: 'user-1',
      isProfileLoading: true,
      hasLastPeriodDate: true,
      cycleLength: 28,
      periodLength: 5,
    }),
    false
  );
});

test('canSyncCycleProfile requires an authenticated user and valid cycle settings', () => {
  assert.equal(
    canSyncCycleProfile({
      userId: null,
      isProfileLoading: false,
      hasLastPeriodDate: true,
      cycleLength: 28,
      periodLength: 5,
    }),
    false
  );

  assert.equal(
    canSyncCycleProfile({
      userId: 'user-1',
      isProfileLoading: false,
      hasLastPeriodDate: false,
      cycleLength: 28,
      periodLength: 5,
    }),
    false
  );

  assert.equal(
    canSyncCycleProfile({
      userId: 'user-1',
      isProfileLoading: false,
      hasLastPeriodDate: true,
      cycleLength: 0,
      periodLength: 5,
    }),
    false
  );
});

test('canSyncCycleProfile allows sync after profile load with complete cycle settings', () => {
  assert.equal(
    canSyncCycleProfile({
      userId: 'user-1',
      isProfileLoading: false,
      hasLastPeriodDate: true,
      cycleLength: 28,
      periodLength: 5,
    }),
    true
  );
});
