export const REMINDER_LEAD_MINUTES = 30;
export const MAX_PREPARATION_REMINDERS = 3;
export const REMINDER_PREFIX = 'stillwater-preparation:';

export function reminderIdentifier(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    throw new Error('Invalid window identifier.');
  }

  return REMINDER_PREFIX + id;
}

export function isPreparationReminder(
  identifier: string
): boolean {
  return identifier.startsWith(REMINDER_PREFIX);
}

export function reminderTime(start: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) {
    throw new Error('Invalid preparation start time.');
  }

  const [hour, minute] = start.split(':').map(Number);

  const total =
    (hour * 60 + minute -
      REMINDER_LEAD_MINUTES + 1440) % 1440;

  return {
    hour: Math.floor(total / 60),
    minute: total % 60,
    totalMinutes: total,
    hhmm:
      String(Math.floor(total / 60)).padStart(2, '0') +
      ':' +
      String(total % 60).padStart(2, '0'),
  };
}

export function canAddReminder(
  existing: { identifier: string; minute: number | null }[],
  identifier: string,
  minute: number
): 'allowed' | 'limit' | 'duplicate_time' {
  const others = existing.filter(
    item => item.identifier !== identifier
  );

  if (others.some(item => item.minute === minute)) {
    return 'duplicate_time';
  }

  if (others.length >= MAX_PREPARATION_REMINDERS) {
    return 'limit';
  }

  return 'allowed';
}
