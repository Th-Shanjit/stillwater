export const PRIVATE_RESET_KEY =
  'pending_private_data_reset_v1';

export const PRIVATE_DATA_TABLES = [
  'programme_participation',
  'programme_enrollments',
  'preparation_feedback',
  'preparation_windows',
  'recovery_events',
  'grace_resets',
  'pause_events',
  'daily_logs',
  'boundaries',
  'path_completions',
  'if_then_plans',
] as const;

export const PRIVATE_RESET_SQL = [
  ...PRIVATE_DATA_TABLES.map(
    table => 'DELETE FROM ' + table + ';'
  ),

  "UPDATE sanctuary_state SET stage = 0, appearance = 'day' WHERE id = 1;",

  "UPDATE user_preferences SET vulnerable_windows = '[]', trusted_ally_name = NULL, trusted_ally_phone = NULL, save_laments = 0, bedtime_hhmm = '22:30', morning_hhmm = '07:30', last_opened_at = NULL WHERE id = 1;",
].join('\n');

export function confirmsPrivateReset(
  value: string
): boolean {
  return value.trim() === 'DELETE';
}
