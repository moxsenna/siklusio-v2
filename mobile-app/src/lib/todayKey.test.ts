import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocalDateKey, getMsUntilNextLocalDay } from './todayKey';

test('getLocalDateKey formats a local calendar date without UTC shifting', () => {
  assert.equal(getLocalDateKey(new Date(2026, 5, 2, 23, 30)), '2026-06-02');
  assert.equal(getLocalDateKey(new Date(2026, 5, 3, 0, 5)), '2026-06-03');
});

test('getMsUntilNextLocalDay returns the remaining milliseconds until local midnight', () => {
  assert.equal(getMsUntilNextLocalDay(new Date(2026, 5, 2, 23, 59, 59, 500)), 500);
  assert.equal(getMsUntilNextLocalDay(new Date(2026, 5, 2, 0, 0, 0, 0)), 24 * 60 * 60 * 1000);
});
