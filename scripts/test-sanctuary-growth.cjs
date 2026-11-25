const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync('content/sanctuaryGrowth.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const engine = {};
new Function('exports', compiled)(engine);

assert.equal(engine.earnedStage(0), 0);
assert.equal(engine.earnedStage(1), 1);
assert.equal(engine.earnedStage(4), 1);
assert.equal(engine.earnedStage(5), 2);
assert.equal(engine.earnedStage(11), 2);
assert.equal(engine.earnedStage(12), 3);
assert.equal(engine.earnedStage(24), 3);
assert.equal(engine.earnedStage(25), 4);
assert.equal(engine.earnedStage(500), 4);

console.log('PASS: cumulative growth thresholds');

assert.equal(engine.permanentStage(4, 0), 4);
assert.equal(engine.permanentStage(3, 1), 3);
assert.equal(engine.permanentStage(1, 25), 4);

console.log('PASS: growth never regresses');

assert.equal(engine.normalizeStage(-1), 0);
assert.equal(engine.normalizeStage(10), 4);
assert.equal(engine.normalizeStage(NaN), 0);

console.log('PASS: stage validation');

assert.equal(engine.sanctuaryDescription(0), '');
assert.ok(engine.sanctuaryDescription(4).includes('wildflowers'));

console.log('PASS: accessible landscape descriptions');

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log('SKIP: Node SQLite unavailable');
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(
    'CREATE TABLE daily_logs (' +
    'date TEXT PRIMARY KEY, ' +
    'morning_completed INTEGER DEFAULT 0, ' +
    'examen_completed INTEGER DEFAULT 0, ' +
    'day_status TEXT DEFAULT "unlogged");'
  );

  db.exec(engine.SANCTUARY_SCHEMA);
  db.exec(engine.SANCTUARY_SCHEMA);

  const insert = db.prepare(
    'INSERT INTO daily_logs VALUES (?, ?, ?, ?)'
  );

  const refresh = db.prepare(
    engine.REFRESH_SANCTUARY_SQL
  );

  const stage = () =>
    Number(db.prepare(
      'SELECT stage FROM sanctuary_state WHERE id = 1'
    ).get().stage);

  refresh.run('2026-11-25');
  assert.equal(stage(), 0);

  insert.run('2026-11-01', 0, 0, 'returned');
  refresh.run('2026-11-25');
  assert.equal(stage(), 0);

  console.log('PASS: returns alone do not award growth');

  insert.run('2026-11-02', 1, 1, 'clarity');
  refresh.run('2026-11-25');
  assert.equal(stage(), 1);

  for (let day = 3; day <= 5; day++) {
    insert.run(
      '2026-11-0' + day,
      1, 1, 'clarity'
    );
  }

  refresh.run('2026-11-25');
  assert.equal(stage(), 1);

  console.log('PASS: two practices on one date count once');

  insert.run('2026-11-06', 1, 0, 'returned');

  refresh.run('2026-11-25');
  assert.equal(stage(), 2);

  console.log('PASS: practices survive recorded returns');

  insert.run('2026-12-01', 1, 1, 'clarity');

  refresh.run('2026-11-05');
  assert.equal(stage(), 2);

  console.log('PASS: future dates excluded and no regression');

  db.exec('DELETE FROM daily_logs;');

  refresh.run('2026-11-25');
  assert.equal(stage(), 2);

  console.log('PASS: persisted growth remains permanent');

  db.close();
}

console.log('SANCTUARY GROWTH TESTS PASSED');
