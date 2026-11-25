const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync('content/activityCalendar.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const engine = {};
new Function('exports', compiled)(engine);

assert.deepEqual(engine.calendarWeeks([]), []);

console.log('PASS: empty calendar');

const sunday = [{ date: '2026-11-01' }];

const sundayWeeks = engine.calendarWeeks(sunday);

assert.equal(sundayWeeks[0].length, 7);
assert.equal(sundayWeeks[0][0], null);
assert.equal(sundayWeeks[0][6].date, '2026-11-01');

console.log('PASS: Monday-first weekday alignment');

const days = Array.from(
  { length: 30 },
  (_, i) => {
    const date = new Date(Date.UTC(2026, 9, 27 + i));

    return {
      date: date.toISOString().slice(0, 10)
    };
  }
);

const weeks = engine.calendarWeeks(days);

assert.equal(weeks.length, 5);
assert.equal(weeks[0][0], null);
assert.equal(weeks[0][1].date, '2026-10-27');
assert.equal(weeks[4][2].date, '2026-11-25');

assert.equal(
  weeks.flat().filter(Boolean).length,
  30
);

console.log('PASS: calendar crosses month boundary');

assert.equal(
  engine.dateRange('2026-12-20', '2027-01-18'),
  '20 Dec 2026 - 18 Jan 2027'
);

console.log('PASS: year-crossing date range');

const both = {
  date: '2026-11-25',
  status: 'returned',
  morningCompleted: true,
  examenCompleted: true,
};

assert.deepEqual(
  engine.activityFlags(both),
  { practice: true, returned: true }
);

assert.ok(engine.activityLabel(both).includes('Return recorded'));
assert.ok(engine.activityLabel(both).includes('Morning practice'));
assert.ok(engine.activityLabel(both).includes('Evening practice'));

console.log('PASS: overlapping activity preserved');

const unlogged = {
  ...both,
  status: 'unlogged',
  morningCompleted: false,
  examenCompleted: false,
};

assert.deepEqual(
  engine.activityFlags(unlogged),
  { practice: false, returned: false }
);

console.log('PASS: unrecorded days remain neutral');

console.log('ACTIVITY CALENDAR TESTS PASSED');
