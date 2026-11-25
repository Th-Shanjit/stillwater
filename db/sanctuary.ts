
import { getDb } from './schema';
import { getLocalDateString } from './queries';

import {
  REFRESH_SANCTUARY_SQL,
  normalizeStage,
} from '../content/sanctuaryGrowth';

import type {
  SanctuaryStage,
} from '../content/sanctuaryGrowth';

import {
  normalizeAppearance,
} from '../content/sanctuaryAppearance';

import type {
  SanctuaryAppearance,
} from '../content/sanctuaryAppearance';

export interface SanctuarySnapshot {
  stage: SanctuaryStage;
  appearance: SanctuaryAppearance;
}

export async function refreshSanctuarySnapshot():
  Promise<SanctuarySnapshot> {
  const db = await getDb();

  await db.runAsync(
    REFRESH_SANCTUARY_SQL,
    [getLocalDateString()]
  );

  const row = await db.getFirstAsync<{
    stage: number;
    appearance: string;
  }>(
    'SELECT stage, appearance FROM sanctuary_state WHERE id = 1;'
  );

  if (!row) {
    throw new Error('Sanctuary state unavailable.');
  }

  return {
    stage: normalizeStage(row.stage),
    appearance: normalizeAppearance(row.appearance),
  };
}

// Preserve the existing stage-only interface.
export async function refreshSanctuary():
  Promise<SanctuaryStage> {
  const snapshot = await refreshSanctuarySnapshot();
  return snapshot.stage;
}

export async function saveSanctuaryAppearance(
  appearance: SanctuaryAppearance
): Promise<void> {
  if (appearance !== 'day' && appearance !== 'night') {
    throw new Error('Invalid sanctuary appearance.');
  }

  const db = await getDb();

  const result = await db.runAsync(
    'UPDATE sanctuary_state SET appearance = ? WHERE id = 1;',
    [appearance]
  );

  if (result.changes !== 1) {
    throw new Error('Sanctuary preference was not saved.');
  }
}
