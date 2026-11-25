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

const appearance = load(
  'content/sanctuaryAppearance.ts'
);

const growth = load(
  'content/sanctuaryGrowth.ts'
);

assert.equal(appearance.normalizeAppearance('day'), 'day');
assert.equal(appearance.normalizeAppearance('night'), 'night');
assert.equal(appearance.normalizeAppearance(null), 'day');
assert.equal(appearance.normalizeAppearance('invalid'), 'day');

console.log('PASS: appearance validation');

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log('SKIP: Node SQLite unavailable');
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(growth.SANCTUARY_SCHEMA);

  // Simulate an existing user's developed sanctuary.
  db.exec('UPDATE sanctuary_state SET stage = 3 WHERE id = 1;');

  function migrate() {
    const columns = db.prepare(
      'PRAGMA table_info(sanctuary_state)'
    ).all();

    if (!columns.some(
      column => column.name === 'appearance'
    )) {
      db.exec(appearance.ADD_SANCTUARY_APPEARANCE_SQL);
    }
  }

  migrate();

  const state = () =>
    db.prepare(
      'SELECT stage, appearance FROM sanctuary_state WHERE id = 1'
    ).get();

  assert.equal(state().stage, 3);
  assert.equal(state().appearance, 'day');

  console.log('PASS: existing growth survives migration');

  db.prepare(
    'UPDATE sanctuary_state SET appearance = ? WHERE id = 1'
  ).run('night');

  assert.equal(state().appearance, 'night');
  assert.equal(state().stage, 3);

  console.log('PASS: appearance changes preserve growth');

  db.exec(growth.SANCTUARY_SCHEMA);
  migrate();

  assert.equal(state().appearance, 'night');
  assert.equal(state().stage, 3);

  console.log('PASS: repeat initialization preserves preferences');

  assert.throws(() =>
    db.prepare(
      'UPDATE sanctuary_state SET appearance = ? WHERE id = 1'
    ).run('invalid')
  );

  console.log('PASS: invalid database appearance rejected');

  db.close();
}

console.log('SANCTUARY APPEARANCE TESTS PASSED');
