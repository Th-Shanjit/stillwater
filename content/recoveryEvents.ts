export const EVENT_SCHEMA_VERSION = 1;

export type RecoveryFlow =
  | 'pause'
  | 'return'
  | 'evening'
  | 'journey';

export type RecoveryEventKind =
  | 'pause_exit'
  | 'return_saved'
  | 'evening_saved'
  | 'practice_started'
  | 'practice_end_reached'
  | 'practice_exit';

export type RecoveryAction =
  | 'move'
  | 'phone'
  | 'water'
  | 'personal_plan'
  | 'trusted_contact'
  | 'phone_outside'
  | 'social_break'
  | 'screen_break'
  | 'connection'
  | 'custom'
  | 'none';

export type RecoveryResult =
  | 'steady'
  | 'ready_to_step_away'
  | 'exited_early'
  | 'saved'
  | 'manual'
  | 'timed'
  | 'reached_end'
  | 'left_before_end';

export interface RecoveryEvent {
  sessionId: string;
  parentSessionId?: string;
  flow: RecoveryFlow;
  kind: RecoveryEventKind;
  contentId?: string;
  contentVersion?: number;
  action?: RecoveryAction;
  result: RecoveryResult;
  localDate?: string;
}

export const RECOVERY_EVENT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS recovery_events (
    event_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_session_id TEXT,
    schema_version INTEGER NOT NULL,
    flow TEXT NOT NULL,
    kind TEXT NOT NULL,
    content_id TEXT,
    content_version INTEGER,
    action_key TEXT,
    result TEXT NOT NULL,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_recovery_events_date
    ON recovery_events(local_date);

  CREATE INDEX IF NOT EXISTS idx_recovery_events_session
    ON recovery_events(session_id);

  CREATE INDEX IF NOT EXISTS idx_recovery_events_kind
    ON recovery_events(kind, created_at);
`;

export const RECOVERY_EVENT_INSERT = `
  INSERT INTO recovery_events (
    event_id, session_id, parent_session_id,
    schema_version, flow, kind,
    content_id, content_version, action_key,
    result, local_date, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(event_id) DO NOTHING;
`;

const resultsByKind: Record<
  RecoveryEventKind, RecoveryResult[]
> = {
  pause_exit: [
    'steady', 'ready_to_step_away', 'exited_early'
  ],
  return_saved: ['saved'],
  evening_saved: ['saved'],
  practice_started: ['manual', 'timed'],
  practice_end_reached: ['reached_end'],
  practice_exit: ['reached_end', 'left_before_end'],
};

const actions: RecoveryAction[] = [
  'move', 'phone', 'water', 'personal_plan',
  'trusted_contact', 'phone_outside', 'social_break',
  'screen_break', 'connection', 'custom', 'none'
];

export function validateRecoveryEvent(
  event: RecoveryEvent
): void {
  const identifier = /^[a-zA-Z0-9:_-]{1,100}$/;

  if (!identifier.test(event.sessionId)) {
    throw new Error('Invalid recovery session ID.');
  }

  if (event.parentSessionId !== undefined &&
      !identifier.test(event.parentSessionId)) {
    throw new Error('Invalid parent session ID.');
  }

  if (![
    'pause', 'return', 'evening', 'journey'
  ].includes(event.flow)) {
    throw new Error('Invalid recovery flow.');
  }

  const allowedResults = resultsByKind[event.kind];

  if (!Array.isArray(allowedResults) ||
      !allowedResults.includes(event.result)) {
    throw new Error('Invalid event result.');
  }

  if (event.kind === 'pause_exit' &&
      event.flow !== 'pause') {
    throw new Error('Invalid pause flow.');
  }

  if (event.kind === 'return_saved' &&
      event.flow !== 'return') {
    throw new Error('Invalid return flow.');
  }

  if (event.kind === 'evening_saved' &&
      event.flow !== 'evening') {
    throw new Error('Invalid evening flow.');
  }

  if (event.kind.startsWith('practice_') &&
      (!event.contentId ||
       event.contentVersion === undefined)) {
    throw new Error('Practice requires versioned content.');
  }

  if (event.contentId !== undefined &&
      !identifier.test(event.contentId)) {
    throw new Error('Invalid content ID.');
  }

  if (event.contentVersion !== undefined &&
      (!Number.isInteger(event.contentVersion) ||
       event.contentVersion < 1)) {
    throw new Error('Invalid content version.');
  }

  if (event.action !== undefined &&
      !actions.includes(event.action)) {
    throw new Error('Invalid action key.');
  }

  if (event.localDate !== undefined &&
      !/^\d{4}-\d{2}-\d{2}$/.test(event.localDate)) {
    throw new Error('Invalid local date.');
  }
}

export function recoveryEventId(
  event: RecoveryEvent
): string {
  validateRecoveryEvent(event);

  // One occurrence of each event kind per session.
  return event.sessionId + ':' + event.kind;
}

export function localEventDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function recoveryEventValues(
  event: RecoveryEvent,
  now = new Date()
) {
  return [
    recoveryEventId(event),
    event.sessionId,
    event.parentSessionId ?? null,
    EVENT_SCHEMA_VERSION,
    event.flow,
    event.kind,
    event.contentId ?? null,
    event.contentVersion ?? null,
    event.action ?? null,
    event.result,
    event.localDate ?? localEventDate(now),
    now.toISOString(),
  ];
}
