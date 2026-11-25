export type SanctuaryAppearance = 'day' | 'night';

export const ADD_SANCTUARY_APPEARANCE_SQL =
  "ALTER TABLE sanctuary_state ADD COLUMN appearance TEXT NOT NULL DEFAULT 'day' CHECK(appearance IN ('day', 'night'));";

export function normalizeAppearance(
  value: unknown
): SanctuaryAppearance {
  return value === 'night' ? 'night' : 'day';
}
