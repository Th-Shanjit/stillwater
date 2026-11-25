const fs = require('node:fs');
const ts = require('typescript');
const toolkit = require('./programme-toolkit.cjs');

function createDraft(
  programmeId,
  publisherId,
  publisherName,
  publisherKind
) {
  if (
    !['creator', 'church'].includes(publisherKind) ||
    publisherId === 'stillwater'
  ) {
    throw new Error('Invalid external publisher identity.');
  }

  return toolkit.loadEngine().parseProgramme({
    schemaVersion: 1,
    id: programmeId,
    version: 1,

    title: 'Draft programme title',

    description:
      'Replace with a clear description of the intended experience.',

    language: 'en',
    tradition: 'Christian',

    publisher: {
      id: publisherId,
      name: publisherName,
      kind: publisherKind,
    },

    audience: 'general',
    access: 'free',
    schedule: 'self_paced',

    days: [
      {
        id: 'day_one',
        title: 'Draft session title',
        description:
          'Describe the practical purpose of this session.',

        steps: [
          {
            id: 'day_one_guidance',
            kind: 'guidance',
            title: 'Introduction',
            text: 'Replace with original introductory guidance.',
            suggestedSeconds: 30,
            optional: false,
          },
          {
            id: 'day_one_action',
            kind: 'action',
            title: 'Practical next step',
            text: 'Replace with a small, achievable practical action.',
            suggestedSeconds: 60,
            optional: false,
          },
          {
            id: 'day_one_reflection',
            kind: 'reflection',
            title: 'Optional reflection',
            text: 'Replace with a voluntary reflection prompt.',
            suggestedSeconds: 30,
            optional: true,
          },
          {
            id: 'day_one_prayer',
            kind: 'prayer',
            title: 'Optional prayer',
            text: 'Replace with an original prayer.',
            suggestedSeconds: 30,
            optional: true,
          },
        ],
      },
    ],
  });
}

const REVIEW_ITEMS = [
  'Publisher identity and authority',
  'Original content and licensing',
  'Scripture translation permissions',
  'Theological suitability',
  'Clinical safety and safeguarding',
  'Non-coercive participation',
  'Accessibility and language quality',
  'Audio and artwork rights',
  'Privacy and personal-data review',
  'Access and scheduling compatibility',
  'Final editorial approval',
];

function createReview(programme, lock) {
  const clean = toolkit.loadEngine()
    .parseProgramme(programme);

  const edition = toolkit.assertEditionCompatible(
    clean, lock
  );

  const audioAssets = new Set();
  const warnings = [];

  for (const day of clean.days) {
    for (const step of day.steps) {
      if (step.audioAssetId) {
        audioAssets.add(step.audioAssetId);
      }

      if (/replace with|draft session|placeholder/i.test(
        step.title + ' ' + step.text
      )) {
        warnings.push(
          'Possible unfinished content: ' + step.id
        );
      }
    }
  }

  if (/^draft\b/i.test(clean.title)) {
    warnings.push('Programme title appears unfinished.');
  }

  if (clean.schedule !== 'self_paced') {
    warnings.push(
      'Daily scheduling is not supported by the current app.'
    );
  }

  if (clean.audience === 'recovery') {
    warnings.push(
      'Recovery content requires specialist review and is not automatically eligible for group hosting.'
    );
  }

  return {
    reviewSchemaVersion: 1,

    edition: edition.key,
    sha256: edition.digest,
    matchesRegisteredEdition: edition.registered,

    status: 'pending_human_review',

    title: clean.title,
    publisher: { ...clean.publisher },

    sessions: clean.days.length,
    audience: clean.audience,
    access: clean.access,
    schedule: clean.schedule,

    audioAssets: [...audioAssets].sort(),
    warnings,

    checklist: REVIEW_ITEMS.map(item => ({
      item,
      status: 'pending',
    })),
  };
}

function loadHostGuides() {
  const compiled = ts.transpileModule(
    fs.readFileSync('content/hostGuides.ts', 'utf8'),
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

function checkEcosystem() {
  const editions = toolkit.checkCatalogue();

  const programme = toolkit.loadCatalogue()
    .getProgramme('three_quiet_evenings', 1);

  if (
    !programme ||
    programme.access !== 'free' ||
    programme.audience !== 'general' ||
    programme.schedule !== 'self_paced'
  ) {
    throw new Error('Approved public programme unavailable.');
  }

  const hosts = loadHostGuides();

  for (const day of programme.days) {
    const guide = hosts.buildHostGuide(
      programme, day.id
    );

    if (!guide) {
      throw new Error('Missing host guide: ' + day.id);
    }
  }

  return {
    editions,
    programme,
    hostSessions: programme.days.length,
  };
}

module.exports = {
  createDraft,
  createReview,
  loadHostGuides,
  checkEcosystem,
};
