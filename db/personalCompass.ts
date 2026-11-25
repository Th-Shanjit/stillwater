import { getDb } from './schema';

import {
  buildPersonalCompass,
} from '../content/personalCompass';

import type {
  PauseObservation,
  ActionObservation,
  PracticeObservation,
} from '../content/personalCompass';

import {
  localEventDate,
} from '../content/recoveryEvents';

interface PauseRow {
  id: string;
  created_at: string;
  hour_of_day: number;
  emotion_tag: string | null;
}

export async function getPersonalCompass(
  now = new Date()
) {
  const db = await getDb();

  // Today plus the previous 29 local calendar dates.
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 29);

  const cutoff = start.toISOString();
  const end = now.toISOString();

  const [
    pauseRows,
    returns,
    actions,
    practices,
  ] = await Promise.all([
    db.getAllAsync<PauseRow>(
      `SELECT id, created_at, hour_of_day, emotion_tag
        FROM pause_events
        WHERE created_at >= ? AND created_at <= ?;`,
      [cutoff, end]
    ),

    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count
        FROM grace_resets
        WHERE created_at >= ? AND created_at <= ?;`,
      [cutoff, end]
    ),

    db.getAllAsync<ActionObservation>(
      `SELECT session_id AS sessionId,
               action_key AS action
        FROM recovery_events
        WHERE kind = 'pause_exit'
          AND flow = 'pause'
          AND created_at >= ?
          AND created_at <= ?;`,
      [cutoff, end]
    ),

    db.getAllAsync<PracticeObservation>(
      `SELECT session_id AS sessionId,
               content_id AS contentId,
               content_version AS contentVersion,
               kind
        FROM recovery_events
        WHERE kind IN (
          'practice_started',
          'practice_end_reached'
        )
        AND created_at >= ?
        AND created_at <= ?;`,
      [cutoff, end]
    ),
  ]);

  const pauses: PauseObservation[] = [];

  for (const row of pauseRows) {
    const recordedAt = new Date(row.created_at);

    if (Number.isNaN(recordedAt.getTime())) {
      continue;
    }

    pauses.push({
      id: row.id,
      date: localEventDate(recordedAt),
      hour: row.hour_of_day,
      context: row.emotion_tag,
    });
  }

  return buildPersonalCompass({
    pauses,
    returns: returns?.count ?? 0,
    actions,
    practices,
  });
}
