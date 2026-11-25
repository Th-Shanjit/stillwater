const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/personalCompass.ts',
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

const empty = {
  pauses: [],
  returns: 0,
  actions: [],
  practices: [],
};

const build = input =>
  engine.buildPersonalCompass({
    ...empty,
    ...input,
  });

const pause = (
  id, date, hour, context = null
) => ({
  id: String(id),
  date: '2026-11-' + String(date).padStart(2, '0'),
  hour,
  context,
});

assert.equal(build({}).pauseCount, 0);
assert.equal(build({}).timePattern, null);

console.log('PASS: empty data');

const repeated = [
  pause(1, 21, 22, 'stressed'),
  pause(2, 22, 21, 'stressed'),
  pause(3, 23, 23, 'stressed'),
  pause(4, 24, 10, 'lonely'),
  pause(5, 25, 15, 'bored'),
];

assert.equal(
  build({ pauses: repeated }).timePattern.count,
  3
);

assert.equal(
  build({ pauses: repeated }).contextPattern.key,
  'stressed'
);

console.log('PASS: repeated patterns across dates');

assert.equal(
  build({
    pauses: repeated.slice(0, 3),
  }).timePattern,
  null
);

console.log('PASS: small sample suppression');

const sameDay = repeated.map(row => ({
  ...row,
  date: '2026-11-25',
}));

assert.equal(
  build({ pauses: sameDay }).timePattern,
  null
);

console.log('PASS: same-day burst suppression');

const tied = [
  pause(1, 21, 22),
  pause(2, 22, 22),
  pause(3, 23, 22),
  pause(4, 21, 10),
  pause(5, 22, 10),
  pause(6, 23, 10),
];

assert.equal(
  build({ pauses: tied }).timePattern,
  null
);

console.log('PASS: tied patterns suppressed');

assert.equal(
  build({
    pauses: [
      ...repeated,
      repeated[0],
    ],
  }).pauseCount,
  5
);

console.log('PASS: duplicate pause suppression');

assert.equal(
  build({
    pauses: [
      pause(1, 21, -1),
      pause(2, 22, 24),
      pause(3, 23, 1.5),
    ],
  }).pauseCount,
  0
);

console.log('PASS: invalid hour rejection');

const actionSummary = build({
  actions: [
    { sessionId: 'a', action: 'phone' },
    { sessionId: 'a', action: 'phone' },
    { sessionId: 'b', action: 'move' },
    { sessionId: 'c', action: 'none' },
    { sessionId: 'd', action: 'unknown' },
  ],
});

assert.equal(
  actionSummary.actionSelectionCount,
  2
);

console.log('PASS: action allowlist and deduplication');

const practice = {
  sessionId: 'p1',
  contentId: 'urge_1am',
  contentVersion: 1,
  kind: 'practice_started',
};

const summary = build({
  practices: [
    practice,
    practice,
    {
      ...practice,
      kind: 'practice_end_reached',
    },
    {
      ...practice,
      sessionId: 'p2',
      kind: 'practice_end_reached',
    },
    {
      ...practice,
      sessionId: 'p3',
    },
    {
      ...practice,
      sessionId: 'p3',
      contentVersion: 2,
      kind: 'practice_end_reached',
    },
  ],
});

assert.equal(summary.practicesStarted, 2);
assert.equal(summary.practicesEnded, 1);

console.log('PASS: matched versioned practice sessions');

assert.equal(
  build({ returns: 4 }).returnCount,
  4
);

assert.equal(
  build({ returns: 4 }).pauseCount,
  0
);

console.log('PASS: separate record categories');
console.log('PERSONAL COMPASS TESTS PASSED');
