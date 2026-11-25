const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync('content/shareLinks.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const engine = {};
new Function('exports', compiled)(engine);

const params = {
  kind: 'moment',
  id: 'little_room',
  v: '1',
};

assert.deepEqual(
  engine.parseSharedLink(params),
  engine.MOMENT_LINK
);

assert.equal(
  engine.nativeShareLink(engine.MOMENT_LINK),
  'stillwater://shared?kind=moment&id=little_room&v=1'
);

assert.deepEqual(
  engine.parseSharedLink({
    kind: 'walk',
    id: 'three_quiet_evenings',
    v: '1',
  }),
  engine.WALK_LINK
);

console.log('PASS: moment and programme deep links');

for (const bad of [
  { ...params, kind: 'unknown' },
  { ...params, id: '../private' },
  { ...params, v: '0' },
  { ...params, v: ['1', '2'] },
  { ...params, v: '1.5' },
  { ...params, recoveryHistory: 'test' },
]) {
  assert.equal(engine.parseSharedLink(bad), null);
}

console.log('PASS: invalid and ambiguous parameters rejected');

assert.equal(
  engine.publicShareLink(undefined, engine.MOMENT_LINK),
  null
);

assert.equal(
  engine.publicShareLink('http://example.com', engine.MOMENT_LINK),
  null
);

assert.equal(
  engine.publicShareLink(
    'https://example.com/quiet/',
    engine.MOMENT_LINK
  ),
  'https://example.com/quiet/#kind=moment&id=little_room&v=1'
);

console.log('PASS: configured HTTPS public links');

console.log('SHARING REGRESSION TESTS PASSED');
