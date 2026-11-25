import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function parseHHMM(hhmm: string, offsetMinutes: number = 0): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h * 60 + m + offsetMinutes + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('quiet-rhythms', {
      name: 'Daily Reflections',
      // eslint-disable-next-line import/namespace -- Documented Expo SDK 58 export.
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

const DAILY_REMINDER_BODIES = new Set([
  'Your morning anchor is ready.',
  'Time to set the day down.',
]);

async function getDailyReminderRequests() {
  const scheduled =
    await Notifications.getAllScheduledNotificationsAsync();

  return scheduled.filter(request =>
    request.content.title === 'Stillwater' &&
    DAILY_REMINDER_BODIES.has(request.content.body ?? '')
  );
}

export async function hasDailyRhythms(): Promise<boolean> {
  const permission = await Notifications.getPermissionsAsync();

  if (permission.status !== 'granted') return false;

  const scheduled = await getDailyReminderRequests();

  return scheduled.length > 0;
}

export async function cancelDailyRhythms(): Promise<void> {
  const scheduled = await getDailyReminderRequests();

  await Promise.all(scheduled.map(request =>
    Notifications.cancelScheduledNotificationAsync(
      request.identifier
    )
  ));
}

export async function scheduleDailyRhythms(morningHHMM: string, bedtimeHHMM: string): Promise<void> {
  await cancelDailyRhythms();
  const morning = parseHHMM(morningHHMM, 0);
  const examen = parseHHMM(bedtimeHHMM, -30);

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Stillwater', body: 'Your morning anchor is ready.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: morning.hour,
      minute: morning.minute,
    },
  });

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Stillwater', body: 'Time to set the day down.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: examen.hour,
      minute: examen.minute,
    },
  });
}
