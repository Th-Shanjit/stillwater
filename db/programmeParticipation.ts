import { getDb } from './schema';

import {
  getProgramme,
} from '../content/programmeCatalog';

import {
  findProgrammeDay,
} from '../content/programme';

import {
  getEnrolledProgramme,
} from './programmeEnrollments';

import {
  getProgrammeSessionResult,
  type ProgrammeSession,
  type ProgrammeSessionResult,
} from '../content/programmeSession';

import {
  SAVE_PROGRAMME_PROGRESS_SQL,
  FINISH_PROGRAMME_SESSION_SQL,
  validateSavedSession,
  restoreSavedSession,
  type ProgrammeParticipation,
} from '../content/programmeParticipation';

const SELECT_PARTICIPATION = [
  'SELECT enrollment_id AS enrollmentId,',
  'day_id AS dayId,',
  'cursor,',
  'dispositions_json AS dispositionsJson,',
  'updated_at AS updatedAt,',
  'completed_at AS completedAt',
  'FROM programme_participation',
].join(' ');

export async function listProgrammeParticipation():
  Promise<ProgrammeParticipation[]> {
  const db = await getDb();

  return db.getAllAsync<ProgrammeParticipation>(
    SELECT_PARTICIPATION + ' ORDER BY updated_at DESC;'
  );
}

export async function getProgrammeParticipation(
  enrollmentId: string,
  dayId: string
): Promise<ProgrammeParticipation | null> {
  const db = await getDb();

  return db.getFirstAsync<ProgrammeParticipation>(
    SELECT_PARTICIPATION +
    ' WHERE enrollment_id = ? AND day_id = ?;',
    [enrollmentId, dayId]
  );
}

async function getPinnedDay(
  enrollmentId: string,
  dayId: string
) {
  const db = await getDb();

  const enrollment = await db.getFirstAsync<{
    programme_id: string;
    programme_version: number;
  }>(
    'SELECT programme_id, programme_version ' +
    'FROM programme_enrollments WHERE id = ?;',
    [enrollmentId]
  );

  if (!enrollment) {
    throw new Error('Enrolment no longer exists.');
  }

  const programme = getProgramme(
    enrollment.programme_id,
    enrollment.programme_version
  );

  const day = programme
    ? findProgrammeDay(programme, dayId)
    : null;

  if (!day) {
    throw new Error('Session edition unavailable.');
  }

  return day;
}

export async function saveProgrammeProgress(
  enrollmentId: string,
  dayId: string,
  session: ProgrammeSession
): Promise<ProgrammeParticipation> {
  const day = await getPinnedDay(
    enrollmentId,
    dayId
  );

  const clean = validateSavedSession(day, session);

  if (!clean) {
    throw new Error('Invalid session position.');
  }

  const db = await getDb();

  const result = await db.runAsync(
    SAVE_PROGRAMME_PROGRESS_SQL,
    [
      enrollmentId,
      dayId,
      clean.cursor,
      JSON.stringify(clean.dispositions),
      new Date().toISOString(),
      enrollmentId,
    ]
  );

  if (result.changes !== 1) {
    throw new Error('Session could not be saved.');
  }

  const record = await getProgrammeParticipation(
    enrollmentId,
    dayId
  );

  if (!record) {
    throw new Error('Saved session unavailable.');
  }

  return record;
}

export async function finishProgrammeSession(
  enrollmentId: string,
  result: ProgrammeSessionResult
): Promise<ProgrammeParticipation> {
  const programme =
    await getEnrolledProgramme(enrollmentId);

  const day = programme
    ? findProgrammeDay(programme, result.dayId)
    : null;

  if (!day) {
    throw new Error('Session access unavailable.');
  }

  const record = await getProgrammeParticipation(
    enrollmentId,
    day.id
  );

  if (!record) {
    throw new Error('No saved session.');
  }

  const session = restoreSavedSession(day, record);

  const expected = session
    ? getProgrammeSessionResult(day, session)
    : null;

  if (
    !expected ||
    JSON.stringify(expected) !== JSON.stringify(result)
  ) {
    throw new Error('Session completion is invalid.');
  }

  if (record.completedAt) return record;

  const db = await getDb();
  const now = new Date().toISOString();

  await db.runAsync(
    FINISH_PROGRAMME_SESSION_SQL,
    [
      now,
      now,
      enrollmentId,
      day.id,
      record.cursor,
      record.dispositionsJson,
    ]
  );

  const updated = await getProgrammeParticipation(
    enrollmentId,
    day.id
  );

  if (!updated?.completedAt) {
    throw new Error('Completion could not be saved.');
  }

  return updated;
}
