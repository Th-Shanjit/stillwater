const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes } = require('node:crypto');
const { makeService } = require('../server/circles.cjs');
const toolkit = require('./programme-toolkit.cjs');

const programme = toolkit.loadCatalogue()
  .getProgramme('three_quiet_evenings', 1);

assert.ok(programme);
assert.equal(programme.access, 'free');
assert.equal(programme.audience, 'general');

assert.deepEqual(
  programme.days.map(day => day.id),
  ['make_space', 'reconnect', 'carry_forward']
);

const db = new DatabaseSync(':memory:');

let now = Date.now();

const service = makeService(
  db, 'test-pilot-code', () => now
);

const makeToken = () => randomBytes(32).toString('hex');

const owner = makeToken();
const friend = makeToken();
const outsider = makeToken();

const call = (action, token, data = {}) =>
  service.handle(action, { token, ...data });

try {
  assert.throws(() => call('create', owner, {
    mode: 'pair',
    pilotCode: 'wrong',
  }));

  const created = call('create', owner, {
    mode: 'pair',
    pilotCode: 'test-pilot-code',
  });

  assert.equal(created.members, 1);
  assert.equal(created.capacity, 2);
  assert.equal(created.owner, true);

  console.log('PASS: authorised anonymous creation');

  const invitation = call('invite', owner).code;

  const joined = call('join', friend, {
    invite: invitation,
  });

  assert.equal(joined.members, 2);
  assert.equal(joined.owner, false);

  assert.equal(call('join', friend, {
    invite: invitation,
  }).members, 2);

  assert.throws(() => call('join', outsider, {
    invite: invitation,
  }));

  console.log('PASS: pair capacity and duplicate membership');

  assert.throws(() => call('state', outsider));
  assert.throws(() => call('invite', friend));

  console.log('PASS: unauthorised membership access rejected');

  assert.equal(
    call('state', owner).checkins[0].count, 0
  );

  call('checkin', friend, {
    dayId: 'make_space',
    shared: true,
  });

  call('checkin', friend, {
    dayId: 'make_space',
    shared: true,
  });

  const state = call('state', owner);

  assert.equal(state.checkins[0].count, 1);
  assert.equal(state.checkins[0].mine, false);

  assert.ok(!JSON.stringify(state).includes(friend));
  assert.ok(!JSON.stringify(state).includes(invitation));

  console.log('PASS: voluntary aggregate check-in');

  call('checkin', friend, {
    dayId: 'make_space',
    shared: false,
  });

  assert.equal(
    call('state', owner).checkins[0].count, 0
  );

  assert.throws(() => call('checkin', friend, {
    dayId: 'make_space',
    shared: true,
    recoveryHistory: [],
  }));

  console.log('PASS: consent withdrawal and strict payloads');

  const second = call('invite', owner).code;

  assert.notEqual(second, invitation);

  call('leave', friend);

  assert.throws(() => call('join', outsider, {
    invite: invitation,
  }));

  call('join', outsider, { invite: second });

  call('checkin', outsider, {
    dayId: 'make_space',
    shared: true,
  });

  call('leave', outsider);

  assert.equal(call('state', owner).members, 1);
  assert.equal(call('state', owner).checkins[0].count, 0);

  call('revoke', owner);

  assert.throws(() => call('join', outsider, {
    invite: second,
  }));

  console.log('PASS: invitation revocation and member removal');

  call('leave', owner);

  assert.throws(() => call('state', owner));

  console.log('PASS: owner closure removes membership');

  call('create', owner, {
    mode: 'circle',
    pilotCode: 'test-pilot-code',
  });

  const circleInvite = call('invite', owner).code;

  for (let i = 0; i < 7; i++) {
    call('join', makeToken(), { invite: circleInvite });
  }

  assert.equal(call('state', owner).members, 8);

  assert.throws(() => call('join', makeToken(), {
    invite: circleInvite,
  }));

  console.log('PASS: Circle capacity');

  now += 31 * 24 * 60 * 60 * 1000;

  service.purge();

  assert.throws(() => call('state', owner));

  assert.equal(db.prepare(
    'SELECT COUNT(*) AS n FROM circle_members'
  ).get().n, 0);

  assert.equal(db.prepare(
    'SELECT COUNT(*) AS n FROM circle_checkins'
  ).get().n, 0);

  console.log('PASS: expired membership cleanup');

  console.log('CIRCLE PARTICIPATION TESTS PASSED');

} finally {
  db.close();
}
