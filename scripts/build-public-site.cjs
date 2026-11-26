const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateIdentity(input) {
  const operator = input.operator?.trim();
  const email = input.email?.trim();
  const date = input.date?.trim();

  if (
    !operator ||
    operator.length > 150 ||
    /placeholder|your name|example/i.test(operator)
  ) {
    throw new Error('Enter the actual public developer identity.');
  }

  if (
    !email ||
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) ||
    /@example\./i.test(email)
  ) {
    throw new Error('Enter a real monitored support email.');
  }

  if (
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date))
  ) {
    throw new Error('Enter a valid policy date.');
  }

  return { operator, email, date };
}

const css = `
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #F6F3EB;
  color: #19332E;
  font: 17px/1.7 system-ui, sans-serif;
}
header, main, footer {
  max-width: 860px;
  margin: auto;
  padding: 24px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.brand {
  font: 32px Georgia, serif;
  text-decoration: none;
  color: #193B35;
}
nav {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
a { color: #193B35; }
h1, h2, h3 { line-height: 1.25; }
h1 {
  font: 48px/1.12 Georgia, serif;
  margin: 18px 0;
}
h2 { font-size: 24px; margin-top: 30px; }
h3 { font-size: 19px; }
p { margin: 12px 0 20px; }
.muted { color: #48645A; }
.eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.4px;
}
.card {
  background: #FFFCF6;
  border: 1px solid #C9D3C6;
  border-radius: 20px;
  padding: 24px;
  margin: 18px 0;
}
.hero {
  background: #193B35;
  color: #FFFFFF;
  border-radius: 28px;
  padding: 32px;
}
.hero p { color: #DCE6D9; }
.art {
  width: 100%;
  display: block;
  border-radius: 18px;
  margin-top: 22px;
}
.cta {
  display: inline-block;
  background: #DCE6D9;
  color: #193B35;
  padding: 13px 20px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
}
.notice {
  border: 1px solid #994E3E;
  color: #994E3E;
  padding: 14px;
  border-radius: 12px;
}
footer {
  border-top: 1px solid #C9D3C6;
  color: #48645A;
  font-size: 14px;
}
:focus-visible {
  outline: 3px solid #B88A50;
  outline-offset: 4px;
}
@media(max-width:600px) {
  h1 { font-size: 36px; }
  header, main, footer { padding: 20px; }
  .hero, .card { padding: 22px; }
}
`;

function page(title, body, identity, draft) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#F6F3EB">
<meta name="robots" content="${draft ? 'noindex,nofollow' : 'index,follow'}">
<meta http-equiv="Content-Security-Policy"
content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)} | Stillwater</title>
<style>${css}</style>
</head>
<body>
<header>
<a class="brand" href="/">stillwater.</a>
<nav aria-label="Main navigation">
<a href="/privacy/">Privacy</a>
<a href="/terms/">Terms</a>
<a href="/support/">Support</a>
</nav>
</header>
<main>
${draft ? '<p class="notice">DRAFT - review before public deployment.</p>' : ''}
${body}
</main>
<footer>
<p>Stillwater · ${escapeHtml(identity.operator)}</p>
<nav aria-label="Footer navigation">
<a href="/">Home</a>
<a href="/privacy/">Privacy policy</a>
<a href="/terms/">Terms of use</a>
<a href="/support/">Support</a>
</nav>
</footer>
</body>
</html>`;
}

function renderSite(identity, draft) {
  const operator = escapeHtml(identity.operator);
  const email = escapeHtml(identity.email);
  const date = escapeHtml(identity.date);

  const contact = `<a href="mailto:${email}">${email}</a>`;

  const landing = `
<section class="hero">
<p class="eyebrow">CHRISTIAN SUPPORT FOR EVERYDAY LIFE</p>
<h1>Make a little room for stillness.</h1>
<p>Private, practical support for changing unwanted
digital habits and building a more intentional rhythm.</p>
<a class="cta" href="/share/">Experience a quiet moment</a>
<svg class="art" viewBox="0 0 640 220" aria-hidden="true">
<rect width="640" height="220" fill="#DCE6D9"/>
<circle cx="485" cy="60" r="32" fill="#D6B47D"/>
<path d="M0 130 Q130 20 320 114 T640 95 V220 H0Z"
fill="#ABC0AE"/>
<path d="M0 150 Q140 76 330 145 T640 130 V220 H0Z"
fill="#779A8B"/>
<path d="M0 180 Q190 138 355 181 T640 166 V220 H0Z"
fill="#193B35"/>
</svg>
</section>

<section class="card">
<h2>Help for the moment you are in</h2>
<p>Short grounding exercises and practical next steps.
Support after setbacks without punitive streaks.</p>
</section>

<section class="card">
<h2>Build your own rhythm</h2>
<p>Personal plans, quiet reminders, morning preparation
and optional Christian reflection.</p>
</section>

<section class="card">
<h2>Private by design</h2>
<p>No account is required for personal recovery.
Your personal records are stored on your device.
Optional store services handle membership verification.</p>
<a href="/privacy/">Read how your data is handled</a>
</section>

