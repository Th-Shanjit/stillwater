const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function load(file) {
  const compiled = ts.transpileModule(
    fs.readFileSync(file, 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }
  ).outputText;

  const exports = {};
  new Function('exports', compiled)(exports);
  return exports;
}

const engine = load(
  'content/programmeParticipation.ts'
);

const enrollment = load(
  'content/programmeEnrollment.ts'
);

const day = {
  id: 'quiet_day',
  steps: [
    { id: 'guidance', optional: false },
    { id: 'action', optional: false },
    { id: 'prayer', optional: true },
  ],
};

const valid = {
  cursor: 2,
  dispositions: ['continued', 'continued', null],
};

assert.deepEqual(
  engine.validateSavedSession(day, valid),
  valid
);

console.log('PASS: saved session restored');

assert.equal(
  engine.validateSavedSession(day, {
    ...valid,
    cursor: 4,
  }),
  null
);

assert.equal(
  engine.validateSavedSession(day, {
    ...valid,
    dispositions: ['continued', null, null],
  }),
  null
);

assert.equal(
  engine.validateSavedSession(day, {
    ...valid,
    dispositions: ['skipped', 'continued', null],
  }),
  null
);

assert.equal(
  engine.validateSavedSession(day, {
    ...valid,
    dispositions: ['unknown', 'continued', null],
  }),
  null
);

console.log('PASS: invalid saved sessions rejected');

const complete = {
  cursor: 3,
  dispositions: ['continued', 'continued', 'skipped'],
};

assert.deepEqual(
  engine.validateSavedSession(day, complete),
  complete
);

console.log('PASS: optional skip survives restoration');

const record = {
  enrollmentId: 'enroll-one',
  dayId: day.id,
  cursor: 2,
  dispositionsJson: JSON.stringify(valid.dispositions),
  updatedAt: '2026-11-25T12:00:00Z',
  completedAt: null,
};

assert.deepEqual(
  engine.restoreSavedSession(day, record),
  valid
);

assert.equal(
  engine.restoreSavedSession(day, {
    ...record,
    dispositionsJson: '{invalid',
  }),
  null
);

assert.equal(
  engine.restoreSavedSession(day, {
    ...record,
    dayId: 'different-day',
  }),
  null
);

console.log('PASS: corrupt and mismatched records rejected');

assert.equal(
  engine.participationStatus(undefined),
  'not_started'
);

assert.equal(
  engine.participationStatus(record),
  'in_progress'
);

assert.equal(
  engine.participationStatus({
    ...record,
    completedAt: record.updatedAt,
  }),
  'finished'
);

console.log('PASS: participation status');

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log('SKIP: Node SQLite unavailable');
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(enrollment.ENROLLMENT_SCHEMA);
  db.exec(engine.PARTICIPATION_SCHEMA);
  db.exec(engine.PARTICIPATION_SCHEMA);

  db.prepare(
    'INSERT INTO programme_enrollments VALUES (?, ?, ?, ?)'
  ).run(
    record.enrollmentId,
    'quiet',
    1,
    record.updatedAt
  );

  const save = db.prepare(
    engine.SAVE_PROGRAMME_PROGRESS_SQL
  );

  const read = () => db.prepare(
    'SELECT * FROM programme_participation WHERE enrollment_id = ? AND day_id = ?'
  ).get(record.enrollmentId, day.id);

  const persist = session => save.run(
    record.enrollmentId,
    day.id,
    session.cursor,
    JSON.stringify(session.dispositions),
    record.updatedAt,
    record.enrollmentId
  );

  persist(valid);

  assert.equal(read().cursor, 2);
  assert.equal(read().completed_at, null);

  persist(complete);

  assert.equal(read().cursor, 3);
  assert.equal(read().completed_at, null);

  console.log('PASS: progress persists without implicit completion');

  const finish = db.prepare(
    engine.FINISH_PROGRAMME_SESSION_SQL
  );

  const now = '2026-11-25T12:10:00Z';
  const json = JSON.stringify(complete.dispositions);

  assert.equal(Number(finish.run(
    now,
    now,
    record.enrollmentId,
    day.id,
    3,
    json
  ).changes), 1);

  assert.equal(read().completed_at, now);

  assert.equal(Number(finish.run(
    now,
    now,
    record.enrollmentId,
    day.id,
    3,
    json
  ).changes), 0);

  console.log('PASS: explicit and idempotent completion');

  assert.equal(Number(persist(valid).changes), 0);
  assert.equal(read().cursor, 3);
  assert.equal(read().completed_at, now);

  console.log('PASS: finished session cannot be overwritten');

  db.prepare(
    'DELETE FROM programme_enrollments WHERE id = ?'
  ).run(record.enrollmentId);

  assert.equal(read(), undefined);

  console.log('PASS: withdrawal removes associated progress');

  assert.equal(Number(persist(valid).changes), 0);
  assert.equal(read(), undefined);

  console.log('PASS: deleted enrolment cannot recreate progress');

  db.close();
}

console.log('PROGRAMME PARTICIPATION TESTS PASSED');
