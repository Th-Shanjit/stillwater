import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('stillwater_local.db');
  }
  return dbInstance;
}

const DEFAULT_OFF_RAMPS: Record<string, string> = {
  exhausted: 'Set your phone across the room, drink a glass of water, and turn out the lamp.',
  lonely: 'Send one ordinary text to a friend—not to confess, just to stay connected to real life.',
  stressed: 'Step away from the screen for five minutes and rinse your face with cold water.',
  bored: 'Change rooms immediately and move your body for three minutes—stretch, walk, or make tea.',
  numb: 'Open a window, take ten slow breaths of outside air, and put on a familiar album.',
  rejected: 'Write one honest line about what stung today instead of asking a screen to erase it.',
  autopilot: 'Lock the screen right now and set the phone face-down in another room for 15 minutes.',
};

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tone_track TEXT NOT NULL DEFAULT 'scripture',
      bedtime_hhmm TEXT NOT NULL DEFAULT '22:30',
      morning_hhmm TEXT NOT NULL DEFAULT '07:30',
      vulnerable_windows TEXT NOT NULL DEFAULT '[]',
      biometric_lock INTEGER NOT NULL DEFAULT 0,
      save_laments INTEGER NOT NULL DEFAULT 0,
      app_icon TEXT NOT NULL DEFAULT 'linen_mark',
      onboarded_at TEXT,
      onboarding_completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS daily_logs (
      date TEXT PRIMARY KEY,
      morning_completed INTEGER NOT NULL DEFAULT 0,
      morning_anchor_id TEXT,
      examen_completed INTEGER NOT NULL DEFAULT 0,
      examen_gratitude TEXT,
      examen_drained_tags TEXT NOT NULL DEFAULT '[]',
      day_status TEXT NOT NULL DEFAULT 'unlogged',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pause_events (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      hour_of_day INTEGER NOT NULL,
      emotion_tag TEXT,
      breath_cycles_completed INTEGER NOT NULL DEFAULT 0,
      used_audio INTEGER NOT NULL DEFAULT 0,
      outcome TEXT NOT NULL DEFAULT 'steady'
    );

    CREATE TABLE IF NOT EXISTS grace_resets (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      hour_of_day INTEGER NOT NULL,
      was_binge_breaker INTEGER NOT NULL DEFAULT 0,
      door_opener_tag TEXT,
      numbing_need_tag TEXT,
      aftermath_tag TEXT,
      boundary_id TEXT,
      lament_text TEXT
    );

    CREATE TABLE IF NOT EXISTS boundaries (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      kept INTEGER
    );

    CREATE TABLE IF NOT EXISTS if_then_plans (
      emotion_tag TEXT PRIMARY KEY,
      off_ramp_text TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_grace_resets_created ON grace_resets(created_at);
    CREATE INDEX IF NOT EXISTS idx_grace_resets_date ON grace_resets(date);
    CREATE INDEX IF NOT EXISTS idx_pause_events_created ON pause_events(created_at);
  `);

  // Safe migration for existing dev databases
  try {
    await db.execAsync(
      `ALTER TABLE user_preferences ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0;`
    );
  } catch {
    // Column already exists
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO user_preferences (id, onboarded_at, onboarding_completed) VALUES (1, ?, 0);`,
    [new Date().toISOString()]
  );

  for (const [tag, text] of Object.entries(DEFAULT_OFF_RAMPS)) {
    await db.runAsync(
      `INSERT OR IGNORE INTO if_then_plans (emotion_tag, off_ramp_text) VALUES (?, ?);`,
      [tag, text]
    );
  }
}