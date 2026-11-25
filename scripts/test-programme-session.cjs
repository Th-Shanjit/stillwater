const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/programmeSession.ts',
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    }
  }
).outputText;

const engine = {};
new Function('exports', compiled)(engine);

const day = {
  id: 'day_one',
  title: 'Make space',
  description: 'Test session',
  steps: [
    { id: 'intro', optional: false },
    { id: 'action', optional: false },
    { id: 'prayer', optional: true },
  ],
};

let session = engine.initialProgrammeSession(day);

assert.equal(session.cursor, 0);

assert.deepEqual(
  session.dispositions,
  [null, null, null]
);

assert.equal(
  engine.getProgrammeSessionResult(day, session),
  null
);

console.log('PASS: session starts incomplete');

const rejected = engine.advanceProgrammeStep(
  day, session, 0, 'skipped'
);

assert.equal(rejected, session);

console.log('PASS: core step skip rejected');

session = engine.advanceProgrammeStep(
  day, session, 0, 'continued'
);

assert.equal(session.cursor, 1);

const staleTap = engine.advanceProgrammeStep(
  day, session, 0, 'continued'
);

assert.equal(staleTap, session);

console.log('PASS: duplicate stale tap ignored');

session = engine.advanceProgrammeStep(
  day, session, 1, 'continued'
);

session = engine.advanceProgrammeStep(
  day, session, 2, 'skipped'
);

assert.equal(session.cursor, 3);

assert.deepEqual(
  session.dispositions,
  ['continued', 'continued', 'skipped']
);

console.log('PASS: optional prayer can be skipped');

const result =
  engine.getProgrammeSessionResult(day, session);

assert.deepEqual(result, {
  dayId: 'day_one',
  steps: [
    { stepId: 'intro', disposition: 'continued' },
    { stepId: 'action', disposition: 'continued' },
    { stepId: 'prayer', disposition: 'skipped' },
  ],
});

console.log('PASS: session result contains no private text');

session = engine.previousProgrammeStep(session);

assert.equal(session.cursor, 2);

assert.equal(
  engine.getProgrammeSessionResult(day, session),
  null
);

session = engine.advanceProgrammeStep(
  day, session, 2, 'continued'
);

assert.equal(
  engine.getProgrammeSessionResult(
    day, session
  ).steps[2].disposition,
  'continued'
);

console.log('PASS: revisiting a step updates its disposition');

assert.equal(
  engine.getProgrammeSessionResult(day, {
    cursor: 3,
    dispositions: ['skipped', 'continued', 'continued'],
  }),
  null
);

assert.equal(
  engine.getProgrammeSessionResult(day, {
    cursor: 3,
    dispositions: ['continued', null, 'continued'],
  }),
  null
);

console.log('PASS: invalid completion rejected');

assert.equal(
  engine.previousProgrammeStep(
    engine.initialProgrammeSession(day)
  ).cursor,
  0
);

console.log('PASS: backward navigation stays in bounds');

console.log('PROGRAMME SESSION TESTS PASSED');
