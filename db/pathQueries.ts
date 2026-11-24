import { getDb } from './schema';

export async function getCompletedPathDays(): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day_number: number }>(
    `SELECT day_number FROM path_completions ORDER BY day_number ASC;`
  );
  return rows.map((r) => r.day_number);
}

export async function togglePathDayComplete(dayNumber: number): Promise<boolean> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ day_number: number }>(
    `SELECT day_number FROM path_completions WHERE day_number = ?;`,
    [dayNumber]
  );

  if (existing) {
    await db.runAsync(`DELETE FROM path_completions WHERE day_number = ?;`, [dayNumber]);
    return false;
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO path_completions (day_number, completed_at) VALUES (?, ?);`,
    [dayNumber, new Date().toISOString()]
  );
  return true;
}