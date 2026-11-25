export interface CalendarActivity {
  date: string;
  status: string;
  morningCompleted: boolean;
  examenCompleted: boolean;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec',
];

export function calendarDate(value: string): Date {
  return new Date(value + 'T12:00:00Z');
}

export function shortDate(value: string): string {
  const date = calendarDate(value);

  return date.getUTCDate() + ' ' +
    MONTHS[date.getUTCMonth()];
}

export function dateRange(
  first: string,
  last: string
): string {
  const a = calendarDate(first);
  const b = calendarDate(last);

  const differentYears =
    a.getUTCFullYear() !== b.getUTCFullYear();

  return shortDate(first) +
    (differentYears ? ' ' + a.getUTCFullYear() : '') +
    ' - ' + shortDate(last) +
    ' ' + b.getUTCFullYear();
}

export function calendarWeeks<T extends { date: string }>(
  days: T[]
): (T | null)[][] {
  if (days.length === 0) return [];

  const first = calendarDate(days[0].date);

  // Monday-first calendar.
  const offset = (first.getUTCDay() + 6) % 7;

  const cells: (T | null)[] = [
    ...Array<T | null>(offset).fill(null),
    ...days,
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (T | null)[][] = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

export function activityFlags(day: CalendarActivity) {
  return {
    practice:
      day.morningCompleted || day.examenCompleted,
    returned: day.status === 'returned',
  };
}

export function activityLabel(
  day: CalendarActivity
): string {
  const labels: string[] = [];

  if (day.morningCompleted) {
    labels.push('Morning practice recorded');
  }

  if (day.examenCompleted) {
    labels.push('Evening practice recorded');
  }

  if (day.status === 'returned') {
    labels.push('Return recorded');
  }

  return labels.length
    ? labels.join('. ')
    : 'No morning or evening practice or return recorded';
}
