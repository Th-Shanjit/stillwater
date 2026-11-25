import type {
  ProgrammeDay,
} from './programme';

export type StepDisposition =
  | 'continued'
  | 'skipped';

export interface ProgrammeSession {
  cursor: number;
  dispositions: (StepDisposition | null)[];
}

export interface ProgrammeSessionResult {
  dayId: string;
  steps: {
    stepId: string;
    disposition: StepDisposition;
  }[];
}

export function initialProgrammeSession(
  day: ProgrammeDay
): ProgrammeSession {
  return {
    cursor: 0,
    dispositions: day.steps.map(() => null),
  };
}

export function advanceProgrammeStep(
  day: ProgrammeDay,
  session: ProgrammeSession,
  expectedCursor: number,
  disposition: StepDisposition
): ProgrammeSession {
  if (
    session.cursor !== expectedCursor ||
    session.cursor < 0 ||
    session.cursor >= day.steps.length
  ) {
    return session;
  }

  if (
    disposition !== 'continued' &&
    disposition !== 'skipped'
  ) {
    return session;
  }

  const step = day.steps[session.cursor];

  if (disposition === 'skipped' && !step.optional) {
    return session;
  }

  const dispositions = [...session.dispositions];

  dispositions[session.cursor] = disposition;

  return {
    cursor: session.cursor + 1,
    dispositions,
  };
}

export function previousProgrammeStep(
  session: ProgrammeSession
): ProgrammeSession {
  return {
    ...session,
    cursor: Math.max(0, session.cursor - 1),
  };
}

export function getProgrammeSessionResult(
  day: ProgrammeDay,
  session: ProgrammeSession
): ProgrammeSessionResult | null {
  if (
    session.cursor !== day.steps.length ||
    session.dispositions.length !== day.steps.length
  ) {
    return null;
  }

  const steps: ProgrammeSessionResult['steps'] = [];

  for (let i = 0; i < day.steps.length; i++) {
    const disposition = session.dispositions[i];

    if (
      disposition !== 'continued' &&
      disposition !== 'skipped'
    ) {
      return null;
    }

    if (
      disposition === 'skipped' &&
      !day.steps[i].optional
    ) {
      return null;
    }

    steps.push({
      stepId: day.steps[i].id,
      disposition,
    });
  }

  return {
    dayId: day.id,
    steps,
  };
}
