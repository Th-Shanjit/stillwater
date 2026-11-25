import * as Crypto from 'expo-crypto';

import { getDb } from './schema';

import {
  recoveryEventValues,
  RECOVERY_EVENT_INSERT,
  type RecoveryEvent,
} from '../content/recoveryEvents';

export function newRecoverySessionId(): string {
  return Crypto.randomUUID();
}

/**
 * Supplementary local events must not prevent a user
 * from leaving a support experience.
 */
export async function recordRecoveryEvent(
  event: RecoveryEvent
): Promise<boolean> {
  try {
    const values = recoveryEventValues(event);
    const db = await getDb();

    await db.runAsync(
      RECOVERY_EVENT_INSERT,
      values
    );

    return true;
  } catch {
    if (__DEV__) {
      console.warn('Recovery event could not be saved.');
    }

    return false;
  }
}
