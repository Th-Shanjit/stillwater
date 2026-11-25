const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync(
  'content/guidedPractice.ts', 'utf8'
);

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const engine = {};
new Function('exports', compiled)(engine);

const tracks = JSON.parse(fs.readFileSync(
  'assets/content/midnight_audio.json',
  'utf8'
));

const ids = new Set();

for (const track of tracks) {
  const practice = engine.fromLegacyPractice(track);

  assert.equal(practice.id, track.id);
  assert.equal(practice.tier, track.tier);
  assert.equal(practice.audioUri, track.audioUri);
  assert.equal(practice.version, 1);
  assert.equal(practice.steps.length, track.cues.length);
  assert.equal(
    engine.totalDuration(practice),
    track.durationSeconds
  );

  assert.ok(!ids.has(practice.id));
  ids.add(practice.id);

  practice.steps.forEach((step, index) => {
    assert.equal(step.text, track.cues[index].text);
    assert.ok(step.durationSeconds > 0);
  });

  console.log('PASS: content ' + practice.id);
}

const practice = engine.fromLegacyPractice(tracks[0]);

let session = engine.initialSession();

assert.equal(session.running, false);

assert.deepEqual(
  engine.tickSession(practice, session),
  session
);

console.log('PASS: paused sessions do not advance');

session = { ...session, running: true };

for (let i = 0; i < practice.steps[0].durationSeconds; i++) {
  session = engine.tickSession(practice, session);
}

assert.equal(session.stepIndex, 1);
assert.equal(session.elapsedSeconds, 0);

console.log('PASS: timed step transition');

session = engine.moveStep(practice, session, -1);

assert.equal(session.stepIndex, 0);
assert.equal(session.elapsedSeconds, 0);

assert.equal(
  engine.moveStep(practice, session, -1).stepIndex,
  0
);

console.log('PASS: manual navigation and lower bound');

session = {
  ...engine.initialSession(),
  running: true,
};

for (let i = 0; i < tracks[0].durationSeconds; i++) {
  session = engine.tickSession(practice, session);
}

assert.equal(session.reachedEnd, true);
assert.equal(session.running, false);

assert.equal(
  engine.sessionElapsed(practice, session),
  tracks[0].durationSeconds
);

console.log('PASS: full timed practice reaches its end');

assert.deepEqual(
  engine.tickSession(practice, session),
  session
);

console.log('PASS: finished session stays stopped');

assert.throws(() => engine.fromLegacyPractice({
  ...tracks[0],
  cues: [],
}));

assert.throws(() => engine.fromLegacyPractice({
  ...tracks[0],
  cues: [
    { atSecond: 0, text: 'First' },
    { atSecond: 0, text: 'Duplicate time' },
  ],
}));

assert.throws(() => engine.fromLegacyPractice({
  ...tracks[0],
  cues: [
    { atSecond: 1, text: 'Missing opening cue' },
  ],
}));

console.log('PASS: malformed content rejected');

assert.equal(engine.formatPracticeTime(0), '0:00');
assert.equal(engine.formatPracticeTime(65), '1:05');

console.log('PASS: time formatting');
console.log('GUIDED PRACTICE ENGINE TESTS PASSED');
