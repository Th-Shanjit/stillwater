export type SanctuaryStage = 0 | 1 | 2 | 3 | 4;

export const GROWTH_THRESHOLDS = [
  { stage: 1, days: 1 },
  { stage: 2, days: 5 },
  { stage: 3, days: 12 },
  { stage: 4, days: 25 },
] as const;

export const SANCTUARY_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS sanctuary_state (',
  '  id INTEGER PRIMARY KEY CHECK(id = 1),',
  '  stage INTEGER NOT NULL DEFAULT 0',
  '    CHECK(stage BETWEEN 0 AND 4)',
  ');',
  'INSERT OR IGNORE INTO sanctuary_state',
  '  (id, stage) VALUES (1, 0);',
].join('\n');

export function normalizeStage(
  stage: number
): SanctuaryStage {
  if (!Number.isFinite(stage)) return 0;

  return Math.max(
    0,
    Math.min(4, Math.floor(stage))
  ) as SanctuaryStage;
}

export function earnedStage(
  practiceDays: number
): SanctuaryStage {
  let stage: SanctuaryStage = 0;

  for (const item of GROWTH_THRESHOLDS) {
    if (practiceDays >= item.days) {
      stage = item.stage;
    }
  }

  return stage;
}

export function permanentStage(
  previous: number,
  practiceDays: number
): SanctuaryStage {
  return normalizeStage(
    Math.max(
      normalizeStage(previous),
      earnedStage(practiceDays)
    )
  );
}

// A single atomic SQL update prevents stage regression
// even when multiple screens refresh concurrently.

const cases = [...GROWTH_THRESHOLDS]
  .reverse()
  .map(item =>
    'WHEN COUNT(*) >= ' + item.days +
    ' THEN ' + item.stage
  )
  .join(' ');

export const REFRESH_SANCTUARY_SQL = [
  'UPDATE sanctuary_state',
  'SET stage = MAX(stage, (',
  '  SELECT CASE',
  cases,
  '    ELSE 0 END',
  '  FROM daily_logs',
  '  WHERE date <= ?',
  '    AND (morning_completed = 1',
  '         OR examen_completed = 1)',
  '))',
  'WHERE id = 1;',
].join(' ');

export function sanctuaryDescription(
  stage: SanctuaryStage
): string {
  const additions: string[] = [];

  if (stage >= 1) additions.push('an olive sapling');
  if (stage >= 2) additions.push('a lakeside bench');
  if (stage >= 3) additions.push('a lantern');
  if (stage >= 4) additions.push('wildflowers');

  return additions.length
    ? ' The shore includes ' + additions.join(', ') + '.'
    : '';
}
