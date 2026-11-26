const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const AUDIO_DIR = 'assets/audio';
const REGISTRY = 'content/bundledRecordings.ts';

const tracks = JSON.parse(
  fs.readFileSync(
    'assets/content/midnight_audio.json',
    'utf8'
  )
);

const EXPECTED_IDS = [
  'urge_1am',
  'post_slip_fraud',
  'lonely_house',
  'eyes_closed_examen',
];

function hash(value) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function transcriptHash(track) {
  return hash(JSON.stringify({
    id: track.id,
    durationSeconds: track.durationSeconds,
    cues: track.cues,
  }));
}

function getTrack(id) {
  const track = tracks.find(
    item => item.id === id
  );

  if (!track || !EXPECTED_IDS.includes(id)) {
    throw new Error('Unknown recording ID.');
  }

  return track;
}

function clock(seconds) {
  return String(
    Math.floor(seconds / 60)
  ).padStart(2, '0') +
    ':' +
    String(seconds % 60).padStart(2, '0');
}

function createCueSheet(track) {
  const lines = [
    '# ' + track.title,
    '',
    'Content ID: ' + track.id,
    'Target duration: ' + clock(track.durationSeconds),
    'Access: ' + track.tier,
    'Script status: Pending human approval',
    'Transcript SHA-256: ' + transcriptHash(track),
    '',
    '## Narrator direction',
    '',
    'Speak naturally and clearly.',
    'Do not read the timestamps aloud.',
    'Explain intentional periods of quiet.',
    'Do not add unscripted promises or instructions.',
    '',
    '## Timed script',
  ];

  for (let i = 0; i < track.cues.length; i++) {
    const cue = track.cues[i];

    const end =
      track.cues[i + 1]?.atSecond ??
      track.durationSeconds;

    const words = cue.text.trim()
      .split(/\s+/).length;

    const estimatedSpeechSeconds =
      Math.ceil(words / 115 * 60);

    lines.push(
      '',
      '### ' + clock(cue.atSecond) +
        ' - ' + clock(end),
      '',
      cue.text,
      '',
      'Production note: Approximately ' +
        estimatedSpeechSeconds +
        ' seconds of speech at 115 words per minute.',
      'Review the remaining quiet interval before final recording.'
    );
  }

  lines.push(
    '',
    '## Review requirements',
    '',
    '- Clinical and safeguarding review',
    '- Pastoral and language review',
    '- Voice and recording rights',
    '- Transcript accuracy',
    '- Final cue timing',
    '- Offline playback verification'
  );

  return lines.join('\n') + '\n';
}

function validateTracks() {
  if (tracks.length !== EXPECTED_IDS.length) {
    throw new Error('Unexpected recording inventory.');
  }

  for (const id of EXPECTED_IDS) {
    const track = getTrack(id);

    if (
      track.audioUri !== null ||
      !Number.isInteger(track.durationSeconds) ||
      track.durationSeconds <= 0 ||
      track.cues.length < 1 ||
      track.cues[0].atSecond !== 0
    ) {
      throw new Error(
        'Invalid recording metadata: ' + id
      );
    }

    let previous = -1;

    for (const cue of track.cues) {
      if (
        !Number.isInteger(cue.atSecond) ||
        cue.atSecond <= previous ||
        cue.atSecond >= track.durationSeconds ||
        !cue.text.trim()
      ) {
        throw new Error(
          'Invalid cue timeline: ' + id
        );
      }

      previous = cue.atSecond;
    }
  }

  for (const id of [
    'urge_1am',
    'post_slip_fraud',
  ]) {
    if (getTrack(id).tier !== 'free') {
      throw new Error(
        'Immediate support must remain free.'
      );
    }
  }
}

function prepare(directory) {
  if (!directory) {
    throw new Error(
      'Specify a recording script output directory.'
    );
  }

  fs.mkdirSync(directory, {
    recursive: true,
  });

  for (const track of tracks) {
    const target = path.join(
      directory,
      track.id + '.md'
    );

    fs.writeFileSync(
      target,
      createCueSheet(track),
      { encoding: 'utf8', flag: 'wx' }
    );

    console.log('CREATED: ' + target);
  }
}

function reviewTemplate(id) {
  const track = getTrack(id);

  const audio = path.join(
    AUDIO_DIR,
    id + '.mp3'
  );

  const bytes = fs.readFileSync(audio);

  if (bytes.length < 1024) {
    throw new Error(
      'Recording file is unexpectedly small.'
    );
  }

  const review = {
    schemaVersion: 1,
    id,
    status: 'pending',
    scriptReviewed: false,
    rightsCleared: false,
    transcriptMatched: false,
    cueTimingChecked: false,
    measuredDurationSeconds: null,
    rightsReference: '',
    transcriptSha256: transcriptHash(track),
    audioSha256: hash(bytes),
  };

  const destination = path.join(
    AUDIO_DIR,
    id + '.review.json'
  );

  fs.writeFileSync(
    destination,
    JSON.stringify(review, null, 2) + '\n',
    { encoding: 'utf8', flag: 'wx' }
  );

  console.log('CREATED: ' + destination);
  console.log(
    'Complete the actual human review before changing its status.'
  );
}

