const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/membershipPolicy.ts', 'utf8'
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }
).outputText;

const policy = {};

new Function('exports', compiled)(policy);

const base = {
  store: null,
  storeChecked: true,
  scholarshipUntil: null,
  development: false,
  now: Date.parse('2026-11-25T12:00:00Z'),
};

assert.equal(
  policy.resolvePlusAccess(base).source,
  'free'
);

assert.equal(
  policy.resolvePlusAccess({
    ...base,
    storeChecked: false,
  }).source,
  'unavailable'
);

console.log('PASS: free and unverified access distinguished');

const lifetime = policy.resolvePlusAccess({
  ...base,
  store: {
    isActive: true,
    expirationDate: null,
  },
});

assert.equal(lifetime.active, true);
assert.equal(lifetime.source, 'store_no_expiry');

const subscription = policy.resolvePlusAccess({
  ...base,
  store: {
    isActive: true,
    expirationDate: '2027-01-01T00:00:00Z',
  },
});

assert.equal(subscription.source, 'store_subscription');

assert.equal(
  policy.resolvePlusAccess({
    ...base,
    store: {
      isActive: false,
      expirationDate: null,
    },
  }).active,
  false
);

console.log('PASS: store entitlement validity');

const grace = policy.resolvePlusAccess({
  ...base,
  storeChecked: false,
  scholarshipUntil: '2027-11-25T12:00:00Z',
});

assert.equal(grace.active, true);
assert.equal(grace.source, 'scholarship');

assert.equal(
  policy.resolvePlusAccess({
    ...base,
    scholarshipUntil: '2026-01-01T00:00:00Z',
  }).active,
  false
);

console.log('PASS: scholarship expiry and offline access');

assert.equal(
  policy.resolvePlusAccess({
    ...base,
    development: true,
  }).source,
  'development'
);

assert.equal(policy.permitsContent('free', false), true);
assert.equal(policy.permitsContent('plus', false), false);
assert.equal(policy.permitsContent('plus', true), true);

console.log('PASS: access tier enforcement');

assert.equal(policy.validStorePlan(
  'monthly', 'MONTHLY', 'P1M', '$5.99'
), true);

assert.equal(policy.validStorePlan(
  'annual', 'ANNUAL', 'P1Y', '$34.99'
), true);

assert.equal(policy.validStorePlan(
  'lifetime', 'LIFETIME', null, '$39.99'
), true);

assert.equal(policy.validStorePlan(
  'lifetime', 'LIFETIME', 'P1M', '$39.99'
), false);

assert.equal(policy.validStorePlan(
  'annual', 'ANNUAL', 'P1M', '$34.99'
), false);

assert.equal(policy.validStorePlan(
  'monthly', 'MONTHLY', 'P1M', ''
), false);

console.log('PASS: unsupported billing periods rejected');

assert.equal(
  policy.validLegalUrl('https://example.com/privacy'),
  true
);

assert.equal(policy.validLegalUrl(undefined), false);
assert.equal(policy.validLegalUrl('http://example.com'), false);
assert.equal(policy.validLegalUrl('javascript:alert(1)'), false);

console.log('PASS: legal document URL checks');

const practices = JSON.parse(
  fs.readFileSync(
    'assets/content/midnight_audio.json', 'utf8'
  )
);

for (const id of ['urge_1am', 'post_slip_fraud']) {
  const item = practices.find(value => value.id === id);

  assert.ok(item);
  assert.equal(item.tier, 'free');
}

const path = JSON.parse(
  fs.readFileSync(
    'assets/content/recovery_path.json', 'utf8'
  )
);

assert.equal(path.length, 30);

for (const day of path) {
  assert.equal(
    day.tier,
    day.day <= 7 ? 'free' : 'plus'
  );
}

console.log('PASS: essential free content boundaries');

console.log('MEMBERSHIP POLICY TESTS PASSED');
