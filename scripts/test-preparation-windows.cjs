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

const engine = load('content/preparationWindows.ts');
const preparation = load('content/dailyPreparation.ts');

const night = {
  id: 'night',
  start: '22:00',
  end: '02:00',
  enabled: true,
};

const afternoon = {
  id: 'afternoon',
  start: '14:00',
  end: '16:00',
  enabled: true,
};

assert.equal(engine.timeToMinutes('00:00'), 0);
assert.equal(engine.timeToMinutes('23:59'), 1439);
assert.equal(engine.timeToMinutes('24:00'), -1);
assert.equal(engine.timeToMinutes('10:60'), -1);

assert.equal(engine.validWindow('22:00', '02:00'), true);
assert.equal(engine.validWindow('22:00', '22:00'), false);

console.log('PASS: time validation');

assert.equal(engine.isWindowActive(night, 23 * 60), true);
assert.equal(engine.isWindowActive(night, 60), true);
assert.equal(engine.isWindowActive(night, 120), false);
assert.equal(engine.isWindowActive(night, 720), false);

console.log('PASS: midnight-crossing window');

assert.equal(engine.isWindowActive(afternoon, 840), true);
assert.equal(engine.isWindowActive(afternoon, 960), false);

console.log('PASS: start-inclusive end-exclusive');

const at = (hour, minute = 0) =>
  new Date(2026, 10, 25, hour, minute);

assert.equal(
  engine.findPreparationWindow([night], at(20)).minutesUntilStart,
  120
);

assert.equal(
  engine.findPreparationWindow([night], at(18)),
  null
);

assert.equal(
  engine.findPreparationWindow([night], at(1)).activeNow,
  true
);

console.log('PASS: three-hour preparation horizon');

assert.equal(
  engine.findPreparationWindow([
    { ...night, enabled: false },
  ], at(23)),
  null
);

assert.equal(
  engine.findPreparationWindow([], at(23)),
  null
);

console.log('PASS: paused and empty windows ignored');

assert.equal(
  engine.findPreparationWindow(
    [night, afternoon],
    at(15)
  ).window.id,
  'afternoon'
);

console.log('PASS: relevant window selected');

const match = engine.findPreparationWindow([night], at(20));

assert.equal(
  preparation.getDailyPreparation(null, match).source,
  'user_window'
);

assert.equal(
  preparation.getDailyPreparation(null, null).source,
  'general'
);

console.log('PASS: recommendation integration');

assert.equal(
  engine.formatWindowTime('00:00'),
  '12:00 AM'
);

assert.equal(
  engine.formatWindowTime('22:30'),
  '10:30 PM'
);

console.log('PASS: readable time formatting');

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log('SKIP: Node SQLite unavailable');
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(engine.WINDOW_SCHEMA);
  db.exec(engine.WINDOW_SCHEMA);

  const insert = db.prepare(
    'INSERT INTO preparation_windows VALUES (?, ?, ?, ?)'
  );

  insert.run('a', '22:00', '02:00', 1);

  assert.throws(() =>
    insert.run('b', '22:00', '02:00', 1)
  );

  db.close();

  console.log('PASS: repeatable schema and duplicate prevention');
}

console.log('PREPARATION WINDOW TESTS PASSED');
