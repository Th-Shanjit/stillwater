const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/privateDataReset.ts',
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const policy = {};

new Function('exports', compiled)(policy);

assert.equal(
  policy.confirmsPrivateReset('DELETE'),
  true
);

assert.equal(
  policy.confirmsPrivateReset('delete'),
  false
);

assert.equal(
  policy.confirmsPrivateReset(''),
  false
);

console.log('PASS: explicit deletion confirmation');

const db = new DatabaseSync(':memory:');

for (const table of policy.PRIVATE_DATA_TABLES) {
  db.exec(
    'CREATE TABLE ' + table +
    ' (id INTEGER PRIMARY KEY);' +
    'INSERT INTO ' + table + ' VALUES (1);'
  );
}

db.exec([
  'CREATE TABLE app_flags (key TEXT PRIMARY KEY, value TEXT);',
  "INSERT INTO app_flags VALUES ('grace_scholarship_until', '2028-01-01');",

  'CREATE TABLE sanctuary_state (id INTEGER PRIMARY KEY, stage INTEGER, appearance TEXT);',
  "INSERT INTO sanctuary_state VALUES (1, 4, 'night');",

  'CREATE TABLE user_preferences (',
  'id INTEGER PRIMARY KEY,',
  'vulnerable_windows TEXT,',
  'trusted_ally_name TEXT,',
  'trusted_ally_phone TEXT,',
  'save_laments INTEGER,',
  'bedtime_hhmm TEXT,',
  'morning_hhmm TEXT,',
  'last_opened_at TEXT,',
  'biometric_lock INTEGER,',
  'onboarding_completed INTEGER,',
  'tone_track TEXT',
  ');',

  "INSERT INTO user_preferences VALUES (1, '[]', 'Example', '123456', 1, '23:30', '08:00', '2026-11-25', 1, 1, 'liturgical');",
].join('\n'));

db.exec('BEGIN IMMEDIATE;');

db.exec(policy.PRIVATE_RESET_SQL);

db.exec('COMMIT;');

for (const table of policy.PRIVATE_DATA_TABLES) {
  assert.equal(
    db.prepare(
      'SELECT COUNT(*) AS count FROM ' + table
    ).get().count,
    0
  );
}

console.log('PASS: private record tables cleared');

const prefs = db.prepare(
  'SELECT * FROM user_preferences WHERE id = 1'
).get();

assert.equal(prefs.trusted_ally_name, null);
assert.equal(prefs.trusted_ally_phone, null);
assert.equal(prefs.save_laments, 0);
assert.equal(prefs.biometric_lock, 1);
assert.equal(prefs.onboarding_completed, 1);
assert.equal(prefs.tone_track, 'liturgical');

console.log('PASS: sensitive preferences removed');

const sanctuary = db.prepare(
  'SELECT * FROM sanctuary_state WHERE id = 1'
).get();

assert.equal(sanctuary.stage, 0);
assert.equal(sanctuary.appearance, 'day');

assert.equal(
  db.prepare(
    "SELECT value FROM app_flags WHERE key = 'grace_scholarship_until'"
  ).get().value,
  '2028-01-01'
);

console.log('PASS: Sanctuary reset and scholarship preserved');

// Verify a failed multi-table deletion rolls back.
db.exec('INSERT INTO programme_participation VALUES (1);');
db.exec('DROP TABLE programme_enrollments;');
db.exec('BEGIN IMMEDIATE;');

assert.throws(() =>
  db.exec(policy.PRIVATE_RESET_SQL)
);

db.exec('ROLLBACK;');

assert.equal(
  db.prepare(
    'SELECT COUNT(*) AS count FROM programme_participation'
  ).get().count,
  1
);

db.close();

console.log('PASS: failed deletion can be rolled back');
console.log('PRIVATE DATA RESET TESTS PASSED');
