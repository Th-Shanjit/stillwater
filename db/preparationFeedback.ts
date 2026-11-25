import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getDb } from './schema';

import {
  getAvoidedSuggestions,
  validFeedback,
} from '../content/preparationFeedback';

import type {
  PlanFeedback,
  FeedbackObservation,
} from '../content/preparationFeedback';

import type {
  PreparationSuggestion,
} from '../content/dailyPreparation';

export interface PendingPlanFeedback {
  boundaryId: string;
  label: string;
  suggestionId: string;
  suggestionVersion: number;
}

export async function acceptPreparationSuggestion(
  suggestion: PreparationSuggestion
): Promise<boolean> {
  const db = await getDb();

  const now = new Date();
  const acceptedAt = now.toISOString();

  const expiresAt = new Date(
    now.getTime() + 24 * 60 * 60 * 1000
  ).toISOString();

  const boundaryId = Crypto.randomUUID();

  let accepted = false;

  const write = async (conn: typeof db) => {
    const existing = await conn.getFirstAsync<{
      id: string;
    }>(
      'SELECT id FROM boundaries WHERE kept IS NULL AND expires_at >= ? LIMIT 1;',
      [acceptedAt]
    );

    if (existing) return;

    await conn.runAsync(
      'INSERT INTO boundaries (id, label, source, created_at, expires_at) VALUES (?, ?, ?, ?, ?);',
      [
        boundaryId,
        suggestion.plan.trim(),
        'rhythm',
        acceptedAt,
        expiresAt,
      ]
    );

    await conn.runAsync(
      'INSERT INTO preparation_feedback (boundary_id, suggestion_id, suggestion_version, source, accepted_at) VALUES (?, ?, ?, ?, ?);',
      [
        boundaryId,
        suggestion.id,
        suggestion.version,
        suggestion.source,
        acceptedAt,
      ]
    );

    accepted = true;
  };

  if (Platform.OS === 'web') {
    await db.withTransactionAsync(async () => {
      await write(db);
    });
  } else {
    await db.withExclusiveTransactionAsync(
      async txn => {
        await write(txn);
      }
    );
  }

  return accepted;
}

export async function getPendingPlanFeedback():
  Promise<PendingPlanFeedback | null> {
  const db = await getDb();
  const now = new Date();

  const cutoff = new Date(
    now.getTime() - 30 * 86400000
  ).toISOString();

  return db.getFirstAsync<PendingPlanFeedback>(
    `SELECT
       f.boundary_id AS boundaryId,
       b.label AS label,
       f.suggestion_id AS suggestionId,
       f.suggestion_version AS suggestionVersion
     FROM preparation_feedback f
     INNER JOIN boundaries b
       ON b.id = f.boundary_id
     WHERE f.feedback IS NULL
       AND f.accepted_at >= ?
       AND (
         b.kept IS NOT NULL
         OR b.expires_at <= ?
       )
     ORDER BY f.accepted_at DESC
     LIMIT 1;`,
    [cutoff, now.toISOString()]
  );
}

export async function recordPlanFeedback(
  boundaryId: string,
  feedback: PlanFeedback
): Promise<void> {
  if (!validFeedback(feedback)) {
    throw new Error('Invalid feedback.');
  }

  const db = await getDb();
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE preparation_feedback
     SET feedback = ?, responded_at = ?
     WHERE boundary_id = ?
       AND feedback IS NULL
       AND EXISTS (
         SELECT 1 FROM boundaries b
         WHERE b.id = preparation_feedback.boundary_id
           AND (
             b.kept IS NOT NULL
             OR b.expires_at <= ?
           )
       );`,
    [feedback, now, boundaryId, now]
  );
}

export async function getPreparationAvoidList():
  Promise<string[]> {
  const db = await getDb();

  const cutoff = new Date(
    Date.now() - 30 * 86400000
  ).toISOString();

  const rows = await db.getAllAsync<FeedbackObservation>(
    `SELECT
       suggestion_id AS suggestionId,
       suggestion_version AS suggestionVersion,
       feedback
     FROM preparation_feedback
     WHERE responded_at >= ?
       AND feedback IN ('helpful', 'not_helpful');`,
    [cutoff]
  );

  return getAvoidedSuggestions(rows);
}
