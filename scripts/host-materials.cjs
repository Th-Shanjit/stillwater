const { URL } = require('node:url');
const creators = require('./creator-toolkit.cjs');

function escapeHtml(value) {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return String(value).replace(
    /[&<>"']/g,
    character => entities[character]
  );
}

function buildPublicInvitation(base) {
  if (
    typeof base !== 'string' ||
    !/^https:\/\/[a-z0-9.-]+(?:\/[a-zA-Z0-9._~/-]*)?$/i.test(base)
  ) {
    throw new Error('Supply a plain HTTPS sharing site address.');
  }

  const url = new URL(base);

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Invalid public sharing address.');
  }

  return url.href +
    '#kind=walk&id=three_quiet_evenings&v=1';
}

function page(title, body, theme = 'light') {
  const dark = theme === 'dark';

  return [
    '<!doctype html>',
    '<html lang="en"><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="referrer" content="no-referrer">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">',
    '<title>' + escapeHtml(title) + '</title>',
    '<style>',
    '*{box-sizing:border-box}',
    'body{margin:0;background:#e5e8df;font:16px/1.55 system-ui,sans-serif;color:#19332e}',
    'main{max-width:760px;margin:24px auto;padding:40px;background:' +
      (dark ? '#193b35;color:#f6f3eb' : '#fffcf6') +
      ';border-radius:18px}',
    'h1{font:clamp(32px,7vw,52px)/1.1 Georgia,serif;margin:20px 0}',
    'h2{font:27px Georgia,serif;margin:24px 0 10px}',
    'p{margin:12px 0}',
    '.brand{font:28px Georgia,serif}',
    '.label{font-size:12px;letter-spacing:2px;text-transform:uppercase}',
    '.art{width:100%;display:block;margin:22px 0;border-radius:12px}',
    '.item{padding:16px 0;border-top:1px solid #a6b5a6;break-inside:avoid}',
    '.link{display:block;overflow-wrap:anywhere;background:#dce6d9;color:#193b35;padding:16px;border-radius:10px}',
    'a{color:inherit}',
    '@page{size:A4;margin:14mm}',
    '@media print{body{background:white}main{max-width:none;margin:0;padding:0;border-radius:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}}',
    '</style></head><body><main>',
    body,
    '</main></body></html>',
  ].join('\n');
}

function buildPoster(programme, base) {
  if (
    programme.id !== 'three_quiet_evenings' ||
    programme.version !== 1 ||
    programme.access !== 'free' ||
    programme.audience !== 'general' ||
    programme.schedule !== 'self_paced'
  ) {
    throw new Error('Programme is not approved for this public invitation.');
  }

  const url = buildPublicInvitation(base);

  const artwork = [
    '<svg class="art" viewBox="0 0 340 160" aria-hidden="true">',
    '<rect width="340" height="160" fill="#36534D"/>',
    '<circle cx="245" cy="39" r="22" fill="#D6B47D"/>',
    '<path d="M0 90 Q60 12 143 82 T340 60 V160 H0Z" fill="#779A8B"/>',
    '<path d="M0 110 Q65 48 180 100 T340 90 V160 H0Z" fill="#48645A"/>',
    '<path d="M0 126 Q80 99 180 121 T340 114 V160 H0Z" fill="#193B35"/>',
    '<path d="M212 135 H268 M194 145 H286" stroke="#D6B47D"/>',
    '</svg>',
  ].join('');

  const body = [
    '<div class="brand">stillwater.</div>',
    artwork,
    '<div class="label">An invitation to stillness</div>',
    '<h1>' + escapeHtml(programme.title) + '</h1>',
    '<p>' + escapeHtml(programme.description) + '</p>',
    '<p>' + programme.days.length +
      ' sessions · Free · Self-paced</p>',
    '<h2>Make a little room for yourself.</h2>',
    '<p>Explore practical, faith-centred moments for everyday life.</p>',
    '<p>Prayer and participation are voluntary.</p>',
    '<div class="link">',
    '<strong>Explore the programme</strong><br>',
    '<a href="' + escapeHtml(url) + '">' +
      escapeHtml(url) + '</a>',
    '</div>',
    '<p>Open the invitation in your browser. Stillwater is required to enrol.</p>',
  ].join('\n');

  return page(programme.title, body, 'dark');
}

function buildFacilitatorGuide(programme, dayId) {
  const hosts = creators.loadHostGuides();

  const guide = hosts.buildHostGuide(
    programme, dayId
  );

  const day = programme.days.find(
    item => item.id === dayId
  );

  if (!guide || !day) {
    throw new Error('Approved host session unavailable.');
  }

  const agenda = guide.agenda.map((item, index) => {
    const section = [
      '<section class="item">',
      '<strong>' + (index + 1) + '. ' +
        escapeHtml(item.title) + '</strong>',
      '<p>' + item.suggestedMinutes +
        ' minutes suggested</p>',
      '<p>' + escapeHtml(item.instructions) + '</p>',
    ];

    if (item.kind === 'programme') {
      for (const step of day.steps) {
        section.push(
          '<p><strong>' + escapeHtml(step.title) +
          (step.optional ? ' (optional)' : '') +
          '</strong><br>' +
          escapeHtml(step.text) + '</p>'
        );
      }
    }

    section.push('</section>');

    return section.join('\n');
  }).join('\n');

  const body = [
    '<div class="brand">stillwater.</div>',
    '<div class="label">Host session guide</div>',
    '<h1>' + escapeHtml(day.title) + '</h1>',
    '<p>' + escapeHtml(programme.title) +
      ' · Edition ' + programme.version + '</p>',
    '<p>Approximately ' +
      hosts.hostGuideMinutes(guide) + ' minutes</p>',
    '<h2>Preparation</h2>',
    '<p>' + escapeHtml(guide.preparation) + '</p>',
    '<h2>Session agenda</h2>',
    agenda,
    '<p>Participation is voluntary. Avoid requesting private recovery information. Follow appropriate safeguarding procedures.</p>',
  ].join('\n');

  return page(day.title, body);
}

module.exports = {
  escapeHtml,
  buildPublicInvitation,
  buildPoster,
  buildFacilitatorGuide,
};
