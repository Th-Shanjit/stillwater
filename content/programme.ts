export const PROGRAMME_SCHEMA_VERSION = 1;

export type ProgrammeStepKind =
  | 'guidance'
  | 'action'
  | 'prayer'
  | 'reflection'
  | 'quiet';

export type ProgrammeAudience =
  | 'recovery'
  | 'general';

export type ProgrammeAccess =
  | 'free'
  | 'plus';

export type ProgrammeSchedule =
  | 'self_paced'
  | 'daily';

export interface ProgrammePublisher {
  id: string;
  name: string;
  kind: 'stillwater' | 'creator' | 'church';
}

export interface ProgrammeStep {
  id: string;
  kind: ProgrammeStepKind;
  title: string;
  text: string;
  suggestedSeconds: number;
  optional: boolean;
  audioAssetId?: string;
}

export interface ProgrammeDay {
  id: string;
  title: string;
  description: string;
  steps: ProgrammeStep[];
}

export interface ProgrammeDefinition {
  schemaVersion: 1;
  id: string;
  version: number;
  title: string;
  description: string;
  language: string;
  tradition: string;
  publisher: ProgrammePublisher;
  audience: ProgrammeAudience;
  access: ProgrammeAccess;
  schedule: ProgrammeSchedule;
  days: ProgrammeDay[];
}

function object(
  value: unknown,
  allowed: readonly string[],
  name: string
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error(name + ' must be an object.');
  }

  const result = value as Record<string, unknown>;

  for (const key of Object.keys(result)) {
    if (!allowed.includes(key)) {
      throw new Error(
        name + ': unexpected field ' + key
      );
    }
  }

  return result;
}

function string(
  value: unknown,
  name: string,
  maximum = 200
): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > maximum
  ) {
    throw new Error('Invalid ' + name);
  }

  return value.trim();
}

function identifier(
  value: unknown,
  name: string
): string {
  const id = string(value, name, 80);

  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
    throw new Error('Invalid identifier: ' + name);
  }

  return id;
}

function integer(
  value: unknown,
  min: number,
  max: number,
  name: string
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error('Invalid ' + name);
  }

  return value;
}

function choice<T extends string>(
  value: unknown,
  choices: readonly T[],
  name: string
): T {
  const result = choices.find(item => item === value);

  if (result === undefined) {
    throw new Error('Invalid ' + name);
  }

  return result;
}

function array(
  value: unknown,
  maximum: number,
  name: string
): unknown[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > maximum
  ) {
    throw new Error('Invalid ' + name);
  }

  return value;
}

function unique(
  id: string,
  seen: Set<string>,
  name: string
) {
  if (seen.has(id)) {
    throw new Error(
      'Duplicate ' + name + ': ' + id
    );
  }

  seen.add(id);
}

// Validate untrusted structured content and return
// a clean definition containing only approved fields.
export function parseProgramme(
  value: unknown
): ProgrammeDefinition {
  const raw = object(
    value,
    [
      'schemaVersion',
      'id',
      'version',
      'title',
      'description',
      'language',
      'tradition',
      'publisher',
      'audience',
      'access',
      'schedule',
      'days',
    ],
    'Programme'
  );

  if (raw.schemaVersion !== PROGRAMME_SCHEMA_VERSION) {
    throw new Error('Unsupported programme schema.');
  }

  const publisher = object(
    raw.publisher,
    ['id', 'name', 'kind'],
    'Publisher'
  );

  const dayIds = new Set<string>();
  const stepIds = new Set<string>();

  const days = array(
    raw.days,
    90,
    'programme days'
  ).map(dayValue => {
    const day = object(
      dayValue,
      ['id', 'title', 'description', 'steps'],
      'Programme day'
    );

    const dayId = identifier(day.id, 'day ID');
    unique(dayId, dayIds, 'day ID');

    const steps = array(
      day.steps,
      30,
      'day steps'
    ).map(stepValue => {
      const step = object(
        stepValue,
        [
          'id',
          'kind',
          'title',
          'text',
          'suggestedSeconds',
          'optional',
          'audioAssetId',
        ],
        'Programme step'
      );

      const id = identifier(step.id, 'step ID');
      unique(id, stepIds, 'step ID');

      const kind = choice(
        step.kind,
        [
          'guidance',
          'action',
          'prayer',
          'reflection',
          'quiet',
        ] as const,
        'step kind'
      );

      if (typeof step.optional !== 'boolean') {
        throw new Error(
          'Step optional flag must be boolean.'
        );
      }

      // Prayer and reflection must remain optional.
      if (
        (kind === 'prayer' || kind === 'reflection') &&
        !step.optional
      ) {
        throw new Error(
          'Prayer and reflection must be optional.'
        );
      }

      const result: ProgrammeStep = {
        id,
        kind,
        title: string(step.title, 'step title', 100),
        text: string(step.text, 'step text', 2000),
        suggestedSeconds: integer(
          step.suggestedSeconds,
          0,
          1800,
          'suggested duration'
        ),
        optional: step.optional,
      };

      if (step.audioAssetId !== undefined) {
        result.audioAssetId = identifier(
          step.audioAssetId,
          'audio asset ID'
        );
      }

      return result;
    });

    if (steps.every(step => step.optional)) {
      throw new Error(
        'A programme day needs a core step.'
      );
    }

    return {
      id: dayId,
      title: string(day.title, 'day title', 100),
      description: string(
        day.description,
        'day description',
        500
      ),
      steps,
    };
  });

  const language = string(
    raw.language,
    'language',
    20
  );

  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(language)) {
    throw new Error('Invalid language tag.');
  }

  return {
    schemaVersion: 1,
    id: identifier(raw.id, 'programme ID'),
    version: integer(
      raw.version, 1, 1000000, 'content version'
    ),
    title: string(raw.title, 'programme title', 120),
    description: string(
      raw.description,
      'programme description',
      1000
    ),
    language,
    tradition: string(
      raw.tradition,
      'spiritual tradition',
      100
    ),
    publisher: {
      id: identifier(publisher.id, 'publisher ID'),
      name: string(
        publisher.name,
        'publisher name',
        100
      ),
      kind: choice(
        publisher.kind,
        ['stillwater', 'creator', 'church'] as const,
        'publisher kind'
      ),
    },
    audience: choice(
      raw.audience,
      ['recovery', 'general'] as const,
      'audience'
    ),
    access: choice(
      raw.access,
      ['free', 'plus'] as const,
      'access tier'
    ),
    schedule: choice(
      raw.schedule,
      ['self_paced', 'daily'] as const,
      'schedule'
    ),
    days,
  };
}

export function programmeKey(
  programme: Pick<
    ProgrammeDefinition,
    'id' | 'version'
  >
): string {
  return programme.id + ':' + programme.version;
}

export function programmeDuration(
  programme: ProgrammeDefinition
): number {
  return programme.days.reduce(
    (total, day) =>
      total + day.steps.reduce(
        (sum, step) => sum + step.suggestedSeconds,
        0
      ),
    0
  );
}

export function findProgrammeDay(
  programme: ProgrammeDefinition,
  dayId: string
): ProgrammeDay | null {
  return programme.days.find(
    day => day.id === dayId
  ) ?? null;
}
