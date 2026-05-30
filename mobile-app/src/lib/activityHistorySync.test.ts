import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activityHistoryToRows,
  mergeActivityHistories,
  rowsToActivityHistory,
  stampDailyRecord,
  type ActivityHistoryRow,
} from './activityHistorySync';

const baseRecord = (updatedAt?: string) => ({
  symptoms: [],
  tasks: [],
  isPeriod: true,
  ...(updatedAt ? { updatedAt } : {}),
});

test('mergeActivityHistories keeps cloud record when cloud is newer', () => {
  const merged = mergeActivityHistories(
    {
      '2026-05-01': baseRecord('2026-05-01T00:00:00.000Z'),
    },
    {
      '2026-05-01': {
        symptoms: ['cramps'],
        tasks: [],
        isPeriod: true,
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    }
  );

  assert.deepEqual(merged['2026-05-01'].symptoms, ['cramps']);
  assert.equal(merged['2026-05-01'].updatedAt, '2026-05-02T00:00:00.000Z');
});

test('mergeActivityHistories keeps local record when local is newer', () => {
  const merged = mergeActivityHistories(
    {
      '2026-05-01': {
        symptoms: ['fatigue'],
        tasks: [],
        isPeriod: false,
        updatedAt: '2026-05-03T00:00:00.000Z',
      },
    },
    {
      '2026-05-01': baseRecord('2026-05-02T00:00:00.000Z'),
    }
  );

  assert.deepEqual(merged['2026-05-01'].symptoms, ['fatigue']);
  assert.equal(merged['2026-05-01'].isPeriod, false);
});

test('mergeActivityHistories does not let empty legacy local records wipe cloud records', () => {
  const merged = mergeActivityHistories(
    {
      '2026-05-01': {
        symptoms: [],
        tasks: [],
        isPeriod: false,
      },
    },
    {
      '2026-05-01': baseRecord('2026-05-02T00:00:00.000Z'),
    }
  );

  assert.equal(merged['2026-05-01'].isPeriod, true);
  assert.equal(merged['2026-05-01'].updatedAt, '2026-05-02T00:00:00.000Z');
});

test('activityHistoryToRows pushes meaningful legacy local records when cloud is empty', () => {
  const rows = activityHistoryToRows(
    {
      '2026-05-01': {
        symptoms: ['cramps'],
        tasks: [],
        isPeriod: false,
      },
    },
    {},
    'user-1',
    '2026-05-05T00:00:00.000Z'
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].date_key, '2026-05-01');
  assert.equal(rows[0].updated_at, '2026-05-05T00:00:00.000Z');
});

test('rowsToActivityHistory normalizes Supabase rows into local records', () => {
  const rows: ActivityHistoryRow[] = [
    {
      date_key: '2026-05-01',
      is_period: true,
      symptoms: ['cramps'],
      tasks: [{ id: 1, text: 'Minum Air', emoji: 'water', done: true }],
      updated_at: '2026-05-05T00:00:00.000Z',
    },
  ];

  const history = rowsToActivityHistory(rows);

  assert.equal(history['2026-05-01'].isPeriod, true);
  assert.deepEqual(history['2026-05-01'].symptoms, ['cramps']);
  assert.equal(history['2026-05-01'].updatedAt, '2026-05-05T00:00:00.000Z');
});

test('stampDailyRecord adds an update timestamp without dropping existing fields', () => {
  const stamped = stampDailyRecord(
    { symptoms: ['mood'], tasks: [], isPeriod: false },
    '2026-05-05T00:00:00.000Z'
  );

  assert.deepEqual(stamped.symptoms, ['mood']);
  assert.equal(stamped.updatedAt, '2026-05-05T00:00:00.000Z');
});
