const { createServer } = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { Buffer } = require('node:buffer');

const {
  randomBytes,
  randomUUID,
  createHash,
  timingSafeEqual,
} = require('node:crypto');

const PROGRAMME_ID = 'three_quiet_evenings';
const PROGRAMME_VERSION = 1;

const DAYS = [
  'make_space',
  'reconnect',
  'carry_forward',
];

const LIFETIME = 30 * 24 * 60 * 60 * 1000;

const SCHEMA = [
  'PRAGMA foreign_keys = ON;',
  'CREATE TABLE IF NOT EXISTS circles (',
  '  id TEXT PRIMARY KEY,',
  '  mode TEXT NOT NULL CHECK(mode IN (\'pair\', \'circle\')),',
  '  invite_hash TEXT UNIQUE,',
  '  expires_at INTEGER NOT NULL',
  ');',
  'CREATE TABLE IF NOT EXISTS circle_members (',
  '  token_hash TEXT PRIMARY KEY,',
  '  circle_id TEXT NOT NULL REFERENCES circles(id) ON DELETE CASCADE,',
  '  owner INTEGER NOT NULL CHECK(owner IN (0,1))',
  ');',
  'CREATE TABLE IF NOT EXISTS circle_checkins (',
  '  member_hash TEXT NOT NULL REFERENCES circle_members(token_hash) ON DELETE CASCADE,',
  '  day_id TEXT NOT NULL,',
  '  PRIMARY KEY(member_hash, day_id)',
  ');',
].join('\n');

function hash(value) {
  return createHash('sha256')
    .update(value, 'utf8').digest('hex');
}

function token() {
  return randomBytes(32).toString('hex');
}

function validToken(value) {
  return typeof value === 'string' &&
    /^[a-f0-9]{64}$/.test(value);
}

function fail(status) {
  const error = new Error('Circle request rejected');
  error.status = status;
  throw error;
}

function equalSecret(a, b) {
  return timingSafeEqual(
    Buffer.from(hash(a), 'hex'),
    Buffer.from(hash(b), 'hex')
  );
}