<section class="card">
<h2>Availability</h2>
<p>Stillwater is being prepared for Android testing.
Public availability will be announced after review.</p>
</section>

<p class="muted">Stillwater is a self-help and spiritual
reflection tool for adults. It is not a medical device,
diagnostic service, therapy or emergency service.</p>`;

  const privacy = `
<h1>Privacy policy</h1>
<p>Policy date: ${date}</p>
<p>Stillwater is operated by ${operator}.
Privacy contact: ${contact}.</p>

<h2>1. Personal records on your device</h2>
<p>Stillwater stores information needed for personal
features locally. This may include recovery check-ins,
practice activity, preparation windows, personal plans,
reflection records, trusted contact details, programme
progress and preferences.</p>
<p>Some information may be sensitive, including information
about personal habits, wellbeing and religious preferences.</p>
<p>The personal recovery database is not intentionally
uploaded to Stillwater servers or RevenueCat.
The current release does not use advertising or
behavioural advertising integrations.</p>

<h2>2. Device permissions</h2>
<p>Optional device authentication protects access to the
interface. The operating system performs authentication;
Stillwater receives the authentication result rather
than storing biometric templates.</p>
<p>Optional notifications provide scheduled reminders.
Audio practices use playback rather than microphone recording.</p>

<h2>3. Local storage and protection</h2>
<p>Personal records are stored in a local application
database. Optional app locking and screen protection
provide additional safeguards.</p>
<p>The database does not currently use independent
SQLCipher encryption. Device security, operating-system
backups and external copies can affect confidentiality.</p>

<h2>4. Purchases and membership</h2>
<p>When store integration is configured, Google Play and
RevenueCat process information necessary to verify purchases
and membership access. RevenueCat may assign an anonymous
application identifier and process purchase history,
subscription status and related technical information.</p>
<p>The payment method is handled by the applicable app store.
Stillwater does not directly receive your card details.
Purchase processing and store records are also governed
by the providers' respective privacy policies.</p>
<p><a href="https://www.revenuecat.com/privacy/">
RevenueCat privacy policy</a></p>
<p><a href="https://policies.google.com/privacy">
Google privacy policy</a></p>

<h2>5. Sharing and connected participation</h2>
<p>Public shared experiences contain public content rather
than your personal recovery records.</p>
<p>Sharing through another application is subject to the
privacy practices of that application.</p>
<p>Connected Circles are not enabled for the initial public
release. A separate disclosure and review will be required
before connected participation is launched.</p>

<h2>6. Website and support</h2>
<p>The public website does not require an account or
contain a personal recovery database. Website hosting
providers may process IP addresses, request information
and technical logs for delivery and security.</p>
<p>If you email support, we receive the information you
choose to send. Avoid sending private recovery records
or sensitive personal details unless necessary.</p>

<h2>7. Retention and deletion</h2>
<p>Local records remain on your device until you delete
them or remove the application, subject to device backup
and restoration behaviour.</p>
<p>Use Settings, Manage private data to request deletion
of the personal records stored by Stillwater. The reset
preserves membership and selected preferences.</p>
<p>This does not delete payment records retained by app
stores or RevenueCat, external backups or messages already
sent to another person.</p>
<p>Contact ${contact} to request assistance with information
held by the developer or relevant membership records.
Some information may need to be retained to comply with
legal obligations or resolve payment disputes.</p>

<h2>8. Intended audience</h2>
<p>Stillwater is intended for adults aged 18 and over.</p>

<h2>9. Changes and contact</h2>
<p>This policy may be updated when the application or
its data practices change. Material changes will be
communicated as appropriate.</p>
<p>Questions and privacy requests: ${contact}.</p>`;

  const terms = `
<h1>Terms of use</h1>
<p>Policy date: ${date}</p>
<p>Stillwater is operated by ${operator}.
Contact: ${contact}.</p>

<h2>1. Purpose of Stillwater</h2>
<p>Stillwater offers educational self-help content,
personal planning and optional Christian reflection
for adults aged 18 and over.</p>
<p>It does not diagnose, treat or cure medical or mental
health conditions. It is not a substitute for qualified
professional care, pastoral guidance or emergency services.</p>

<h2>2. Voluntary participation</h2>
<p>Practices and reflections are voluntary. You may stop
a practice, skip optional content or discontinue use.
The application does not guarantee particular outcomes.</p>
<p>If an experience increases distress, consider stopping
and seeking appropriate support.</p>

<h2>3. Membership and payments</h2>
<p>Where paid membership is available, the applicable
app store presents prices, billing periods and purchase terms.</p>
<p>Subscriptions may renew automatically unless cancelled.
Manage cancellation and eligible refund requests through
the applicable app store.</p>
<p>Lifetime products, if offered, cover the core Plus
features described at purchase. Separately licensed future
content and hosted services may have separate terms.</p>
<p>Grace Scholarship access is separate from a paid
subscription and does not constitute a store purchase.</p>

