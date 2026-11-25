export interface PreparationWindow {
  id: string;
  start: string;
  end: string;
  enabled: boolean;
}

export interface WindowMatch {
  window: PreparationWindow;
  minutesUntilStart: number;
  activeNow: boolean;
}

export const WINDOW_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS preparation_windows (',
  '  id TEXT PRIMARY KEY,',
  '  start_hhmm TEXT NOT NULL,',
  '  end_hhmm TEXT NOT NULL,',
  '  enabled INTEGER NOT NULL DEFAULT 1,',
  '  UNIQUE(start_hhmm, end_hhmm)',
  ');',
].join('\n');

export function timeToMinutes(value: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    return -1;
  }

  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function validWindow(
  start: string,
  end: string
): boolean {
  return timeToMinutes(start) >= 0 &&
    timeToMinutes(end) >= 0 &&
    start !== end;
}

export function formatWindowTime(value: string): string {
  const minutes = timeToMinutes(value);
  if (minutes < 0) return value;

  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, '0');

  return (hour % 12 || 12) + ':' + minute +
    (hour < 12 ? ' AM' : ' PM');
}

export function formatWindow(
  window: PreparationWindow
): string {
  return formatWindowTime(window.start) +
    ' - ' + formatWindowTime(window.end);
}

export function isWindowActive(
  window: PreparationWindow,
  minute: number
): boolean {
  if (!window.enabled ||
      !validWindow(window.start, window.end)) {
    return false;
  }

  const start = timeToMinutes(window.start);
  const end = timeToMinutes(window.end);

  return start < end
    ? minute >= start && minute < end
    : minute >= start || minute < end;
}

export function findPreparationWindow(
  windows: PreparationWindow[],
  now: Date,
  horizon = 180
): WindowMatch | null {
  const minute = now.getHours() * 60 + now.getMinutes();

  const candidates = windows
    .filter(window =>
      window.enabled &&
      validWindow(window.start, window.end)
    )
    .map(window => {
      const activeNow = isWindowActive(window, minute);

      return {
        window,
        activeNow,
        minutesUntilStart: activeNow
          ? 0
          : (timeToMinutes(window.start) - minute + 1440) % 1440,
      };
    })
    .filter(item => item.minutesUntilStart <= horizon)
    .sort((a, b) =>
      a.minutesUntilStart - b.minutesUntilStart ||
      a.window.id.localeCompare(b.window.id)
    );

  return candidates[0] ?? null;
}
