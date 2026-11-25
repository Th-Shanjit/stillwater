import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  PreparationWindow,
} from '../content/preparationWindows';

import {
  reminderIdentifier,
  isPreparationReminder,
  reminderTime,
  canAddReminder,
} from '../content/preparationReminderRules';

const CHANNEL_ID = 'quiet-preparation';

export class PreparationReminderError extends Error {}

export interface PreparationReminderState {
  supported: boolean;
  permissionGranted: boolean;
  scheduledIds: string[];
}

function supported(): boolean {
  return Platform.OS === 'android' ||
    Platform.OS === 'ios';
}

async function getRequests() {
  const requests =
    await Notifications.getAllScheduledNotificationsAsync();

  return requests.filter(request =>
    isPreparationReminder(request.identifier)
  );
}

export async function getPreparationReminderState():
  Promise<PreparationReminderState> {
  if (!supported()) {
    return {
      supported: false,
      permissionGranted: false,
      scheduledIds: [],
    };
  }

  const [permission, requests] = await Promise.all([
    Notifications.getPermissionsAsync(),
    getRequests(),
  ]);

  return {
    supported: true,
    permissionGranted: permission.status === 'granted',
    scheduledIds: requests.map(item => item.identifier),
  };
}

export async function cancelPreparationReminder(
  windowId: string
): Promise<void> {
  if (!supported()) return;

  const identifier = reminderIdentifier(windowId);
  const requests = await getRequests();

  if (requests.some(item =>
    item.identifier === identifier
  )) {
    await Notifications.cancelScheduledNotificationAsync(
      identifier
    );
  }
}

export async function enablePreparationReminder(
  window: PreparationWindow
): Promise<void> {
  if (!supported()) {
    throw new PreparationReminderError(
      'Preparation reminders are available on mobile devices.'
    );
  }

  if (!window.enabled) {
    throw new PreparationReminderError(
      'Enable this preparation window first.'
    );
  }

  const identifier = reminderIdentifier(window.id);
  const time = reminderTime(window.start);

  const requests = await getRequests();

  const decision = canAddReminder(
    requests.map(request => ({
      identifier: request.identifier,
      minute:
        typeof request.content.data?.reminderMinute === 'number'
          ? request.content.data.reminderMinute
          : null,
    })),
    identifier,
    time.totalMinutes
  );

  if (decision === 'limit') {
    throw new PreparationReminderError(
      'You can have up to three preparation reminders. Disable another one first.'
    );
  }

  if (decision === 'duplicate_time') {
    throw new PreparationReminderError(
      'A preparation reminder is already scheduled at this time.'
    );
  }

  // Create the Android channel before requesting permission.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      CHANNEL_ID,
      {
        name: 'Quiet reminders',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        enableVibrate: false,
        showBadge: false,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PRIVATE,
      }
    );
  }

  let permission =
    await Notifications.getPermissionsAsync();

  if (permission.status !== 'granted' &&
      permission.canAskAgain) {
    permission =
      await Notifications.requestPermissionsAsync();
  }

  if (permission.status !== 'granted') {
    throw new PreparationReminderError(
      'Allow notifications in your device settings before enabling a reminder.'
    );
  }

  // Replace only this window's schedule.
  await cancelPreparationReminder(window.id);

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: 'Stillwater',
      body: 'A little space for yourself. Take a moment to prepare, if it would help.',
      sound: false,
      data: {
        kind: 'preparation_reminder',
        reminderMinute: time.totalMinutes,
      },
    },
    trigger: {
      type:
        Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
      channelId: CHANNEL_ID,
    },
  });
}
