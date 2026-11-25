const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/programmeEnrollment.ts',
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const engine = {};
new Function('exports', compiled)(engine);

const v1 = {
  id: 'quiet',
  version: 1,
  access: 'free',
  schedule: 'self_paced',
};

const v2 = { ...v1, version: 2 };

const joined = {
  id: 'enrollment-1',
  programmeId: 'quiet',
  programmeVersion: 1,
  joinedAt: '2026-11-25T12:00:00Z',
};

assert.equal(
  engine.programmeAccessDecision(v1, false),
  'allowed'
);

console.log('PASS: free programme access');

const plus = { ...v1, access: 'plus' };

assert.equal(
  engine.programmeAccessDecision(plus, false),
  'plus_required'
);

assert.equal(
  engine.programmeAccessDecision(plus, true),
  'allowed'
);

console.log('PASS: Plus access enforcement');

assert.equal(
  engine.programmeAccessDecision({
    ...v1,
    schedule: 'daily',
  }, true),
  'schedule_unavailable'
);

console.log('PASS: unsupported schedule rejected');

assert.deepEqual(
  engine.selectCatalogueEditions([v1, v2], []),
  [v2]
);

console.log('PASS: latest available edition selected');

assert.deepEqual(
  engine.selectCatalogueEditions(
    [v1, v2],
    [joined]
  ),
  [v1]
);

console.log('PASS: joined edition remains pinned');

assert.deepEqual(
  engine.selectCatalogueEditions(
    [v2],
    [joined]
  ),
  []
);

console.log('PASS: unavailable edition not silently replaced');

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log('SKIP: Node SQLite unavailable');
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(engine.ENROLLMENT_SCHEMA);
  db.exec(engine.ENROLLMENT_SCHEMA);

  const insert = db.prepare(
    'INSERT INTO programme_enrollments VALUES (?, ?, ?, ?) ' +
    'ON CONFLICT(programme_id) DO NOTHING'
  );

  insert.run(
    'one', 'quiet', 1,
    joined.joinedAt
  );

  insert.run(
    'two', 'quiet', 2,
    joined.joinedAt
  );

  const rows = db.prepare(
    'SELECT * FROM programme_enrollments'
  ).all();

  assert.equal(rows.length, 1);
  assert.equal(rows[0].programme_version, 1);

  console.log('PASS: duplicate enrolment prevention');

  db.prepare(
    'DELETE FROM programme_enrollments WHERE id = ?'
  ).run('one');

  assert.equal(
    db.prepare(
      'SELECT COUNT(*) AS count FROM programme_enrollments'
    ).get().count,
    0
  );

  console.log('PASS: voluntary withdrawal');

  db.close();
}

console.log('PROGRAMME ENROLMENT TESTS PASSED');