<h2>4. Content and permitted use</h2>
<p>Use Stillwater for personal purposes and permitted
hosting or sharing activities. Rights in original content,
licensed materials and third-party works remain with their
respective rights holders.</p>
<p>Do not use the application to harass others, coerce
participation or improperly disclose private information.</p>

<h2>5. Availability and limitations</h2>
<p>Features may be unavailable during maintenance or
because of device, store or service limitations.</p>
<p>Nothing in these terms excludes rights that cannot
lawfully be excluded under applicable consumer law.</p>

<h2>6. Privacy and support</h2>
<p>Read the <a href="/privacy/">privacy policy</a> for
information about local records and external services.</p>
<p>For assistance, contact ${contact}.</p>`;

  const support = `
<h1>Stillwater support</h1>
<p>For technical problems, membership assistance and
privacy requests, contact ${contact}.</p>

<section class="card">
<h2>Delete your personal records</h2>
<ol>
<li>Open Stillwater.</li>
<li>Open Settings.</li>
<li>Choose Manage private data.</li>
<li>Choose Delete personal data.</li>
<li>Type DELETE and confirm the restart.</li>
</ol>
<p>The application processes the reset before opening
your personal screens again.</p>
<p>Membership and selected preferences are preserved.
Store records, external backups and messages already
sent are separate.</p>
</section>

<section class="card">
<h2>Manage purchases</h2>
<p>Open Settings and select Stillwater membership.
Use Restore purchases or manage your subscription
through the original app store.</p>
<p>Deleting personal records does not cancel billing.</p>
</section>

<section class="card">
<h2>When additional support is needed</h2>
<p>Stillwater is not a crisis service. If you are in
immediate danger, contact your local emergency service.
For ongoing distress, consider speaking with a qualified
mental health professional or another trusted person.</p>
</section>`;

  return {
    'index.html': page(
      'Make room for stillness', landing, identity, draft
    ),
    'privacy/index.html': page(
      'Privacy policy', privacy, identity, draft
    ),
    'terms/index.html': page(
      'Terms of use', terms, identity, draft
    ),
    'support/index.html': page(
      'Support', support, identity, draft
    ),
  };
}

function checkTemplates() {
  const identity = validateIdentity({
    operator: 'Sample Developer',
    email: 'support@sample.invalid',
    date: '2026-11-25',
  });

  const pages = renderSite(identity, true);

  assert.equal(Object.keys(pages).length, 4);

  for (const html of Object.values(pages)) {
    assert.ok(html.includes('DRAFT'));
    assert.ok(html.includes('noindex,nofollow'));
    assert.ok(html.includes('/privacy/'));
    assert.ok(!html.includes('<script'));
  }

  assert.equal(
    escapeHtml('<script>'),
    '&lt;script&gt;'
  );

  assert.throws(() => validateIdentity({
    operator: '',
    email: '',
    date: '',
  }));

  console.log('PUBLIC WEBSITE TEMPLATE CHECKS PASSED');
}

function build() {
  const release = process.argv.includes('--release');

  const identity = validateIdentity({
    operator: process.env.STILLWATER_PUBLIC_OPERATOR,
    email: process.env.STILLWATER_SUPPORT_EMAIL,
    date: process.env.STILLWATER_POLICY_DATE,
  });

  if (
    release &&
    process.env.STILLWATER_LEGAL_REVIEWED !== 'true'
  ) {
    throw new Error(
      'Review legal documents before generating release files.'
    );
  }

  cp.execFileSync(process.execPath, [
    'scripts/build-share-site.cjs', '--check',
  ], { stdio: 'inherit' });

  const destination = release
    ? 'dist/stillwater-public'
    : 'dist/stillwater-public-draft';

  if (fs.existsSync(destination)) {
    throw new Error(
      'Output directory already exists: ' + destination
    );
  }

  const pages = renderSite(identity, !release);

  let shared = fs.readFileSync(
    'web-share/site/index.html', 'utf8'
  );

  shared = shared.replace(
    '</main>',
    '<p><a href="/">About Stillwater</a> · ' +
    '<a href="/privacy/">Privacy</a> · ' +
    '<a href="/support/">Support</a></p></main>'
  );

  if (!release) {
    shared = shared.replace(
      '<head>',
      '<head><meta name="robots" content="noindex,nofollow">'
    );
  }

  pages['share/index.html'] = shared;

  for (const [file, contents] of Object.entries(pages)) {
    const target = path.join(destination, file);

    fs.mkdirSync(path.dirname(target), {
      recursive: true,
    });

    fs.writeFileSync(target, contents, {
      encoding: 'utf8',
      flag: 'wx',
    });
  }

  console.log('WEBSITE GENERATED: ' + destination);
  console.log(
    release
      ? 'Release files generated; deployment not performed.'
      : 'Draft files only. Do not deploy publicly.'
  );
}

try {
  if (process.argv.includes('--check')) {
    checkTemplates();
  } else {
    build();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
