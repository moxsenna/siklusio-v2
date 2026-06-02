import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DAILY_REMINDER_ENABLED_KEY,
  DAILY_REMINDER_HOUR,
  DAILY_REMINDER_MINUTE,
  DAILY_REMINDER_NOTIFICATION_ID_KEY,
  buildDailyReminderContent,
  disableDailyReminder,
  enableDailyReminder,
  readDailyReminderEnabled,
  type DailyReminderNotificationAdapter,
  type ReminderStorage,
} from './dailyReminder';

function createMemoryStorage(initial: Record<string, string> = {}): ReminderStorage & { values: Record<string, string> } {
  const values = { ...initial };

  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
    removeItem: (key) => {
      delete values[key];
    },
  };
}

function createAdapter(permission: 'granted' | 'denied' | 'unsupported' = 'granted') {
  const calls: Array<{ type: string; value?: unknown }> = [];
  const adapter: DailyReminderNotificationAdapter = {
    requestPermission: async () => {
      calls.push({ type: 'requestPermission' });
      return permission;
    },
    scheduleDailyReminder: async (content, time) => {
      calls.push({ type: 'schedule', value: { content, time } });
      return 'schedule-123';
    },
    cancelReminder: async (id) => {
      calls.push({ type: 'cancel', value: id });
    },
  };

  return { adapter, calls };
}

test('buildDailyReminderContent creates personalized ovulation reminder copy', () => {
  const content = buildDailyReminderContent({
    userNickname: 'Naya',
    currentPhase: 'Ovulasi',
    cycleDay: 14,
    daysToNextPeriod: 14,
  });

  assert.equal(content.title, 'Pengingat Siklusio');
  assert.match(content.body, /Selamat pagi Naya/);
  assert.match(content.body, /fase Ovulasi/);
  assert.match(content.body, /Hari ke-14/);
  assert.match(content.body, /Peluang hamil/);
  assert.deepEqual(content.data, { source: 'daily-reminder' });
});

test('enableDailyReminder does not schedule when permission is denied', async () => {
  const storage = createMemoryStorage();
  const { adapter, calls } = createAdapter('denied');

  const result = await enableDailyReminder({
    adapter,
    storage,
    userNickname: 'Naya',
    currentPhase: 'Menstrual',
    cycleDay: 2,
    daysToNextPeriod: 25,
  });

  assert.equal(result.status, 'permission-denied');
  assert.equal(readDailyReminderEnabled(storage), false);
  assert.equal(storage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY), null);
  assert.deepEqual(calls.map((call) => call.type), ['requestPermission']);
});

test('enableDailyReminder cancels previous schedule and stores the new daily schedule id', async () => {
  const storage = createMemoryStorage({
    [DAILY_REMINDER_NOTIFICATION_ID_KEY]: 'old-schedule',
  });
  const { adapter, calls } = createAdapter('granted');

  const result = await enableDailyReminder({
    adapter,
    storage,
    userNickname: '',
    currentPhase: 'Luteal',
    cycleDay: 21,
    daysToNextPeriod: 7,
  });

  assert.equal(result.status, 'scheduled');
  assert.equal(result.notificationId, 'schedule-123');
  assert.equal(storage.getItem(DAILY_REMINDER_ENABLED_KEY), 'true');
  assert.equal(storage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY), 'schedule-123');
  assert.deepEqual(calls.map((call) => call.type), ['requestPermission', 'cancel', 'schedule']);
  assert.equal(calls[1].value, 'old-schedule');
  assert.deepEqual((calls[2].value as { time: unknown }).time, {
    hour: DAILY_REMINDER_HOUR,
    minute: DAILY_REMINDER_MINUTE,
  });
});

test('disableDailyReminder cancels stored schedule and persists disabled state', async () => {
  const storage = createMemoryStorage({
    [DAILY_REMINDER_ENABLED_KEY]: 'true',
    [DAILY_REMINDER_NOTIFICATION_ID_KEY]: 'schedule-123',
  });
  const { adapter, calls } = createAdapter('granted');

  const result = await disableDailyReminder({ adapter, storage });

  assert.equal(result.status, 'disabled');
  assert.equal(readDailyReminderEnabled(storage), false);
  assert.equal(storage.getItem(DAILY_REMINDER_ENABLED_KEY), 'false');
  assert.equal(storage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY), null);
  assert.deepEqual(calls, [{ type: 'cancel', value: 'schedule-123' }]);
});
