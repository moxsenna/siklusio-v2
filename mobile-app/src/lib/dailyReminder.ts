export const DAILY_REMINDER_ENABLED_KEY = "hs_daily_reminder_enabled";
export const DAILY_REMINDER_NOTIFICATION_ID_KEY = "hs_daily_reminder_notification_id";
export const DAILY_REMINDER_HOUR = 8;
export const DAILY_REMINDER_MINUTE = 0;

export type DailyReminderPermissionStatus = "granted" | "denied" | "unsupported";
export type DailyReminderScheduleStatus =
  | "scheduled"
  | "permission-denied"
  | "unsupported"
  | "disabled";

export interface DailyReminderContent {
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface DailyReminderTime {
  hour: number;
  minute: number;
}

export interface DailyReminderNotificationAdapter {
  requestPermission: () => Promise<DailyReminderPermissionStatus>;
  scheduleDailyReminder: (
    content: DailyReminderContent,
    time: DailyReminderTime,
  ) => Promise<string>;
  cancelReminder: (notificationId: string) => Promise<void>;
}

export interface ReminderStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface DailyReminderContext {
  userNickname: string;
  currentPhase: string;
  cycleDay: number;
  daysToNextPeriod: number;
}

export interface EnableDailyReminderParams extends DailyReminderContext {
  adapter: DailyReminderNotificationAdapter;
  storage: ReminderStorage;
}

export interface DisableDailyReminderParams {
  adapter: DailyReminderNotificationAdapter;
  storage: ReminderStorage;
}

export function readDailyReminderEnabled(storage: ReminderStorage) {
  return storage.getItem(DAILY_REMINDER_ENABLED_KEY) === "true";
}

export function buildDailyReminderContent({
  userNickname,
  currentPhase,
  cycleDay,
  daysToNextPeriod,
}: DailyReminderContext): DailyReminderContent {
  const nickname = userNickname.trim() || "Bunda";
  let predictionText = "";

  if (currentPhase === "Menstrual") {
    predictionText = "Fokus pada istirahat dan penuhi asupan zat besi Anda hari ini.";
  } else if (currentPhase === "Ovulasi") {
    predictionText =
      "Peluang hamil Anda sedang sangat tinggi. Jangan lewatkan masa subur hari ini.";
  } else {
    predictionText = `Haid berikutnya diperkirakan dalam ${daysToNextPeriod} hari. Tetap jaga pola makan dan olahraga rutin ya.`;
  }

  return {
    title: "Pengingat Siklusio",
    body: `Selamat pagi ${nickname}! Hari ini Anda berada di fase ${currentPhase} (Hari ke-${cycleDay}). ${predictionText}`,
    data: { source: "daily-reminder" },
  };
}

export async function enableDailyReminder({
  adapter,
  storage,
  ...context
}: EnableDailyReminderParams): Promise<{
  status: DailyReminderScheduleStatus;
  notificationId?: string;
}> {
  const permission = await adapter.requestPermission();

  if (permission === "unsupported") {
    storage.setItem(DAILY_REMINDER_ENABLED_KEY, "false");
    storage.removeItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
    return { status: "unsupported" };
  }

  if (permission !== "granted") {
    storage.setItem(DAILY_REMINDER_ENABLED_KEY, "false");
    storage.removeItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
    return { status: "permission-denied" };
  }

  const previousNotificationId = storage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
  if (previousNotificationId) {
    await adapter.cancelReminder(previousNotificationId);
  }

  const notificationId = await adapter.scheduleDailyReminder(buildDailyReminderContent(context), {
    hour: DAILY_REMINDER_HOUR,
    minute: DAILY_REMINDER_MINUTE,
  });

  storage.setItem(DAILY_REMINDER_ENABLED_KEY, "true");
  storage.setItem(DAILY_REMINDER_NOTIFICATION_ID_KEY, notificationId);

  return { status: "scheduled", notificationId };
}

export async function disableDailyReminder({
  adapter,
  storage,
}: DisableDailyReminderParams): Promise<{ status: "disabled" }> {
  const notificationId = storage.getItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);
  if (notificationId) {
    await adapter.cancelReminder(notificationId);
  }

  storage.setItem(DAILY_REMINDER_ENABLED_KEY, "false");
  storage.removeItem(DAILY_REMINDER_NOTIFICATION_ID_KEY);

  return { status: "disabled" };
}
