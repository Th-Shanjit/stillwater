const fs = require('node:fs');
const assert = require('node:assert/strict');
const toolkit = require('./programme-toolkit.cjs');

const moment = JSON.parse(
  fs.readFileSync('assets/content/shared_moment.json', 'utf8')
);

assert.equal(moment.id, 'little_room');
assert.equal(moment.version, 1);

const programme = toolkit.loadCatalogue()
  .getProgramme('three_quiet_evenings', 1);

assert.ok(programme);
assert.equal(programme.access, 'free');
assert.equal(programme.audience, 'general');
assert.equal(programme.schedule, 'self_paced');

// Only explicitly public programme metadata is exported.
const publicData = {
  moment,
  walk: {
    id: programme.id,
    version: programme.version,
    title: programme.title,
    description: programme.description,
    days: programme.days.map(day => ({
      title: day.title,
      description: day.description,
    })),
  },
};

const template = fs.readFileSync(
  'web-share/template.html', 'utf8'
);

const json = JSON.stringify(publicData)
  .replace(/</g, '\\u003c');

assert.equal(
  template.split('__PUBLIC_DATA__').length, 2
);

const html = template.replace(
  '__PUBLIC_DATA__', () => json
);

const destination = 'web-share/site/index.html';

if (process.argv.includes('--check')) {
  assert.equal(
    fs.readFileSync(destination, 'utf8'),
    html,
    'Public sharing site needs to be regenerated.'
  );
  console.log('PASS: public website matches approved content');
} else {
  fs.mkdirSync('web-share/site', { recursive: true });
  fs.writeFileSync(destination, html, 'utf8');
  console.log('SHARING WEBSITE BUILT: ' + destination);
}
