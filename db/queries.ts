import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { getDb } from './schema';

export type ToneTrack = 'scripture' | 'liturgical';
export type DayStatus = 'practice' | 'returned' | 'unlogged';

export function classifyRecordedDay(row?: {
  day_status?: string;
  morning_completed?: number;
  examen_completed?: number;
}) {
  const morningCompleted = Boolean(row?.morning_completed);
  const examenCompleted = Boolean(row?.examen_completed);
  const practiced = morningCompleted || examenCompleted;
  const returned = row?.day_status === 'returned';

  const status: DayStatus =
    returned ? 'returned' :
    practiced ? 'practice' : 'unlogged';

  return {
    status,
    morningCompleted,
    examenCompleted,
    practiced,
    recorded: practiced || returned,
  };
}

export interface UserPreferences {
  tone_track: ToneTrack;
  bedtime_hhmm: string;
  morning_hhmm: string;
  vulnerable_windows: string[];
  biometric_lock: boolean;
  save_laments: boolean;
  app_icon: string;
  onboarded_at: string | null;
  onboarding_completed: boolean;
  last_opened_at: string | null;
  trusted_ally_name: string | null;
  trusted_ally_phone: string | null;
}

export interface ClarityDay {
  date: string;
  status: DayStatus;
  morningCompleted: boolean;
  examenCompleted: boolean;
}

export interface WeatherMapInsights {
  hasEnoughData: boolean;
  totalEventsLast30d: number;
  peakWindowLabel: string | null;
  topEmotionTag: string | null;
}

export interface BoundaryItem {
  id: string;
  label: string;
  source: string;
  created_at: string;
  expires_at: string;
  kept: number | null;
}

export interface IfThenPlan {
  emotion_tag: string;
  off_ramp_text: string;
}

export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM user_preferences WHERE id = 1;`);
  return {
    tone_track: (row?.tone_track ?? 'scripture') as ToneTrack,
    bedtime_hhmm: row?.bedtime_hhmm ?? '22:30',
    morning_hhmm: row?.morning_hhmm ?? '07:30',
    vulnerable_windows: JSON.parse(row?.vulnerable_windows ?? '[]'),
    biometric_lock: Boolean(row?.biometric_lock),
    save_laments: Boolean(row?.save_laments),
    app_icon: row?.app_icon ?? 'linen_mark',
    onboarded_at: row?.onboarded_at ?? null,
    onboarding_completed: Boolean(row?.onboarding_completed),
    last_opened_at: row?.last_opened_at ?? null,
    trusted_ally_name: row?.trusted_ally_name ?? null,
    trusted_ally_phone: row?.trusted_ally_phone ?? null,
  };
}

export async function updatePreferences(partial: Partial<UserPreferences>): Promise<void> {
  const db = await getDb();
  const current = await getPreferences();
  const next = { ...current, ...partial };

  await db.runAsync(
    `UPDATE user_preferences
     SET tone_track = ?, bedtime_hhmm = ?, morning_hhmm = ?, vulnerable_windows = ?,
         biometric_lock = ?, save_laments = ?, app_icon = ?, onboarded_at = ?,
         onboarding_completed = ?, last_opened_at = ?, trusted_ally_name = ?, trusted_ally_phone = ?
     WHERE id = 1;`,
    [
      next.tone_track,
      next.bedtime_hhmm,
      next.morning_hhmm,
      JSON.stringify(next.vulnerable_windows),
      next.biometric_lock ? 1 : 0,
      next.save_laments ? 1 : 0,
      next.app_icon,
      next.onboarded_at,
      next.onboarding_completed ? 1 : 0,
      next.last_opened_at,
      next.trusted_ally_name,
      next.trusted_ally_phone,
    ]
  );
}

/** Returns days elapsed since last open (null on first open) and updates last_opened_at */
export async function checkAbsenceAndTouch(): Promise<number> {
  const prefs = await getPreferences();
  const now = new Date();
  let daysAway = 0;

  if (prefs.last_opened_at) {
    const prev = new Date(prefs.last_opened_at).getTime();
    if (!Number.isNaN(prev)) {
      daysAway = Math.floor((now.getTime() - prev) / (1000 * 60 * 60 * 24));
    }
  }

  await updatePreferences({ last_opened_at: now.toISOString() });
  return daysAway;
}

/** Checks if user logged a Grace Reset yesterday or earlier today (triggers Day-After-Mercy) */
export async function didResetRecently(): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yStr = getLocalDateString(yesterday);
  const tStr = getLocalDateString(now);

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM grace_resets WHERE date IN (?, ?);`,
    [yStr, tStr]
  );
  return (row?.count ?? 0) > 0;
}

