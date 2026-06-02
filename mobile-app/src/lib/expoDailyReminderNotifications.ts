import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type {
  DailyReminderContent,
  DailyReminderNotificationAdapter,
  DailyReminderTime,
} from './dailyReminder';

const DAILY_REMINDER_CHANNEL_ID = 'daily-reminders';

let notificationHandlerConfigured = false;

export function configureDailyReminderNotificationHandler() {
  if (notificationHandlerConfigured || Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
}

async function ensureAndroidReminderChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
    name: 'Pengingat Harian Siklusio',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#ec4899',
  });
}

export const expoDailyReminderNotifications: DailyReminderNotificationAdapter = {
  requestPermission: async () => {
    if (Platform.OS === 'web') return 'unsupported';

    await ensureAndroidReminderChannel();

    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return 'granted';

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted' ? 'granted' : 'denied';
  },

  scheduleDailyReminder: async (content: DailyReminderContent, time: DailyReminderTime) => {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId: DAILY_REMINDER_CHANNEL_ID,
        hour: time.hour,
        minute: time.minute,
      },
    });

    return notificationId;
  },

  cancelReminder: async (notificationId: string) => {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },
};
