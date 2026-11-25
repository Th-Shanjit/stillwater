const assert = require('node:assert/strict');
const toolkit = require('./programme-toolkit.cjs');

const creators = require('./creator-toolkit.cjs');
const materials = require('./host-materials.cjs');

const draft = creators.createDraft(
  'intentional_living',
  'example_creator',
  'Example Creator',
  'creator'
);

assert.equal(draft.version, 1);
assert.equal(draft.publisher.kind, 'creator');
assert.equal(draft.days.length, 1);
assert.equal(draft.days[0].steps.length, 4);

console.log('PASS: valid creator draft generated');

assert.throws(() => creators.createDraft(
  'sample',
  'stillwater',
  'Impersonated Stillwater',
  'creator'
));

assert.throws(() => creators.createDraft(
  'invalid/id',
  'publisher',
  'Publisher',
  'church'
));

console.log('PASS: invalid draft identities rejected');

const lock = toolkit.readEditionLock();

const review = creators.createReview(draft, lock);

assert.equal(
  review.status, 'pending_human_review'
);

assert.equal(review.matchesRegisteredEdition, false);
assert.ok(review.warnings.length > 0);

assert.ok(
  review.checklist.every(
    item => item.status === 'pending'
  )
);

console.log('PASS: structural validation does not approve publication');

const result = creators.checkEcosystem();
const programme = result.programme;

assert.equal(result.hostSessions, 3);

const registeredReview = creators.createReview(
  programme, lock
);

assert.equal(
  registeredReview.matchesRegisteredEdition,
  true
);

const changed = structuredClone(programme);
changed.title += ' changed';

assert.throws(() => creators.createReview(
  changed, lock
));

console.log('PASS: registered editions protected');

const url = materials.buildPublicInvitation(
  'https://example.com/share/'
);

assert.equal(
  url,
  'https://example.com/share/#kind=walk&id=three_quiet_evenings&v=1'
);

for (const invalid of [
  'http://example.com',
  'javascript:alert(1)',
  'https://example.com/#unexpected',
  'https://user@example.com',
  'https://example.com/?private=1',
]) {
  assert.throws(() =>
    materials.buildPublicInvitation(invalid)
  );
}

console.log('PASS: safe public invitation format');

assert.equal(
  materials.escapeHtml('<script>'),
  '&lt;script&gt;'
);

const poster = materials.buildPoster(
  programme, 'https://example.com/share/'
);

assert.ok(poster.includes('Three Quiet Evenings'));
assert.ok(poster.includes('Participation') ||
  poster.includes('participation'));
assert.ok(!poster.includes('<script'));

assert.throws(() => materials.buildPoster(
  { ...programme, audience: 'recovery' },
  'https://example.com/'
));

console.log('PASS: public programme poster generated');

for (const day of programme.days) {
  const guide = materials.buildFacilitatorGuide(
    programme, day.id
  );

  assert.ok(guide.includes('Session agenda'));
  assert.ok(guide.includes('14 minutes'));
  assert.ok(guide.includes('(optional)'));
  assert.ok(!guide.includes('<script'));

  for (const step of day.steps) {
    assert.ok(guide.includes(
      materials.escapeHtml(step.text)
    ));
  }
}

console.log('PASS: complete printable host guides');

assert.throws(() =>
  materials.buildFacilitatorGuide(
    programme, 'missing'
  )
);

console.log('PASS: unavailable host guide rejected');

console.log('CREATOR ECOSYSTEM TESTS PASSED');
