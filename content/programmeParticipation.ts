import type { ProgrammeDay } from './programme';

import type {
  ProgrammeSession,
  StepDisposition,
} from './programmeSession';

export interface ProgrammeParticipation {
  enrollmentId: string;
  dayId: string;
  cursor: number;
  dispositionsJson: string;
  updatedAt: string;
  completedAt: string | null;
}

export const PARTICIPATION_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS programme_participation (',
  '  enrollment_id TEXT NOT NULL,',
  '  day_id TEXT NOT NULL,',
  '  cursor INTEGER NOT NULL CHECK(cursor >= 0),',
  '  dispositions_json TEXT NOT NULL,',
  '  updated_at TEXT NOT NULL,',
  '  completed_at TEXT,',
  '  PRIMARY KEY(enrollment_id, day_id)',
  ');',
  'CREATE TRIGGER IF NOT EXISTS remove_programme_participation',
  'AFTER DELETE ON programme_enrollments',
  'BEGIN',
  '  DELETE FROM programme_participation',
  '  WHERE enrollment_id = OLD.id;',
  'END;',
].join('\n');

export const SAVE_PROGRAMME_PROGRESS_SQL = [
  'INSERT INTO programme_participation',
  '(enrollment_id, day_id, cursor, dispositions_json, updated_at)',
  'SELECT ?, ?, ?, ?, ?',
  'WHERE EXISTS (',
  '  SELECT 1 FROM programme_enrollments WHERE id = ?',
  ')',
  'ON CONFLICT(enrollment_id, day_id) DO UPDATE SET',
  '  cursor = excluded.cursor,',
  '  dispositions_json = excluded.dispositions_json,',
  '  updated_at = excluded.updated_at',
  'WHERE programme_participation.completed_at IS NULL;',
].join(' ');

export const FINISH_PROGRAMME_SESSION_SQL = [
  'UPDATE programme_participation',
  'SET completed_at = ?, updated_at = ?',
  'WHERE enrollment_id = ? AND day_id = ?',
  'AND cursor = ? AND dispositions_json = ?',
  'AND completed_at IS NULL;',
].join(' ');

export function validateSavedSession(
  day: ProgrammeDay,
  value: unknown
): ProgrammeSession | null {
  if (!value || typeof value !== 'object') return null;

  const session = value as Partial<ProgrammeSession>;

  if (
    typeof session.cursor !== 'number' ||
    !Number.isInteger(session.cursor) ||
    session.cursor < 0 ||
    session.cursor > day.steps.length ||
    !Array.isArray(session.dispositions) ||
    session.dispositions.length !== day.steps.length
  ) {
    return null;
  }

  const dispositions: (StepDisposition | null)[] = [];

  for (let i = 0; i < day.steps.length; i++) {
    const item = session.dispositions[i];

    if (
      item !== null &&
      item !== 'continued' &&
      item !== 'skipped'
    ) {
      return null;
    }

    if (item === 'skipped' && !day.steps[i].optional) {
      return null;
    }

    if (i < session.cursor && item === null) {
      return null;
    }

    dispositions.push(item);
  }

  return {
    cursor: session.cursor,
    dispositions,
  };
}

export function restoreSavedSession(
  day: ProgrammeDay,
  record: ProgrammeParticipation
): ProgrammeSession | null {
  if (record.dayId !== day.id) return null;

  try {
    return validateSavedSession(day, {
      cursor: record.cursor,
      dispositions: JSON.parse(
        record.dispositionsJson
      ),
    });
  } catch {
    return null;
  }
}

export function participationStatus(
  record?: ProgrammeParticipation
): 'not_started' | 'in_progress' | 'finished' {
  if (!record) return 'not_started';

  return record.completedAt
    ? 'finished'
    : 'in_progress';
}
