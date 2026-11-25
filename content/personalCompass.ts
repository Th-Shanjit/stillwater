export const COMPASS_RULES = {
  minimumEvents: 5,
  minimumDates: 3,
  minimumRepeatedEvents: 3,
  minimumRepeatedDates: 3,
} as const;

export const TIME_WINDOWS = [
  '12 AM - 3 AM',
  '3 AM - 6 AM',
  '6 AM - 9 AM',
  '9 AM - 12 PM',
  '12 PM - 3 PM',
  '3 PM - 6 PM',
  '6 PM - 9 PM',
  '9 PM - 12 AM',
] as const;

const CONTEXT_LABELS: Record<string, string> = {
  exhausted: 'Tiredness',
  lonely: 'Loneliness',
  stressed: 'Stress',
  bored: 'Boredom',
  numb: 'Feeling numb',
  rejected: 'Hurt or rejection',
  autopilot: 'Acting on autopilot',
};

const ACTION_LABELS: Record<string, string> = {
  move: 'Change surroundings',
  phone: 'Put phone away',
  water: 'Get a glass of water',
  personal_plan: 'Personal plan',
  trusted_contact: 'Open a contact message',
};

export interface PauseObservation {
  id: string;
  date: string;
  hour: number;
  context: string | null;
}

export interface ActionObservation {
  sessionId: string;
  action: string | null;
}

export interface PracticeObservation {
  sessionId: string;
  contentId: string | null;
  contentVersion: number | null;
  kind: string;
}

export interface CompassInput {
  pauses: PauseObservation[];
  returns: number;
  actions: ActionObservation[];
  practices: PracticeObservation[];
}

export interface CountItem {
  key: string;
  label: string;
  count: number;
}

export interface RepeatedPattern extends CountItem {
  total: number;
  distinctDates: number;
}

function hasLabel(
  labels: Record<string, string>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(labels, key);
}

function uniqueById<T>(
  rows: T[],
  getId: (row: T) => string
): T[] {
  const seen = new Set<string>();

  return rows.filter(row => {
    const id = getId(row);

    if (!id || seen.has(id)) return false;

    seen.add(id);
    return true;
  });
}

function findRepeatedPattern(
  rows: PauseObservation[],
  getKey: (row: PauseObservation) => string,
  getLabel: (key: string) => string
): RepeatedPattern | null {
  if (
    rows.length < COMPASS_RULES.minimumEvents ||
    new Set(rows.map(row => row.date)).size <
      COMPASS_RULES.minimumDates
  ) {
    return null;
  }

  const groups = new Map<
    string,
    { count: number; dates: Set<string> }
  >();

  for (const row of rows) {
    const key = getKey(row);

    const group = groups.get(key) ?? {
      count: 0,
      dates: new Set<string>(),
    };

    group.count++;
    group.dates.add(row.date);
    groups.set(key, group);
  }

  const ranked = [...groups.entries()].sort(
    (a, b) => b[1].count - a[1].count
  );

  const [key, top] = ranked[0];

  if (
    top.count < COMPASS_RULES.minimumRepeatedEvents ||
    top.dates.size < COMPASS_RULES.minimumRepeatedDates ||
    ranked[1]?.[1].count === top.count
  ) {
    return null;
  }

  return {
    key,
    label: getLabel(key),
    count: top.count,
    total: rows.length,
    distinctDates: top.dates.size,
  };
}

export function buildPersonalCompass(
  input: CompassInput
) {
  const pauses = uniqueById(
    input.pauses.filter(row =>
      Number.isInteger(row.hour) &&
      row.hour >= 0 &&
      row.hour < 24 &&
      /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    ),
    row => row.id
  );

  const distinctDates =
    new Set(pauses.map(row => row.date)).size;

  const timeBuckets = TIME_WINDOWS.map(
    (label, index) => ({
      key: String(index),
      label,
      count: pauses.filter(row =>
        Math.floor(row.hour / 3) === index
      ).length,
    })
  );

  const timePattern = findRepeatedPattern(
    pauses,
    row => String(Math.floor(row.hour / 3)),
    key => TIME_WINDOWS[Number(key)]
  );

  const tagged = pauses.filter(row =>
    row.context !== null &&
    hasLabel(CONTEXT_LABELS, row.context)
  );

  const contextPattern = findRepeatedPattern(
    tagged,
    row => row.context!,
    key => CONTEXT_LABELS[key]
  );

  const actions = uniqueById(
    input.actions,
    row => row.sessionId
  );

  const actionCounts = new Map<string, number>();

  for (const row of actions) {
    if (
      row.action &&
      hasLabel(ACTION_LABELS, row.action)
    ) {
      actionCounts.set(
        row.action,
        (actionCounts.get(row.action) ?? 0) + 1
      );
    }
  }

  const chosenActions: CountItem[] =
    [...actionCounts.entries()]
      .map(([key, count]) => ({
        key,
        label: ACTION_LABELS[key],
        count,
      }))
      .sort((a, b) =>
        b.count - a.count ||
        a.key.localeCompare(b.key)
      );

  const starts = uniqueById(
    input.practices.filter(row =>
      row.kind === 'practice_started' &&
      !!row.contentId &&
      row.contentVersion !== null
    ),
    row => row.sessionId
  );

  const endKeys = new Set(
    input.practices
      .filter(row =>
        row.kind === 'practice_end_reached'
      )
      .map(row => JSON.stringify([
        row.sessionId,
        row.contentId,
        row.contentVersion,
      ]))
  );

  const practicesEnded = starts.filter(row =>
    endKeys.has(JSON.stringify([
      row.sessionId,
      row.contentId,
      row.contentVersion,
    ]))
  ).length;

  return {
    pauseCount: pauses.length,
    returnCount: Math.max(0, input.returns),
    distinctDates,
    timeBuckets,
    timePattern,
    contextPattern,
    taggedCount: tagged.length,
    chosenActions,
    actionSelectionCount: chosenActions.reduce(
      (total, item) => total + item.count, 0
    ),
    practicesStarted: starts.length,
    practicesEnded,
  };
}

export type PersonalCompassSummary =
  ReturnType<typeof buildPersonalCompass>;
