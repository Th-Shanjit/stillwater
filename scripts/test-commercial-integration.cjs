const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const economics = require('./partner-economics.cjs');
const readiness = require('./check-commercial-readiness.cjs');

const compiled = ts.transpileModule(
  fs.readFileSync(
    'content/offerPolicy.ts', 'utf8'
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

const config = {
  platform: 'android',
  androidEnabled: true,
  iosEnabled: false,
  legalReady: true,
  supportedBuild: true,
};

assert.equal(
  policy.permitsOfferRedemption(config),
  true
);

assert.equal(
  policy.permitsOfferRedemption({
    ...config,
    androidEnabled: false,
  }),
  false
);

assert.equal(
  policy.permitsOfferRedemption({
    ...config,
    legalReady: false,
  }),
  false
);

assert.equal(
  policy.permitsOfferRedemption({
    ...config,
    supportedBuild: false,
  }),
  false
);

assert.equal(
  policy.permitsOfferRedemption({
    ...config,
    platform: 'ios',
  }),
  false
);

assert.equal(
  policy.permitsOfferRedemption({
    ...config,
    platform: 'unsupported',
  }),
  false
);

console.log('PASS: platform-specific offer boundaries');

const scenario = {
  currency: 'USD',
  paidUnits: 100,
  refundedUnits: 10,
  unitPriceMinor: 999,
  distributionFeeBps: 1500,
  creatorShareBps: 3000,
  fixedCostsMinor: 10000,
};

const result =
  economics.calculateEconomics(scenario);

assert.equal(result.grossSalesMinor, 99900);
assert.equal(result.refundedSalesMinor, 9990);
assert.equal(result.retainedSalesMinor, 89910);
assert.equal(result.distributionFeesMinor, 13487);
assert.equal(result.netReceiptsMinor, 76423);
assert.equal(result.creatorShareMinor, 22927);

assert.equal(
  result.contributionBeforeTaxMinor,
  43496
);

console.log('PASS: partner revenue calculations');

assert.throws(() =>
  economics.calculateEconomics({
    ...scenario,
    refundedUnits: 101,
  })
);

assert.throws(() =>
  economics.calculateEconomics({
    ...scenario,
    distributionFeeBps: 10001,
  })
);

assert.throws(() =>
  economics.calculateEconomics({
    ...scenario,
    recipientName: 'Unexpected personal data',
  })
);

assert.equal(
  economics.calculateEconomics({
    ...scenario,
    paidUnits: 0,
    refundedUnits: 0,
  }).contributionBeforeTaxMinor,
  -10000
);

console.log('PASS: invalid inputs and losses handled');

assert.equal(
  readiness.plausibleSdkKey(
    'goog_replace_with_your_android_public_key',
    'goog_'
  ),
  false
);

assert.equal(
  readiness.plausiblePublishedUrl(
    'https://example.com/privacy'
  ),
  false
);

assert.equal(
  readiness.plausiblePublishedUrl(
    'https://stillwater.example/terms'
  ),
  false
);

assert.equal(
  readiness.plausiblePublishedUrl(
    'http://localhost/privacy'
  ),
  false
);

console.log('PASS: placeholder configurations rejected');

const empty =
  readiness.inspectConfiguration({});

assert.ok(empty.some(item =>
  item.status === 'NOT_CONFIGURED'
));

const conflict =
  readiness.inspectConfiguration({
    EXPO_PUBLIC_ANDROID_OFFERS_ENABLED: 'true',
  });

assert.ok(conflict.some(item =>
  item.status === 'CONFIGURATION_CONFLICT'
));

assert.ok(empty.some(item =>
  item.status === 'MANUAL_VERIFICATION_REQUIRED'
));

console.log('PASS: readiness does not claim live billing verification');

console.log('COMMERCIAL INTEGRATION TESTS PASSED');
