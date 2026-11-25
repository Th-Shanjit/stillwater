import { cancelPreparationReminder } from './preparationReminders';
import * as Crypto from 'expo-crypto';
import { getDb } from './schema';
import { validWindow } from '../content/preparationWindows';

import type {
  PreparationWindow,
} from '../content/preparationWindows';

interface WindowRow {
  id: string;
  start_hhmm: string;
  end_hhmm: string;
  enabled: number;
}

export async function getPreparationWindows():
  Promise<PreparationWindow[]> {
  const db = await getDb();

  const rows = await db.getAllAsync<WindowRow>(
    'SELECT * FROM preparation_windows ORDER BY start_hhmm, end_hhmm;'
  );

  return rows.map(row => ({
    id: row.id,
    start: row.start_hhmm,
    end: row.end_hhmm,
    enabled: Boolean(row.enabled),
  }));
}

export async function savePreparationWindow(
  start: string,
  end: string,
  existingId?: string
): Promise<void> {
  if (!validWindow(start, end)) {
    throw new Error('Invalid preparation window.');
  }

  const db = await getDb();

  if (existingId) {
    // Editing requires explicit reminder re-enablement.
    await cancelPreparationReminder(existingId);
    await db.runAsync(
      'UPDATE preparation_windows SET start_hhmm = ?, end_hhmm = ? WHERE id = ?;',
      [start, end, existingId]
    );
  } else {
    await db.runAsync(
      'INSERT INTO preparation_windows (id, start_hhmm, end_hhmm, enabled) VALUES (?, ?, ?, 1);',
      [Crypto.randomUUID(), start, end]
    );
  }
}

export async function setPreparationWindowEnabled(
  id: string,
  enabled: boolean
): Promise<void> {
  const db = await getDb();

  if (!enabled) {
    await cancelPreparationReminder(id);
  }

  await db.runAsync(
    'UPDATE preparation_windows SET enabled = ? WHERE id = ?;',
    [enabled ? 1 : 0, id]
  );
}

export async function removePreparationWindow(
  id: string
): Promise<void> {
  const db = await getDb();

  await cancelPreparationReminder(id);

  await db.runAsync(
    'DELETE FROM preparation_windows WHERE id = ?;',
    [id]
  );
}
