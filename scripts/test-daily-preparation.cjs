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

const compassEngine = load(
  'content/personalCompass.ts'
);

const preparationEngine = load(
  'content/dailyPreparation.ts'
);

const suggest =
  preparationEngine.getDailyPreparation;

const empty = {
  pauses: [],
  returns: 0,
  actions: [],
  practices: [],
};

const build = input =>
  compassEngine.buildPersonalCompass({
    ...empty,
    ...input,
  });

assert.equal(suggest(null).source, 'general');
assert.equal(suggest(build({})).source, 'general');

console.log('PASS: no-data fallback');

const pauses = [
  {
    id: '1',
    date: '2026-11-21',
    hour: 22,
    context: 'stressed',
  },
  {
    id: '2',
    date: '2026-11-22',
    hour: 21,
    context: 'stressed',
  },
  {
    id: '3',
    date: '2026-11-23',
    hour: 23,
    context: 'stressed',
  },
  {
    id: '4',
    date: '2026-11-24',
    hour: 9,
    context: 'bored',
  },
  {
    id: '5',
    date: '2026-11-25',
    hour: 15,
    context: 'lonely',
  },
];

const repeated = build({ pauses });

assert.equal(
  suggest(repeated).id,
  'context_pressure'
);

assert.equal(
  suggest(repeated).source,
  'context'
);

console.log('PASS: repeated context takes priority');

const timeOnly = build({
  pauses: pauses.map(row => ({
    ...row,
    context: null,
  })),
});

assert.equal(
  suggest(timeOnly).id,
  'time_rest'
);

assert.equal(
  suggest(timeOnly).source,
  'time'
);

console.log('PASS: repeated time window');

assert.equal(
  suggest(build({
    pauses: pauses.slice(0, 3),
  })).source,
  'general'
);

console.log('PASS: insufficient data remains neutral');

assert.equal(
  suggest(build({
    pauses: pauses.map(row => ({
      ...row,
      date: '2026-11-25',
    })),
  })).source,
  'general'
);

console.log('PASS: same-day event bursts ignored');

assert.equal(
  suggest(build({
    actions: [
      { sessionId: 'a', action: 'phone' },
      { sessionId: 'b', action: 'phone' },
      { sessionId: 'c', action: 'phone' },
    ],
  })).source,
  'general'
);

console.log('PASS: action frequency is not helpfulness');

const invalid = {
  ...build({}),
  contextPattern: {
    key: 'unknown',
    label: 'Unknown',
    count: 3,
    total: 5,
    distinctDates: 3,
  },
};

assert.equal(suggest(invalid).source, 'general');

console.log('PASS: unknown context fallback');

const result = suggest(repeated);

assert.ok(result.id);
assert.equal(result.version, 1);
assert.ok(result.reason.includes('3 of 5'));

assert.deepEqual(
  suggest(repeated),
  suggest(repeated)
);

console.log('PASS: stable, versioned recommendation');
console.log('DAILY PREPARATION TESTS PASSED');
