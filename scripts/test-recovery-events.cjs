const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync(
  'content/recoveryEvents.ts', 'utf8'
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const engine = {};
new Function('exports', compiled)(engine);

const pause = {
  sessionId: 'session-1',
  flow: 'pause',
  kind: 'pause_exit',
  action: 'phone',
  result: 'ready_to_step_away',
  contentId: 'immediate_support',
  contentVersion: 1,
};

engine.validateRecoveryEvent(pause);

assert.equal(
  engine.recoveryEventId(pause),
  'session-1:pause_exit'
);

console.log('PASS: valid pause event');

assert.throws(() =>
  engine.validateRecoveryEvent({
    ...pause,
    result: 'cured',
  })
);

assert.throws(() =>
  engine.validateRecoveryEvent({
    ...pause,
    action: 'My private journal entry',
  })
);

assert.throws(() =>
  engine.validateRecoveryEvent({
    ...pause,
    flow: 'evening',
  })
);

console.log('PASS: invalid values rejected');

const practice = {
  sessionId: 'practice-1',
  parentSessionId: 'session-1',
  flow: 'pause',
  kind: 'practice_started',
  contentId: 'urge_1am',
  contentVersion: 1,
  result: 'manual',
};

engine.validateRecoveryEvent(practice);

assert.throws(() =>
  engine.validateRecoveryEvent({
    ...practice,
    contentVersion: undefined,
  })
);

assert.throws(() =>
  engine.validateRecoveryEvent({
    ...practice,
    contentVersion: 0,
  })
);

console.log('PASS: practice version validation');

assert.notEqual(
  engine.recoveryEventId(practice),
  engine.recoveryEventId({
    ...practice,
    kind: 'practice_end_reached',
    result: 'reached_end',
  })
);

console.log('PASS: distinct event identities');

const values = engine.recoveryEventValues({
  ...pause,
  privateText: 'Do not persist this.',
  phoneNumber: '9999999999',
});

assert.equal(values.length, 12);
assert.ok(!values.includes('Do not persist this.'));
assert.ok(!values.includes('9999999999'));

console.log('PASS: fixed storage allowlist');

assert.equal(
  engine.localEventDate(
    new Date(2026, 10, 25, 23, 59)
  ),
  '2026-11-25'
);

console.log('PASS: local date handling');

// Optional real SQLite test on Node versions
// that include the built-in SQLite module.

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log(
    'SKIP: Node SQLite unavailable; native SQL test pending'
  );
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(engine.RECOVERY_EVENT_SCHEMA);
  db.exec(engine.RECOVERY_EVENT_SCHEMA);

  const insert =
    db.prepare(engine.RECOVERY_EVENT_INSERT);

  insert.run(...engine.recoveryEventValues(pause));
  insert.run(...engine.recoveryEventValues(pause));
  insert.run(...engine.recoveryEventValues(practice));

  const row = db.prepare(
    'SELECT COUNT(*) AS count FROM recovery_events'
  ).get();

  assert.equal(Number(row.count), 2);

  const stored = db.prepare(
    'SELECT * FROM recovery_events WHERE session_id = ?'
  ).get('practice-1');

  assert.equal(stored.parent_session_id, 'session-1');
  assert.equal(stored.content_version, 1);

  db.close();

  console.log('PASS: repeatable SQLite schema');
  console.log('PASS: duplicate event suppression');
  console.log('PASS: linked practice persistence');
}

console.log('RECOVERY EVENT TESTS PASSED');