/** Finds dominant root emotion over the past 7 days if logged >= 2 times */
export async function getDominantRecentEmotion(): Promise<string | null> {
  const db = await getDb();
  const cutoffIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await db.getAllAsync<{ tag: string | null }>(
    `SELECT emotion_tag as tag FROM pause_events WHERE created_at >= ? AND emotion_tag IS NOT NULL
     UNION ALL
     SELECT numbing_need_tag as tag FROM grace_resets WHERE created_at >= ? AND numbing_need_tag IS NOT NULL;`,
    [cutoffIso, cutoffIso]
  );

  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (!r.tag) continue;
    const normalized = r.tag.toLowerCase();
    counts[normalized] = (counts[normalized] ?? 0) + 1;
  }

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 2) return null;
  return top[0];
}

export async function shouldTriggerBingeBreaker(): Promise<boolean> {
  const db = await getDb();
  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM grace_resets WHERE created_at >= ?;`,
    [cutoffIso]
  );
  return (row?.count ?? 0) >= 1;
}

export async function getOffRampForEmotion(emotionTag: string): Promise<string> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ off_ramp_text: string }>(
    `SELECT off_ramp_text FROM if_then_plans WHERE emotion_tag = ?;`,
    [emotionTag]
  );
  return (
    row?.off_ramp_text ??
    'Lock the screen, drink a glass of water, and step into another room for five minutes.'
  );
}

export async function getAllIfThenPlans(): Promise<IfThenPlan[]> {
  const db = await getDb();
  return db.getAllAsync<IfThenPlan>(
    `SELECT emotion_tag, off_ramp_text FROM if_then_plans ORDER BY emotion_tag ASC;`
  );
}

export async function updateIfThenPlan(emotionTag: string, offRampText: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO if_then_plans (emotion_tag, off_ramp_text) VALUES (?, ?)
     ON CONFLICT(emotion_tag) DO UPDATE SET off_ramp_text = excluded.off_ramp_text;`,
    [emotionTag, offRampText.trim()]
  );
}

export async function getActiveBoundaries(): Promise<BoundaryItem[]> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  return db.getAllAsync<BoundaryItem>(
    `SELECT * FROM boundaries
     WHERE kept IS NULL AND expires_at >= ?
     ORDER BY created_at DESC;`,
    [nowIso]
  );
}

export async function addCustomBoundary(label: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const expiresIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  await db.runAsync(
    `INSERT INTO boundaries (id, label, source, created_at, expires_at)
     VALUES (?, ?, 'rhythm', ?, ?);`,
    [Crypto.randomUUID(), label.trim(), now.toISOString(), expiresIso]
  );
}

export async function resolveBoundary(id: string, kept: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE boundaries SET kept = ? WHERE id = ?;`, [kept ? 1 : 0, id]);
}

export async function logPauseEvent(params: {
  emotionTag?: string;
  breathCyclesCompleted: number;
  usedAudio?: boolean;
  outcome?: 'steady' | 'exited_early' | 'ready_to_step_away';
}): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db.runAsync(
    `INSERT INTO pause_events
      (id, created_at, hour_of_day, emotion_tag, breath_cycles_completed, used_audio, outcome)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      Crypto.randomUUID(),
      now.toISOString(),
      now.getHours(),
      params.emotionTag ?? null,
      params.breathCyclesCompleted,
      params.usedAudio ? 1 : 0,
      params.outcome ?? 'exited_early',
    ]
  );
}

