const assert = require('node:assert/strict');

const {
  loadEngine,
  loadCatalogue,
} = require('./programme-toolkit.cjs');

const engine = loadEngine();
const catalog = loadCatalogue();

const programme = catalog.getProgramme(
  'three_quiet_evenings',
  1
);

assert.ok(programme);
assert.equal(programme.days.length, 3);
assert.equal(programme.access, 'free');
assert.equal(programme.audience, 'general');

console.log('PASS: bundled programme validation');

assert.equal(
  engine.programmeKey(programme),
  'three_quiet_evenings:1'
);

assert.equal(
  catalog.getProgramme('three_quiet_evenings', 2),
  null
);

assert.equal(
  catalog.getProgramme('missing-programme'),
  null
);

console.log('PASS: exact version lookup');

assert.equal(
  engine.findProgrammeDay(
    programme,
    'reconnect'
  ).title,
  'Reconnect'
);

assert.equal(
  engine.findProgrammeDay(programme, 'missing'),
  null
);

assert.equal(
  engine.programmeDuration(programme),
  220
);

console.log('PASS: ordered days and duration');

function reject(change) {
  const copy = structuredClone(programme);
  change(copy);

  assert.throws(() =>
    engine.parseProgramme(copy)
  );
}

reject(p => { p.schemaVersion = 99; });
reject(p => { p.version = 0; });
reject(p => { p.version = 1.5; });
reject(p => { p.id = '../unsafe'; });

console.log('PASS: invalid identifiers and versions');

reject(p => { p.days = []; });
reject(p => { p.days[0].steps = []; });
reject(p => { p.days[1].id = p.days[0].id; });

reject(p => {
  p.days[1].steps[0].id =
    p.days[0].steps[0].id;
});

console.log('PASS: empty and duplicate content rejected');

reject(p => {
  p.days[0].steps[0].text = '';
});

reject(p => {
  p.days[0].steps[0].suggestedSeconds = -10;
});

reject(p => {
  p.days[0].steps[0].kind = 'unknown';
});

reject(p => {
  p.days[0].steps[0].optional = 'yes';
});

console.log('PASS: invalid steps rejected');

reject(p => {
  p.days[0].steps[2].optional = false;
});

reject(p => {
  p.days[1].steps[2].optional = false;
});

console.log('PASS: optional prayer and reflection');

reject(p => {
  p.days[0].steps.forEach(step => {
    step.optional = true;
  });
});

console.log('PASS: each day contains a core step');

reject(p => {
  p.days[0].steps[0].audioAssetId =
    'https://example.com/audio.mp3';
});

const withAudio = structuredClone(programme);

withAudio.days[0].steps[0].audioAssetId =
  'quiet_evenings_intro';

assert.equal(
  engine.parseProgramme(withAudio)
    .days[0].steps[0].audioAssetId,
  'quiet_evenings_intro'
);

console.log('PASS: stable audio references');

reject(p => {
  p.participantRecoveryHistory = [];
});

reject(p => {
  p.days[0].steps[0].privateReflection = 'test';
});

console.log('PASS: unexpected personal-data fields rejected');

const clean = engine.parseProgramme(programme);

clean.days[0].title = 'Changed locally';

assert.notEqual(
  catalog.getProgramme(
    'three_quiet_evenings', 1
  ).days[0].title,
  'Changed locally'
);

console.log('PASS: catalogue definitions remain isolated');

console.log('PROGRAMME ARCHITECTURE TESTS PASSED');
