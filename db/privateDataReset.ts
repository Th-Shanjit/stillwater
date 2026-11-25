import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  getDb,
  DEFAULT_OFF_RAMPS,
} from './schema';

import {
  PRIVATE_RESET_KEY,
  PRIVATE_RESET_SQL,
} from '../content/privateDataReset';

export const privateResetSupported =
  Platform.OS === 'android' ||
  Platform.OS === 'ios';

async function ensureFlags() {
  const db = await getDb();

  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS app_flags (key TEXT PRIMARY KEY, value TEXT NOT NULL);'
  );

  return db;
}

export async function queuePrivateDataReset():
  Promise<void> {
  if (!privateResetSupported) {
    throw new Error(
      'Private data reset requires the mobile application.'
    );
  }

  const db = await ensureFlags();

  await db.runAsync(
    'INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);',
    [PRIVATE_RESET_KEY, '1']
  );
}

export async function applyPendingPrivateReset():
  Promise<void> {
  if (!privateResetSupported) return;

  const db = await ensureFlags();

  const pending = await db.getFirstAsync<{
    value: string;
  }>(
    'SELECT value FROM app_flags WHERE key = ?;',
    [PRIVATE_RESET_KEY]
  );

  if (pending?.value !== '1') return;

  // Only this application's notifications.
  // Do not silently continue if cleanup fails.
  await Notifications
    .cancelAllScheduledNotificationsAsync();

  await Notifications
    .dismissAllNotificationsAsync();

  // Run before mounting personal screens.
  await db.withExclusiveTransactionAsync(
    async txn => {
      await txn.execAsync(
        'PRAGMA secure_delete = ON;'
      );

      await txn.execAsync(
        PRIVATE_RESET_SQL
      );

      for (const [tag, text] of
        Object.entries(DEFAULT_OFF_RAMPS)) {

        await txn.runAsync(
          'INSERT INTO if_then_plans (emotion_tag, off_ramp_text) VALUES (?, ?);',
          [tag, text]
        );
      }

      // Remove only the pending reset marker.
      // Preserve scholarships and purchased access.
      await txn.runAsync(
        'DELETE FROM app_flags WHERE key = ?;',
        [PRIVATE_RESET_KEY]
      );
    }
  );

  // Best-effort cleanup of the write-ahead log.
  // This is not a guarantee of forensic erasure.
  await db.execAsync(
    'PRAGMA wal_checkpoint(TRUNCATE);'
  ).catch(() => {});
}
