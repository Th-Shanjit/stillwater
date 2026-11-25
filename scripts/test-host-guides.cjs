const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const toolkit = require('./programme-toolkit.cjs');

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

const hosts = load('content/hostGuides.ts');
const publishers = load('content/publishers.ts');

const catalogue = toolkit.loadCatalogue();

const programme = catalogue.getProgramme(
  'three_quiet_evenings', 1
);

assert.ok(programme);

const profile = publishers.getPublisherProfile(
  programme.publisher
);

assert.ok(profile);
assert.equal(profile.id, 'stillwater');

console.log('PASS: curated publisher attribution');

assert.equal(
  publishers.getPublisherProfile({
    id: 'stillwater',
    name: 'Unknown publisher',
    kind: 'stillwater',
  }),
  null
);

console.log('PASS: mismatched publisher profile rejected');

assert.equal(
  publishers.publisherProgrammes(
    'stillwater',
    [programme, { ...programme, version: 2 }]
  )[0].version,
  2
);

console.log('PASS: publisher catalogue selects latest edition');

for (const day of programme.days) {
  const guide = hosts.buildHostGuide(
    programme,
    day.id
  );

  assert.ok(guide);
  assert.equal(guide.dayId, day.id);
  assert.equal(guide.programmeVersion, 1);
  assert.equal(guide.agenda.length, 5);

  assert.equal(
    hosts.hostGuideMinutes(guide),
    14
  );

  assert.equal(
    guide.agenda.filter(
      item => item.kind === 'programme'
    ).length,
    1
  );

  assert.equal(
    guide.agenda.filter(
      item => item.kind === 'discussion'
    ).length,
    1
  );
}

console.log('PASS: three complete host guides');

for (const invalid of [
  { ...programme, audience: 'recovery' },
  { ...programme, access: 'plus' },
  { ...programme, version: 2 },
  { ...programme, schedule: 'daily' },
  {
    ...programme,
    publisher: {
      ...programme.publisher,
      id: 'unapproved',
    },
  },
]) {
  assert.equal(
    hosts.buildHostGuide(
      invalid, programme.days[0].id
    ),
    null
  );
}

console.log('PASS: unapproved content cannot enter host mode');

assert.equal(
  hosts.buildHostGuide(programme, 'unknown_day'),
  null
);

console.log('PASS: unavailable host session rejected');

const guide = hosts.buildHostGuide(
  programme,
  programme.days[0].id
);

guide.agenda[0].title = 'Changed locally';

assert.notEqual(
  hosts.buildHostGuide(
    programme,
    programme.days[0].id
  ).agenda[0].title,
  'Changed locally'
);

console.log('PASS: host definitions remain isolated');

const hostSource = fs.readFileSync(
  'app/host.tsx', 'utf8'
);

assert.ok(
  !/from\s+['"][^'"]*\/db\//.test(hostSource)
);

assert.ok(!hostSource.includes('onProgress='));

console.log('PASS: host screen has no direct participation writes');

console.log('HOST AND PUBLISHER TESTS PASSED');