function validateRecording(track) {
  const audio = path.join(
    AUDIO_DIR,
    track.id + '.mp3'
  );

  const reviewFile = path.join(
    AUDIO_DIR,
    track.id + '.review.json'
  );

  const hasAudio = fs.existsSync(audio);
  const hasReview = fs.existsSync(reviewFile);

  if (!hasAudio && !hasReview) {
    return false;
  }

  if (!hasAudio || !hasReview) {
    throw new Error(
      'Recording or review file missing: ' +
      track.id
    );
  }

  const review = JSON.parse(
    fs.readFileSync(reviewFile, 'utf8')
  );

  const bytes = fs.readFileSync(audio);

  if (
    review.schemaVersion !== 1 ||
    review.id !== track.id ||
    review.status !== 'approved' ||
    review.scriptReviewed !== true ||
    review.rightsCleared !== true ||
    review.transcriptMatched !== true ||
    review.cueTimingChecked !== true ||
    typeof review.rightsReference !== 'string' ||
    !review.rightsReference.trim() ||
    typeof review.measuredDurationSeconds !== 'number' ||
    !Number.isFinite(review.measuredDurationSeconds) ||
    Math.abs(
      review.measuredDurationSeconds -
      track.durationSeconds
    ) > 2 ||
    bytes.length < 1024 ||
    review.audioSha256 !== hash(bytes) ||
    review.transcriptSha256 !== transcriptHash(track)
  ) {
    throw new Error(
      'Recording approval or integrity check failed: ' +
      track.id
    );
  }

  return true;
}

function registryContent(ids) {
  const lines = [
    '// Generated by scripts/recording-tools.cjs.',
    '// Do not edit manually.',
    '',
  ];

  ids.forEach((id, index) => {
    lines.push(
      "import recording" + index +
      " from '../assets/audio/" + id + ".mp3';"
    );
  });

  if (ids.length) lines.push('');

  lines.push(
    'const sources: Readonly<',
    '  Partial<Record<string, number>>',
    '> = {'
  );

  ids.forEach((id, index) => {
    lines.push(
      '  ' + id + ': recording' + index + ','
    );
  });

  lines.push(
    '};',
    '',
    'export function bundledRecording(',
    '  id: string',
    '): number | undefined {',
    '  return sources[id];',
    '}',
    '',
    'export function hasBundledRecording(',
    '  id: string',
    '): boolean {',
    '  return bundledRecording(id) !== undefined;',
    '}',
    ''
  );

  return lines.join('\n');
}

function synchronise(write) {
  validateTracks();

  const allowedFiles = new Set(
    EXPECTED_IDS.flatMap(id => [
      id + '.mp3',
      id + '.review.json',
    ])
  );

  for (const file of fs.readdirSync(AUDIO_DIR)) {
    if (
      /\.(mp3|review\.json)$/i.test(file) &&
      !allowedFiles.has(file)
    ) {
      throw new Error(
        'Unexpected recording file: ' + file
      );
    }
  }

  const available = [];

  for (const track of tracks) {
    if (validateRecording(track)) {
      available.push(track.id);

      console.log(
        'APPROVAL RECORD OK: ' + track.id
      );
    } else {
      console.log(
        'TEXT FALLBACK: ' + track.id
      );
    }
  }

  const expected = registryContent(available);

  if (write) {
    fs.writeFileSync(
      REGISTRY, expected, 'utf8'
    );
  } else {
    const actual = fs.readFileSync(
      REGISTRY, 'utf8'
    ).replace(/\r\n/g, '\n');

    if (actual !== expected) {
      throw new Error(
        'Recording registry is outdated. Run sync.'
      );
    }
  }

  console.log(
    'Registered recordings: ' + available.length +
    '/' + EXPECTED_IDS.length
  );

  console.log(
    'RECORDING INTEGRITY CHECK PASSED'
  );
}

module.exports = {
  validateTracks,
  createCueSheet,
  transcriptHash,
  registryContent,
  synchronise,
};

if (require.main === module) {
  try {
    validateTracks();

    const command = process.argv[2];

    if (command === 'prepare') {
      prepare(process.argv[3]);

    } else if (command === 'review') {
      reviewTemplate(process.argv[3]);

    } else if (command === 'sync') {
      synchronise(true);

    } else if (command === 'check') {
      synchronise(false);

    } else {
      throw new Error(
        'Commands: prepare <directory>, review <id>, sync, check'
      );
    }

  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
