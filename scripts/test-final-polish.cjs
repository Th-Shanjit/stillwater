const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/onboardingInvitation.ts', 'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const routes = {};

new Function('exports', compiled)(routes);

const moment =
  '/shared?kind=moment&id=little_room&v=1';

const walk =
  '/shared?kind=walk&id=three_quiet_evenings&v=1';

const invite = 'a'.repeat(64);

assert.equal(
  routes.invitationDestination('shared', {
    kind: 'moment',
    id: 'little_room',
    v: '1',
  }),
  moment
);

assert.equal(
  routes.invitationDestination('shared', {
    kind: 'walk',
    id: 'three_quiet_evenings',
    v: '1',
  }),
  walk
);

assert.equal(
  routes.invitationDestination('circles', {
    invite,
  }),
  '/circles?invite=' + invite
);

console.log('PASS: known invitation destinations preserved');

for (const invalid of [
  'https://example.com',
  '/settings',
  '/privacy-data',
  '/circles?invite=invalid',
  '/shared?kind=walk&id=unknown&v=1',
  moment + '&extra=1',
  [moment],
  null,
]) {
  assert.equal(
    routes.safeOnboardingDestination(invalid),
    '/(tabs)'
  );
}

assert.equal(
  routes.invitationDestination('shared', {
    kind: 'moment',
    id: 'little_room',
    v: '1',
    extra: 'private',
  }),
  null
);

assert.equal(
  routes.safeOnboardingDestination(walk),
  walk
);

console.log('PASS: unsafe onboarding redirects rejected');

const days = JSON.parse(
  fs.readFileSync(
    'assets/content/recovery_path.json', 'utf8'
  )
);

assert.equal(days.length, 30);

for (let i = 0; i < days.length; i++) {
  assert.equal(days[i].day, i + 1);

  assert.equal(
    days[i].tier,
    i < 7 ? 'free' : 'plus'
  );

  assert.ok(days[i].reflection.trim());
  assert.ok(days[i].practice.trim());
  assert.ok(days[i].clinicalLens.trim());
}

console.log('PASS: recovery path structure and access preserved');

const tracks = JSON.parse(
  fs.readFileSync(
    'assets/content/midnight_audio.json', 'utf8'
  )
);

assert.equal(tracks.length, 4);

for (const id of [
  'urge_1am',
  'post_slip_fraud',
]) {
  assert.equal(
    tracks.find(item => item.id === id).tier,
    'free'
  );
}

for (const track of tracks) {
  let previous = -1;

  for (const cue of track.cues) {
    assert.ok(cue.atSecond > previous);
    assert.ok(cue.atSecond < track.durationSeconds);
    assert.ok(cue.text.trim());

    previous = cue.atSecond;
  }
}

console.log('PASS: guided practice structure and free access');

console.log('FINAL POLISH TESTS PASSED');
