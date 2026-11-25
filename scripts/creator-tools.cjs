const fs = require('node:fs');
const path = require('node:path');

const toolkit = require('./programme-toolkit.cjs');
const creators = require('./creator-toolkit.cjs');
const materials = require('./host-materials.cjs');

const [command, ...args] = process.argv.slice(2);

function output(file, contents) {
  if (!file) throw new Error('Output path required.');

  fs.writeFileSync(file, contents + '\n', {
    encoding: 'utf8',
    flag: 'wx',
  });

  console.log('CREATED: ' + path.resolve(file));
}

try {
  if (command === 'draft' && args.length === 5) {
    const [id, publisherId, name, kind, destination] = args;

    const draft = creators.createDraft(
      id, publisherId, name, kind
    );

    output(
      destination,
      JSON.stringify(draft, null, 2)
    );

    console.log(
      'DRAFT ONLY: Replace sample content before submission.'
    );

  } else if (
    command === 'review' &&
    args.length === 2
  ) {
    const [source, destination] = args;

    const programme =
      toolkit.readProgrammePackage(source);

    const review = creators.createReview(
      programme,
      toolkit.readEditionLock()
    );

    output(
      destination,
      JSON.stringify(review, null, 2)
    );

    console.log('STATUS: PENDING HUMAN REVIEW');

    for (const warning of review.warnings) {
      console.log('REVIEW NOTE: ' + warning);
    }

    console.log('No catalogue changes were made.');

  } else if (
    command === 'poster' &&
    args.length === 2
  ) {
    const [base, destination] = args;

    const result = creators.checkEcosystem();

    output(
      destination,
      materials.buildPoster(
        result.programme, base
      )
    );

    console.log(
      'Verify the supplied HTTPS address is deployed before distribution.'
    );

  } else if (
    command === 'guide' &&
    args.length === 2
  ) {
    const [dayId, destination] = args;

    const result = creators.checkEcosystem();

    output(
      destination,
      materials.buildFacilitatorGuide(
        result.programme, dayId
      )
    );

  } else if (command === 'check' && args.length === 0) {
    const result = creators.checkEcosystem();

    console.log(
      'Registered programme editions: ' +
      result.editions.length
    );

    console.log(
      'Approved host sessions: ' +
      result.hostSessions
    );

    console.log('CREATOR ECOSYSTEM VERIFIED');

  } else {
    throw new Error([
      'Usage:',
      '  creator-tools.cjs draft <id> <publisher-id> <name> <creator|church> <output.json>',
      '  creator-tools.cjs review <package.json> <review.json>',
      '  creator-tools.cjs poster <https-sharing-address> <poster.html>',
      '  creator-tools.cjs guide <day-id> <guide.html>',
      '  creator-tools.cjs check',
    ].join('\n'));
  }

} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