function makeService(db, pilotCode, now = Date.now) {
  if (typeof pilotCode !== 'string' ||
      pilotCode.length < 12 ||
      pilotCode.length > 128) {
    throw new Error('A private pilot code is required.');
  }

  db.exec(SCHEMA);

  function purge() {
    db.prepare(
      'DELETE FROM circles WHERE expires_at <= ?'
    ).run(now());
  }

  function member(secret) {
    return db.prepare(
      'SELECT * FROM circle_members WHERE token_hash = ?'
    ).get(hash(secret));
  }

  function snapshot(m) {
    const circle = db.prepare(
      'SELECT * FROM circles WHERE id = ?'
    ).get(m.circle_id);

    if (!circle) fail(404);

    const count = db.prepare(
      'SELECT COUNT(*) AS n FROM circle_members WHERE circle_id = ?'
    ).get(circle.id).n;

    const checkins = DAYS.map(dayId => {
      const total = db.prepare(
        'SELECT COUNT(*) AS n FROM circle_checkins c ' +
        'JOIN circle_members m ON m.token_hash = c.member_hash ' +
        'WHERE m.circle_id = ? AND c.day_id = ?'
      ).get(circle.id, dayId).n;

      const mine = Boolean(db.prepare(
        'SELECT 1 FROM circle_checkins WHERE member_hash = ? AND day_id = ?'
      ).get(m.token_hash, dayId));

      return { dayId, count: total, mine };
    });

    return {
      programmeId: PROGRAMME_ID,
      version: PROGRAMME_VERSION,
      mode: circle.mode,
      members: count,
      capacity: circle.mode === 'pair' ? 2 : 8,
      owner: m.owner === 1,
      expiresAt: new Date(circle.expires_at).toISOString(),
      checkins,
    };
  }

  const fields = {
    create: ['token', 'mode', 'pilotCode'],
    join: ['token', 'invite'],
    state: ['token'],
    invite: ['token'],
    revoke: ['token'],
    checkin: ['token', 'dayId', 'shared'],
    leave: ['token'],
  };

  function handle(action, body) {
    if (!Object.hasOwn(fields, action)) fail(404);

    if (!body || typeof body !== 'object' ||
        Array.isArray(body) ||
        Object.keys(body).some(
          key => !fields[action].includes(key)
        ) ||
        !validToken(body.token)) {
      fail(400);
    }

    purge();

    db.exec('BEGIN IMMEDIATE');

    try {
      const result = execute(action, body);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  function execute(action, body) {
    let m = member(body.token);
    const memberHash = hash(body.token);

    if (action === 'create') {
      if (!['pair', 'circle'].includes(body.mode)) fail(400);

      if (typeof body.pilotCode !== 'string' ||
          body.pilotCode.length > 128 ||
          !equalSecret(body.pilotCode, pilotCode)) {
        fail(403);
      }

      if (m) return snapshot(m);

      const total = db.prepare(
        'SELECT COUNT(*) AS n FROM circles'
      ).get().n;

      if (total >= 100) fail(503);

      const id = randomUUID();

      db.prepare(
        'INSERT INTO circles VALUES (?, ?, NULL, ?)'
      ).run(id, body.mode, now() + LIFETIME);

      db.prepare(
        'INSERT INTO circle_members VALUES (?, ?, 1)'
      ).run(memberHash, id);

      return snapshot(member(body.token));
    }

    if (action === 'join') {
      if (!validToken(body.invite)) fail(400);

      const circle = db.prepare(
        'SELECT * FROM circles WHERE invite_hash = ?'
      ).get(hash(body.invite));

      if (!circle) fail(404);

      if (m) {
        if (m.circle_id !== circle.id) fail(409);
        return snapshot(m);
      }

      const count = db.prepare(
        'SELECT COUNT(*) AS n FROM circle_members WHERE circle_id = ?'
      ).get(circle.id).n;

      if (count >= (circle.mode === 'pair' ? 2 : 8)) {
        fail(409);
      }

      db.prepare(
        'INSERT INTO circle_members VALUES (?, ?, 0)'
      ).run(memberHash, circle.id);

      return snapshot(member(body.token));
    }

    if (action === 'leave' && !m) {
      return { ok: true };
    }

    if (!m) fail(404);

    if (action === 'state') return snapshot(m);

    if (action === 'invite' || action === 'revoke') {
      if (m.owner !== 1) fail(403);

      const code = action === 'invite' ? token() : null;

      db.prepare(
        'UPDATE circles SET invite_hash = ? WHERE id = ?'
      ).run(code ? hash(code) : null, m.circle_id);

      return { code };
    }

    if (action === 'checkin') {
      if (!DAYS.includes(body.dayId) ||
          typeof body.shared !== 'boolean') {
        fail(400);
      }

      if (body.shared) {
        db.prepare(
          'INSERT OR IGNORE INTO circle_checkins VALUES (?, ?)'
        ).run(memberHash, body.dayId);
      } else {
        db.prepare(
          'DELETE FROM circle_checkins WHERE member_hash = ? AND day_id = ?'
        ).run(memberHash, body.dayId);
      }

      return snapshot(m);
    }

    if (action === 'leave') {
      if (m.owner === 1) {
        db.prepare(
          'DELETE FROM circles WHERE id = ?'
        ).run(m.circle_id);
      } else {
        db.prepare(
          'DELETE FROM circle_members WHERE token_hash = ?'
        ).run(memberHash);
      }

      return { ok: true };
    }

    fail(404);
  }

  return { handle, purge };
}

function makeHttpServer(service) {
  let windowStart = Date.now();
  let requests = 0;

  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    function send(status, data) {
      res.writeHead(status);
      res.end(JSON.stringify(data));
    }

    try {
      if (Date.now() - windowStart >= 60000) {
        windowStart = Date.now();
        requests = 0;
      }

      if (++requests > 120) return send(429, { error: 'rate_limit' });

      if (req.method !== 'POST' ||
          !req.url ||
          !/^\/v1\/[a-z]+$/.test(req.url)) {
        return send(404, { error: 'unavailable' });
      }

      if (req.headers['content-type'] !== 'application/json') {
        return send(415, { error: 'invalid_content_type' });
      }

      const chunks = [];
      let size = 0;

      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4096) fail(413);
        chunks.push(chunk);
      }

      let body;

      try {
        body = JSON.parse(
          Buffer.concat(chunks).toString('utf8')
        );
      } catch {
        fail(400);
      }

      const result = service.handle(
        req.url.slice(4), body
      );

      send(200, result);

    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        send(error.status || 500, {
          error: 'request_rejected',
        });
      }
    }
  });
}

if (require.main === module) {
  const databasePath = process.env.CIRCLES_DB;

  if (!databasePath) {
    throw new Error('Set CIRCLES_DB outside the app repository.');
  }

  const db = new DatabaseSync(databasePath);

  const service = makeService(
    db, process.env.CIRCLES_PILOT_CODE
  );

  service.purge();

  setInterval(() => service.purge(), 60000).unref();

  const server = makeHttpServer(service);

  server.requestTimeout = 15000;
  server.headersTimeout = 10000;

  server.listen(8787, '127.0.0.1', () => {
    console.log('Stillwater Circle pilot listening on localhost:8787');
  });
}

module.exports = {
  makeService,
  makeHttpServer,
};
