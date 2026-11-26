const assert = require('node:assert/strict');
const fs = require('node:fs');
const recordings = require('./recording-tools.cjs');

recordings.validateTracks();

const tracks = JSON.parse(
  fs.readFileSync(
    'assets/content/midnight_audio.json',
    'utf8'
  )
);

for (const track of tracks) {
  const sheet = recordings.createCueSheet(track);

  assert.ok(sheet.includes(track.id));
  assert.ok(sheet.includes('00:00'));
  assert.ok(sheet.includes('Pending human approval'));

  for (const cue of track.cues) {
    assert.ok(sheet.includes(cue.text));
  }

  const changed = structuredClone(track);
  changed.cues[0].text += ' changed';

  assert.notEqual(
    recordings.transcriptHash(changed),
    recordings.transcriptHash(track)
  );
}

console.log('PASS: complete recording scripts');

const registry = recordings.registryContent([
  'urge_1am',
]);

assert.ok(
  registry.includes(
    '../assets/audio/urge_1am.mp3'
  )
);

assert.ok(
  !registry.includes(
    '../assets/audio/lonely_house.mp3'
  )
);

console.log('PASS: static local asset registration');

recordings.synchronise(false);

console.log('RECORDING TOOLKIT TESTS PASSED');
