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
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyRhythms(morningHHMM: string, bedtimeHHMM: string): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
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