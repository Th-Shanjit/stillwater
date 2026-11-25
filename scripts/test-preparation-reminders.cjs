const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/preparationReminderRules.ts',
    'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const rules = {};
new Function('exports', compiled)(rules);

assert.equal(
  rules.reminderTime('22:00').hhmm,
  '21:30'
);

assert.equal(
  rules.reminderTime('14:15').hhmm,
  '13:45'
);

console.log('PASS: thirty-minute lead time');

assert.equal(
  rules.reminderTime('00:15').hhmm,
  '23:45'
);

assert.equal(
  rules.reminderTime('00:30').hhmm,
  '00:00'
);

assert.equal(
  rules.reminderTime('00:00').hhmm,
  '23:30'
);

console.log('PASS: midnight rollover');

assert.throws(() => rules.reminderTime('24:00'));
assert.throws(() => rules.reminderTime('09:99'));
assert.throws(() => rules.reminderTime('bad'));

console.log('PASS: invalid times rejected');

const id = rules.reminderIdentifier('window-123');

assert.equal(
  id,
  'stillwater-preparation:window-123'
);

assert.ok(rules.isPreparationReminder(id));

assert.ok(!rules.isPreparationReminder(
  'morning-anchor'
));

assert.ok(!rules.isPreparationReminder(
  'evening-examen'
));

console.log('PASS: isolated notification identifiers');

const existing = [
  { identifier: 'a', minute: 100 },
  { identifier: 'b', minute: 200 },
  { identifier: 'c', minute: 300 },
];

assert.equal(
  rules.canAddReminder(existing, 'd', 400),
  'limit'
);

assert.equal(
  rules.canAddReminder(existing.slice(0, 2), 'd', 400),
  'allowed'
);

console.log('PASS: three-reminder maximum');

assert.equal(
  rules.canAddReminder(existing, 'd', 200),
  'duplicate_time'
);

console.log('PASS: duplicate schedule prevention');

assert.equal(
  rules.canAddReminder(existing, 'a', 100),
  'allowed'
);

console.log('PASS: existing reminder replacement');

console.log('PREPARATION REMINDER TESTS PASSED');
