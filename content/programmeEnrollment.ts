import type {
  ProgrammeDefinition,
} from './programme';

export interface ProgrammeEnrollment {
  id: string;
  programmeId: string;
  programmeVersion: number;
  joinedAt: string;
}

export const ENROLLMENT_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS programme_enrollments (',
  '  id TEXT PRIMARY KEY,',
  '  programme_id TEXT NOT NULL UNIQUE,',
  '  programme_version INTEGER NOT NULL',
  '    CHECK(programme_version >= 1),',
  '  joined_at TEXT NOT NULL',
  ');',
].join('\n');

export type ProgrammeAccessDecision =
  | 'allowed'
  | 'plus_required'
  | 'schedule_unavailable';

export function programmeAccessDecision(
  programme: ProgrammeDefinition,
  hasPlus: boolean
): ProgrammeAccessDecision {
  if (programme.access === 'plus' && !hasPlus) {
    return 'plus_required';
  }

  if (programme.schedule !== 'self_paced') {
    return 'schedule_unavailable';
  }

  return 'allowed';
}

// Prefer a participant's pinned edition over the
// newest edition in the available catalogue.
export function selectCatalogueEditions(
  programmes: ProgrammeDefinition[],
  enrollments: ProgrammeEnrollment[]
): ProgrammeDefinition[] {
  const selected = new Map<
    string,
    ProgrammeDefinition
  >();

  for (const programme of programmes) {
    const existing = selected.get(programme.id);

    if (
      !existing ||
      programme.version > existing.version
    ) {
      selected.set(programme.id, programme);
    }
  }

  for (const enrollment of enrollments) {
    const pinned = programmes.find(
      programme =>
        programme.id === enrollment.programmeId &&
        programme.version ===
          enrollment.programmeVersion
    );

    if (pinned) {
      selected.set(pinned.id, pinned);
    } else {
      // Never silently substitute a newer edition.
      selected.delete(enrollment.programmeId);
    }
  }

  return [...selected.values()];
}
