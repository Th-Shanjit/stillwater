const fs = require('node:fs');
const path = require('node:path');

const toolkit = require('./programme-toolkit.cjs');

const [command, input, version, output] =
  process.argv.slice(2);

try {
  if (command === 'check') {
    const editions = toolkit.checkCatalogue();

    for (const key of editions) {
      console.log('PASS: ' + key);
    }

    console.log(
      'CATALOGUE VERIFIED: ' +
      editions.length + ' registered edition(s)'
    );

  } else if (command === 'validate' && input) {
    const programme =
      toolkit.readProgrammePackage(input);

    const result =
      toolkit.assertEditionCompatible(
        programme,
        toolkit.readEditionLock()
      );

    console.log('VALID PROGRAMME PACKAGE');
    console.log('Title: ' + programme.title);
    console.log('Publisher: ' + programme.publisher.name);
    console.log('Edition: ' + result.key);
    console.log('Sessions: ' + programme.days.length);
    console.log('Filename: ' +
      toolkit.expectedFilename(programme)
    );
    console.log('SHA-256: ' + result.digest);

    console.log(
      result.registered
        ? 'Matches registered edition.'
        : 'New edition. Human review and registration required.'
    );

    console.log('\nRegistry entry:');

    console.log(
      JSON.stringify({
        [result.key]: result.digest,
      }, null, 2)
    );

    console.log(
      '\nStructural validation is not publication approval.'
    );

  } else if (
    command === 'export' &&
    input && version && output
  ) {
    if (!/^[1-9][0-9]*$/.test(version)) {
      throw new Error('Specify an exact content version.');
    }

    const programme = toolkit
      .loadCatalogue()
      .getProgramme(input, Number(version));

    if (!programme) {
      throw new Error('Requested edition unavailable.');
    }

    fs.writeFileSync(
      output,
      JSON.stringify(programme, null, 2) + '\n',
      {
        encoding: 'utf8',
        flag: 'wx',
      }
    );

    console.log('EXPORTED: ' + path.resolve(output));

  } else {
    throw new Error(
      'Usage:\n' +
      '  programme-publish.cjs check\n' +
      '  programme-publish.cjs validate <file.json>\n' +
      '  programme-publish.cjs export <id> <version> <output.json>'
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
