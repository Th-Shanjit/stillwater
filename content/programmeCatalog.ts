import {
  parseProgramme,
  programmeKey,
} from './programme';

import type {
  ProgrammeDefinition,
} from './programme';


import quietEvenings from '../assets/programmes/three_quiet_evenings.v1.json';

// Approved editions only.
// Retain older editions used by existing participants.
const BUNDLED_PROGRAMMES: unknown[] = [
  quietEvenings,
];

export function listProgrammes():
  ProgrammeDefinition[] {
  const programmes =
    BUNDLED_PROGRAMMES.map(parseProgramme);

  const keys = new Set<string>();

  for (const programme of programmes) {
    const key = programmeKey(programme);

    if (keys.has(key)) {
      throw new Error(
        'Duplicate programme edition: ' + key
      );
    }

    keys.add(key);
  }

  return programmes;
}

export function getProgramme(
  id: string,
  version?: number
): ProgrammeDefinition | null {
  const matches = listProgrammes().filter(
    programme => programme.id === id
  );

  if (version !== undefined) {
    return matches.find(
      programme => programme.version === version
    ) ?? null;
  }

  return matches.sort(
    (a, b) => b.version - a.version
  )[0] ?? null;
}