export async function logGraceReset(params: {
  wasBingeBreaker: boolean;
  doorOpenerTag?: string;
  numbingNeedTag?: string;
  aftermathTag?: string;
  boundaryLabel?: string;
  lamentText?: string;
}): Promise<void> {
  const db = await getDb();

  const now = new Date();
  const today = getLocalDateString(now);
  const nowIso = now.toISOString();

  const write = async (conn: typeof db) => {
    let boundaryId: string | null = null;

    const label = params.boundaryLabel?.trim();

    if (label) {
      // Reuse an identical active boundary rather than
      // creating unnecessary duplicate plans.
      const existing =
        await conn.getFirstAsync<{ id: string }>(
          `SELECT id FROM boundaries
           WHERE label = ?
             AND kept IS NULL
             AND expires_at >= ?
           ORDER BY created_at DESC LIMIT 1;`,
          [label, nowIso]
        );

      if (existing) {
        boundaryId = existing.id;
      } else {
        boundaryId = Crypto.randomUUID();

        const expiresIso = new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toISOString();

        await conn.runAsync(
          `INSERT INTO boundaries
            (id, label, source, created_at, expires_at)
           VALUES (?, ?, 'grace_reset', ?, ?);`,
          [
            boundaryId,
            label,
            nowIso,
            expiresIso,
          ]
        );
      }
    }

    await conn.runAsync(
      `INSERT INTO grace_resets
        (id, date, created_at, hour_of_day,
         was_binge_breaker, door_opener_tag,
         numbing_need_tag, aftermath_tag,
         boundary_id, lament_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        Crypto.randomUUID(),
        today,
        nowIso,
        now.getHours(),
        params.wasBingeBreaker ? 1 : 0,
        params.doorOpenerTag ?? null,
        params.numbingNeedTag ?? null,
        params.aftermathTag ?? null,
        boundaryId,
        null,
      ]
    );

    await conn.runAsync(
      `INSERT INTO daily_logs
        (date, day_status, updated_at)
       VALUES (?, 'returned', ?)
       ON CONFLICT(date) DO UPDATE SET
         day_status = 'returned',
         updated_at = excluded.updated_at;`,
      [today, nowIso]
    );
  };

  if (Platform.OS === 'web') {
    // Exclusive transactions are unavailable on web.
    await db.withTransactionAsync(async () => {
      await write(db);
    });
  } else {
    await db.withExclusiveTransactionAsync(async txn => {
      await write(txn);
    });
  }
}

export async function completeMorningAnchor(anchorId: string, boundaryLabel?: string): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const today = getLocalDateString(now);
  const nowIso = now.toISOString();

  await db.runAsync(
    `INSERT INTO daily_logs (date, morning_completed, morning_anchor_id, day_status, updated_at)
     VALUES (?, 1, ?, 'clarity', ?)
     ON CONFLICT(date) DO UPDATE SET
       morning_completed = 1,
       morning_anchor_id = excluded.morning_anchor_id,
       day_status = CASE WHEN day_status = 'returned' THEN 'returned' ELSE 'clarity' END,
       updated_at = excluded.updated_at;`,
    [today, anchorId, nowIso]
  );

  if (boundaryLabel?.trim()) {
    const expiresIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    await db.runAsync(
      `INSERT INTO boundaries (id, label, source, created_at, expires_at)
       VALUES (?, ?, 'morning', ?, ?);`,
      [Crypto.randomUUID(), boundaryLabel.trim(), nowIso, expiresIso]
    );
  }
}

/**
 * Record an explicitly finished evening practice.
 * Optional selections do not erase earlier entries
 * when the user chooses to skip reflection.
 */
export async function recordEveningWindDown(
  date: string,
  drainedTags?: string[]
): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();

  const tags =
    drainedTags === undefined
      ? undefined
      : [...new Set(drainedTags)];

  await db.runAsync(
    `INSERT INTO daily_logs
      (date, examen_completed, examen_drained_tags,
       day_status, updated_at)
     VALUES (?, 1, ?, 'clarity', ?)
     ON CONFLICT(date) DO UPDATE SET
       examen_completed = 1,
       examen_drained_tags = CASE
         WHEN ? = 1
         THEN excluded.examen_drained_tags
         ELSE daily_logs.examen_drained_tags
       END,
       day_status = CASE
         WHEN daily_logs.day_status = 'returned'
         THEN 'returned'
         ELSE 'clarity'
       END,
       updated_at = excluded.updated_at;`,
    [
      date,
      JSON.stringify(tags ?? []),
      nowIso,
      tags === undefined ? 0 : 1,
    ]
  );
}

export async function completeEveningExamen(gratitude: string, drainedTags: string[]): Promise<void> {
  const db = await getDb();
  const now = new Date();
  const today = getLocalDateString(now);
  const nowIso = now.toISOString();

  await db.runAsync(
    `INSERT INTO daily_logs (date, examen_completed, examen_gratitude, examen_drained_tags, day_status, updated_at)
     VALUES (?, 1, ?, ?, 'clarity', ?)
     ON CONFLICT(date) DO UPDATE SET
       examen_completed = 1,
       examen_gratitude = excluded.examen_gratitude,
       examen_drained_tags = excluded.examen_drained_tags,
       day_status = CASE WHEN day_status = 'returned' THEN 'returned' ELSE 'clarity' END,
       updated_at = excluded.updated_at;`,
    [today, gratitude.trim(), JSON.stringify(drainedTags), nowIso]
  );
}

export async function getClarityGrid(days: number = 30): Promise<{
  grid: ClarityDay[];
  practiceCount: number;
  activeDays: number;
}> {
  const db = await getDb();

  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(getLocalDateString(d));
  }

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM daily_logs WHERE date >= ?;`,
    [dates[0]]
  );
  const logMap = new Map(rows.map((r) => [r.date, r]));

  let practiceCount = 0;
  let activeDays = 0;

  const grid: ClarityDay[] = dates.map((date) => {
    const row = logMap.get(date);
    const day = classifyRecordedDay(row);

    if (day.practiced) practiceCount += 1;
    if (day.recorded) activeDays += 1;

    return {
      date,
      status: day.status,
      morningCompleted: day.morningCompleted,
      examenCompleted: day.examenCompleted,
    };
  });

  return { grid, practiceCount, activeDays };
}

export async function getWeatherMapInsights(): Promise<WeatherMapInsights> {
  const db = await getDb();
  const cutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const events = await db.getAllAsync<{ hour_of_day: number; tag: string | null }>(
    `SELECT hour_of_day, emotion_tag as tag FROM pause_events WHERE created_at >= ?
     UNION ALL
     SELECT hour_of_day, numbing_need_tag as tag FROM grace_resets WHERE created_at >= ?;`,
    [cutoffIso, cutoffIso]
  );

  if (events.length < 3) {
    return {
      hasEnoughData: false,
      totalEventsLast30d: events.length,
      peakWindowLabel: null,
      topEmotionTag: null,
    };
  }

  const bucketLabels = [
    '12 AM – 3 AM', '3 AM – 6 AM', '6 AM – 9 AM', '9 AM – 12 PM',
    '12 PM – 3 PM', '3 PM – 6 PM', '6 PM – 9 PM', '9 PM – 12 AM',
  ];
  const bucketCounts = new Array(8).fill(0);
  const tagCounts: Record<string, number> = {};

  for (const e of events) {
    const bucketIdx = Math.floor(e.hour_of_day / 3) % 8;
    bucketCounts[bucketIdx] += 1;
    if (e.tag) tagCounts[e.tag] = (tagCounts[e.tag] ?? 0) + 1;
  }

  const peakIdx = bucketCounts.indexOf(Math.max(...bucketCounts));
  const topEmotionTag =
    Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    hasEnoughData: true,
    totalEventsLast30d: events.length,
    peakWindowLabel: bucketLabels[peakIdx],
    topEmotionTag,
  };
}
