const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');

/* global __dirname: readonly */
const ROOT = path.resolve(__dirname, '..');

const PACKAGE_DIR = path.join(
  ROOT, 'assets', 'programmes'
);

const LOCK_FILE = path.join(
  ROOT, 'assets', 'programme-editions.lock.json'
);

const MAX_PACKAGE_BYTES = 512 * 1024;

function loadModule(file, resolveImport) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(ROOT, file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }
  ).outputText;

  const exports = {};

  new Function(
    'exports',
    'require',
    compiled
  )(exports, resolveImport);

  return exports;
}

function loadEngine() {
  return loadModule(
    'content/programme.ts',
    name => {
      throw new Error('Unexpected engine import: ' + name);
    }
  );
}

function readProgrammePackage(file) {
  const size = fs.statSync(file).size;

  if (size > MAX_PACKAGE_BYTES) {
    throw new Error('Programme exceeds the 512 KiB limit.');
  }

  const bytes = fs.readFileSync(file);

  if (bytes.length > MAX_PACKAGE_BYTES) {
    throw new Error('Programme exceeds the 512 KiB limit.');
  }

  const source = new TextDecoder(
    'utf-8',
    { fatal: true }
  ).decode(bytes);

  let raw;

  try {
    raw = JSON.parse(source);
  } catch {
    throw new Error('Programme package contains invalid JSON.');
  }

  return loadEngine().parseProgramme(raw);
}

function loadCatalogue() {
  const engine = loadEngine();

  return loadModule(
    'content/programmeCatalog.ts',
    name => {
      if (name === './programme') {
        return engine;
      }

      const match = name.match(
        /^\.\.\/assets\/programmes\/([a-z0-9_-]+\.v[1-9][0-9]*\.json)$/
      );

      if (!match) {
        throw new Error('Unexpected catalogue import: ' + name);
      }

      return readProgrammePackage(
        path.join(PACKAGE_DIR, match[1])
      );
    }
  );
}

function editionFingerprint(value) {
  const programme =
    loadEngine().parseProgramme(value);

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(programme), 'utf8')
    .digest('hex');
}

function readEditionLock() {
  const lock = JSON.parse(
    fs.readFileSync(LOCK_FILE, 'utf8')
  );

  if (
    !lock ||
    typeof lock !== 'object' ||
    Array.isArray(lock)
  ) {
    throw new Error('Invalid edition registry.');
  }

  for (const [key, digest] of Object.entries(lock)) {
    if (
      !/^[a-z0-9][a-z0-9_-]*:[1-9][0-9]*$/.test(key) ||
      typeof digest !== 'string' ||
      !/^[a-f0-9]{64}$/.test(digest)
    ) {
      throw new Error('Invalid edition registry entry.');
    }
  }

  return lock;
}

function assertEditionCompatible(programme, lock) {
  const key = loadEngine().programmeKey(programme);

  const digest = editionFingerprint(programme);

  if (
    Object.hasOwn(lock, key) &&
    lock[key] !== digest
  ) {
    throw new Error(
      'Edition ' + key +
      ' has changed. Publish a new version instead.'
    );
  }

  return {
    key,
    digest,
    registered: Object.hasOwn(lock, key),
  };
}

function expectedFilename(programme) {
  return programme.id +
    '.v' + programme.version + '.json';
}

function checkCatalogue() {
  const lock = readEditionLock();
  const engine = loadEngine();

  const registered =
    loadCatalogue().listProgrammes();

  const files = fs.readdirSync(PACKAGE_DIR)
    .filter(file => file.endsWith('.json'))
    .sort();

  const seen = new Set();

  for (const file of files) {
    const programme = readProgrammePackage(
      path.join(PACKAGE_DIR, file)
    );

    if (file !== expectedFilename(programme)) {
      throw new Error(
        'Incorrect package filename: ' + file
      );
    }

    const result = assertEditionCompatible(
      programme,
      lock
    );

    if (!result.registered) {
      throw new Error(
        'Unregistered package: ' + result.key
      );
    }

    if (seen.has(result.key)) {
      throw new Error(
        'Duplicate edition: ' + result.key
      );
    }

    const bundled = registered.find(item =>
      engine.programmeKey(item) === result.key
    );

    if (
      !bundled ||
      editionFingerprint(bundled) !== result.digest
    ) {
      throw new Error(
        'Catalogue registration mismatch: ' +
        result.key
      );
    }

    seen.add(result.key);
  }

  for (const key of Object.keys(lock)) {
    if (!seen.has(key)) {
      throw new Error(
        'Previously registered edition missing: ' + key
      );
    }
  }

  if (registered.length !== seen.size) {
    throw new Error('Catalogue contains unexpected entries.');
  }

  return [...seen].sort();
}

module.exports = {
  MAX_PACKAGE_BYTES,
  loadEngine,
  loadCatalogue,
  readProgrammePackage,
  editionFingerprint,
  readEditionLock,
  assertEditionCompatible,
  expectedFilename,
  checkCatalogue,
};
