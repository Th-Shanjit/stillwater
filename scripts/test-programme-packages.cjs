const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const { Buffer } = require('node:buffer');
const path = require('node:path');

const toolkit = require('./programme-toolkit.cjs');

const catalogue = toolkit.loadCatalogue();

const programme = catalogue.getProgramme(
  'three_quiet_evenings',
  1
);

assert.ok(programme);

const editions = toolkit.checkCatalogue();

assert.ok(
  editions.includes('three_quiet_evenings:1')
);

console.log('PASS: registered catalogue integrity');

const lock = toolkit.readEditionLock();

const exact = toolkit.assertEditionCompatible(
  programme,
  lock
);

assert.equal(exact.registered, true);

console.log('PASS: original edition preserved');

const changed = structuredClone(programme);
changed.days[0].steps[0].text += ' Changed.';

assert.throws(() =>
  toolkit.assertEditionCompatible(changed, lock)
);

console.log('PASS: existing edition modification rejected');

changed.version = programme.version + 1;

const next = toolkit.assertEditionCompatible(
  changed,
  lock
);

assert.equal(next.registered, false);

console.log('PASS: new content edition accepted for review');

assert.equal(
  toolkit.expectedFilename(programme),
  'three_quiet_evenings.v1.json'
);

console.log('PASS: canonical package filename');

const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), 'stillwater-package-')
);

try {
  const file = path.join(temporary, 'programme.json');

  fs.writeFileSync(
    file,
    JSON.stringify(programme, null, 2),
    'utf8'
  );

  const restored =
    toolkit.readProgrammePackage(file);

  assert.deepEqual(restored, programme);

  const firstHash =
    toolkit.editionFingerprint(restored);

  fs.writeFileSync(
    file,
    JSON.stringify(programme),
    'utf8'
  );

  assert.equal(
    toolkit.editionFingerprint(
      toolkit.readProgrammePackage(file)
    ),
    firstHash
  );

  console.log('PASS: formatting does not change fingerprint');

  fs.writeFileSync(file, '{broken json', 'utf8');

  assert.throws(() =>
    toolkit.readProgrammePackage(file)
  );

  console.log('PASS: malformed JSON rejected');

  fs.writeFileSync(
    file,
    Buffer.alloc(toolkit.MAX_PACKAGE_BYTES + 1)
  );

  assert.throws(() =>
    toolkit.readProgrammePackage(file)
  );

  console.log('PASS: oversized package rejected');

  fs.writeFileSync(file, Buffer.from([0xff, 0xfe]));

  assert.throws(() =>
    toolkit.readProgrammePackage(file)
  );

  console.log('PASS: invalid UTF-8 rejected');

  const unsafe = structuredClone(programme);
  unsafe.privateRecoveryRecords = [];

  fs.writeFileSync(
    file,
    JSON.stringify(unsafe),
    'utf8'
  );

  assert.throws(() =>
    toolkit.readProgrammePackage(file)
  );

  console.log('PASS: unexpected private-data field rejected');

} finally {
  fs.rmSync(temporary, {
    recursive: true,
    force: true,
  });
}

console.log('PROGRAMME PACKAGE TESTS PASSED');
