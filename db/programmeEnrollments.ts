import * as Crypto from 'expo-crypto';

import { getDb } from './schema';
import { hasStillwaterPlus } from './entitlements';

import { getProgramme } from '../content/programmeCatalog';

import {
  programmeAccessDecision,
  type ProgrammeEnrollment,
} from '../content/programmeEnrollment';

import type {
  ProgrammeDefinition,
} from '../content/programme';

const SELECT_ENROLLMENT = [
  'SELECT id,',
  'programme_id AS programmeId,',
  'programme_version AS programmeVersion,',
  'joined_at AS joinedAt',
  'FROM programme_enrollments',
].join(' ');

export async function listProgrammeEnrollments():
  Promise<ProgrammeEnrollment[]> {
  const db = await getDb();

  return db.getAllAsync<ProgrammeEnrollment>(
    SELECT_ENROLLMENT + ' ORDER BY joined_at DESC;'
  );
}

export async function getProgrammeEnrollment(
  programmeId: string
): Promise<ProgrammeEnrollment | null> {
  const db = await getDb();

  return db.getFirstAsync<ProgrammeEnrollment>(
    SELECT_ENROLLMENT +
    ' WHERE programme_id = ?;',
    [programmeId]
  );
}

export async function checkProgrammeAccess(
  programme: ProgrammeDefinition
) {
  const hasPlus = programme.access === 'plus'
    ? await hasStillwaterPlus().catch(() => false)
    : false;

  return programmeAccessDecision(programme, hasPlus);
}

export async function joinProgramme(
  programmeId: string,
  version: number
): Promise<ProgrammeEnrollment> {
  const programme = getProgramme(
    programmeId,
    version
  );

  if (!programme) {
    throw new Error('Programme edition unavailable.');
  }

  const access = await checkProgrammeAccess(programme);

  if (access !== 'allowed') {
    throw new Error('Programme access unavailable.');
  }

  const db = await getDb();

  await db.runAsync(
    'INSERT INTO programme_enrollments ' +
    '(id, programme_id, programme_version, joined_at) ' +
    'VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(programme_id) DO NOTHING;',
    [
      Crypto.randomUUID(),
      programme.id,
      programme.version,
      new Date().toISOString(),
    ]
  );

  const enrollment =
    await getProgrammeEnrollment(programmeId);

  if (
    !enrollment ||
    enrollment.programmeVersion !== version
  ) {
    throw new Error(
      'An existing programme edition is already enrolled.'
    );
  }

  return enrollment;
}

export async function leaveProgramme(
  enrollmentId: string
): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    'DELETE FROM programme_enrollments WHERE id = ?;',
    [enrollmentId]
  );
}

export async function getEnrolledProgramme(
  enrollmentId: string
): Promise<ProgrammeDefinition | null> {
  const db = await getDb();

  const enrollment =
    await db.getFirstAsync<ProgrammeEnrollment>(
      SELECT_ENROLLMENT + ' WHERE id = ?;',
      [enrollmentId]
    );

  if (!enrollment) return null;

  const programme = getProgramme(
    enrollment.programmeId,
    enrollment.programmeVersion
  );

  if (!programme) return null;

  const access = await checkProgrammeAccess(programme);

  return access === 'allowed'
    ? programme
    : null;
}
