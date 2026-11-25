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
  'content/preparationFeedback.ts'
);

const preparation = load(
  'content/dailyPreparation.ts'
);

const compass = load(
  'content/personalCompass.ts'
);

const row = (feedback, version = 1) => ({
  suggestionId: 'context_pressure',
  suggestionVersion: version,
  feedback,
});

const avoid = engine.getAvoidedSuggestions;

assert.deepEqual(avoid([]), []);

assert.deepEqual(
  avoid([row('not_helpful')]),
  []
);

console.log('PASS: insufficient feedback');

assert.deepEqual(
  avoid([
    row('not_helpful'),
    row('not_helpful'),
  ]),
  ['context_pressure:1']
);

console.log('PASS: repeated negative feedback');

assert.deepEqual(
  avoid([
    row('not_helpful'),
    row('not_helpful'),
    row('helpful'),
  ]),
  []
);

console.log('PASS: positive feedback balances negative feedback');

assert.deepEqual(
  avoid([
    row('not_tried'),
    row('skipped'),
    row('not_tried'),
  ]),
  []
);

console.log('PASS: skipped and untried are neutral');

assert.deepEqual(
  avoid([
    row('not_helpful', 1),
    row('not_helpful', 2),
  ]),
  []
);

console.log('PASS: content versions remain separate');

const pauses = [
  { id: '1', date: '2026-11-21', hour: 22, context: 'stressed' },
  { id: '2', date: '2026-11-22', hour: 22, context: 'stressed' },
  { id: '3', date: '2026-11-23', hour: 22, context: 'stressed' },
  { id: '4', date: '2026-11-24', hour: 9, context: 'bored' },
  { id: '5', date: '2026-11-25', hour: 15, context: 'lonely' },
];

const summary = compass.buildPersonalCompass({
  pauses,
  returns: 0,
  actions: [],
  practices: [],
});

assert.equal(
  preparation.getDailyPreparation(summary).id,
  'context_pressure'
);

assert.equal(
  preparation.getDailyPreparation(
    summary,
    null,
    ['context_pressure:1']
  ).id,
  'time_rest'
);

assert.equal(
  preparation.getDailyPreparation(
    summary,
    null,
    ['context_pressure:1', 'time_rest:1']
  ).source,
  'general'
);

console.log('PASS: adaptation and fallback');

const windowMatch = {
  window: {
    id: 'test-window',
    start: '22:00',
    end: '02:00',
    enabled: true,
  },
  activeNow: true,
  minutesUntilStart: 0,
};

assert.equal(
  preparation.getDailyPreparation(
    summary,
    windowMatch
  ).source,
  'user_window'
);

assert.equal(
  preparation.getDailyPreparation(
    summary,
    windowMatch,
    ['user_window_prepare:1']
  ).source,
  'context'
);

console.log('PASS: user-window adaptation');

assert.equal(engine.validFeedback('helpful'), true);
assert.equal(engine.validFeedback('cured'), false);

console.log('PASS: feedback allowlist');

let DatabaseSync;

try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.log('SKIP: Node SQLite unavailable');
}

if (DatabaseSync) {
  const db = new DatabaseSync(':memory:');

  db.exec(engine.FEEDBACK_SCHEMA);
  db.exec(engine.FEEDBACK_SCHEMA);

  const insert = db.prepare(
    'INSERT INTO preparation_feedback (boundary_id, suggestion_id, suggestion_version, source, accepted_at) VALUES (?, ?, ?, ?, ?)'
  );

  insert.run(
    'boundary-1',
    'context_pressure',
    1,
    'context',
    new Date().toISOString()
  );

  assert.throws(() => insert.run(
    'boundary-1',
    'context_pressure',
    1,
    'context',
    new Date().toISOString()
  ));

  const update = db.prepare(
    'UPDATE preparation_feedback SET feedback = ? WHERE boundary_id = ? AND feedback IS NULL'
  );

  update.run('helpful', 'boundary-1');
  update.run('not_helpful', 'boundary-1');

  const result = db.prepare(
    'SELECT feedback FROM preparation_feedback WHERE boundary_id = ?'
  ).get('boundary-1');

  assert.equal(result.feedback, 'helpful');

  db.close();

  console.log('PASS: unique feedback records');
  console.log('PASS: duplicate response protection');
}

console.log('PREPARATION FEEDBACK TESTS PASSED');
