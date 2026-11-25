export type PracticeTier = 'free' | 'plus';

export type PracticeStepKind =
  | 'guidance'
  | 'prayer'
  | 'action'
  | 'reflection';

export interface PracticeStep {
  id: string;
  kind: PracticeStepKind;
  text: string;
  durationSeconds: number;
}

export interface GuidedPractice {
  id: string;
  version: number;
  title: string;
  description: string;
  tier: PracticeTier;
  audioUri: string | null;
  steps: PracticeStep[];
}

export interface LegacyPractice {
  id: string;
  title: string;
  subtitle: string;
  durationSeconds: number;
  tier: PracticeTier;
  audioUri: string | null;
  cues: {
    atSecond: number;
    text: string;
  }[];
}

export interface PracticeSession {
  stepIndex: number;
  elapsedSeconds: number;
  running: boolean;
  reachedEnd: boolean;
}

export function validatePractice(
  practice: GuidedPractice
): void {
  if (!practice.id.trim() ||
      !practice.title.trim()) {
    throw new Error('Practice requires an ID and title.');
  }

  if (!Number.isInteger(practice.version) ||
      practice.version < 1) {
    throw new Error('Invalid practice version.');
  }

  if (practice.tier !== 'free' &&
      practice.tier !== 'plus') {
    throw new Error('Invalid practice tier.');
  }

  if (practice.steps.length === 0) {
    throw new Error('Practice must contain steps.');
  }

  const ids = new Set<string>();

  for (const step of practice.steps) {
    if (!step.id.trim() ||
        ids.has(step.id) ||
        !step.text.trim()) {
      throw new Error('Invalid or duplicate step.');
    }

    if (!Number.isInteger(step.durationSeconds) ||
        step.durationSeconds < 1) {
      throw new Error('Invalid step duration.');
    }

    if (![
      'guidance',
      'prayer',
      'action',
      'reflection',
    ].includes(step.kind)) {
      throw new Error('Invalid step kind.');
    }

    ids.add(step.id);
  }
}

export function fromLegacyPractice(
  track: LegacyPractice
): GuidedPractice {
  if (!Number.isInteger(track.durationSeconds) ||
      track.durationSeconds < 1 ||
      track.cues.length === 0 ||
      track.cues[0].atSecond !== 0) {
    throw new Error('Invalid legacy practice timeline.');
  }

  const steps = track.cues.map((cue, index) => {
    const nextTime =
      track.cues[index + 1]?.atSecond ??
      track.durationSeconds;

    if (!Number.isInteger(cue.atSecond) ||
        cue.atSecond < 0 ||
        cue.atSecond >= track.durationSeconds ||
        nextTime > track.durationSeconds ||
        nextTime <= cue.atSecond) {
      throw new Error('Invalid cue order or duration.');
    }

    return {
      id: `${track.id}:step:${index + 1}`,
      kind: 'guidance' as const,
      text: cue.text,
      durationSeconds: nextTime - cue.atSecond,
    };
  });

  const practice: GuidedPractice = {
    id: track.id,
    version: 1,
    title: track.title,
    description: track.subtitle,
    tier: track.tier,
    audioUri: track.audioUri,
    steps,
  };

  validatePractice(practice);

  return practice;
}

export function initialSession(): PracticeSession {
  return {
    stepIndex: 0,
    elapsedSeconds: 0,
    running: false,
    reachedEnd: false,
  };
}

export function totalDuration(
  practice: GuidedPractice
): number {
  return practice.steps.reduce(
    (sum, step) => sum + step.durationSeconds,
    0
  );
}

export function sessionElapsed(
  practice: GuidedPractice,
  session: PracticeSession
): number {
  if (session.reachedEnd) {
    return totalDuration(practice);
  }

  return practice.steps
    .slice(0, session.stepIndex)
    .reduce(
      (sum, step) => sum + step.durationSeconds,
      0
    ) + session.elapsedSeconds;
}

export function moveStep(
  practice: GuidedPractice,
  session: PracticeSession,
  delta: -1 | 1
): PracticeSession {
  const next = Math.max(
    0,
    session.stepIndex + delta
  );

  if (next >= practice.steps.length) {
    return {
      ...session,
      reachedEnd: true,
      running: false,
    };
  }

  return {
    ...session,
    stepIndex: next,
    elapsedSeconds: 0,
    reachedEnd: false,
  };
}

export function tickSession(
  practice: GuidedPractice,
  session: PracticeSession
): PracticeSession {
  if (!session.running || session.reachedEnd) {
    return session;
  }

  const duration =
    practice.steps[session.stepIndex].durationSeconds;

  if (session.elapsedSeconds + 1 >= duration) {
    return moveStep(practice, session, 1);
  }

  return {
    ...session,
    elapsedSeconds: session.elapsedSeconds + 1,
  };
}

export function formatPracticeTime(
  seconds: number
): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(
    safe % 60
  ).padStart(2, '0')}`;
}
