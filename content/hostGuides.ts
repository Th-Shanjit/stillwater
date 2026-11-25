import type {
  ProgrammeDefinition,
} from './programme';

export interface HostAgendaItem {
  id: string;
  title: string;
  instructions: string;
  suggestedMinutes: number;
  kind: 'guidance' | 'programme' | 'discussion' | 'closing';
}

export interface HostGuide {
  programmeId: string;
  programmeVersion: number;
  dayId: string;
  title: string;
  preparation: string;
  agenda: HostAgendaItem[];
}

const DISCUSSION: Record<string, string> = {
  make_space:
    'What is one ordinary way you could make more room for rest this week?',

  reconnect:
    'What small act of connection would you like to make time for?',

  carry_forward:
    'What evening rhythm would feel realistic to continue?',
};

export function buildHostGuide(
  programme: ProgrammeDefinition,
  dayId: string
): HostGuide | null {
  // Hosting is a separate curated content permission.
  // Do not automatically expose private recovery
  // programmes in a group environment.
  if (
    programme.id !== 'three_quiet_evenings' ||
    programme.version !== 1 ||
    programme.publisher.id !== 'stillwater' ||
    programme.publisher.kind !== 'stillwater' ||
    programme.publisher.name !== 'Stillwater' ||
    programme.audience !== 'general' ||
    programme.access !== 'free' ||
    programme.schedule !== 'self_paced' ||
    !Object.hasOwn(DISCUSSION, dayId)
  ) {
    return null;
  }

  const day = programme.days.find(
    item => item.id === dayId
  );

  if (!day) return null;

  const seconds = day.steps.reduce(
    (total, step) => total + step.suggestedSeconds,
    0
  );

  return {
    programmeId: programme.id,
    programmeVersion: programme.version,
    dayId,
    title: day.title,

    preparation:
      'Allow a quiet space, comfortable seating and enough time for voluntary participation. No additional materials are required.',

    agenda: [
      {
        id: 'welcome',
        title: 'Welcome everyone',
        instructions:
          'Explain that every activity is voluntary. Nobody needs to disclose private struggles or explain why they choose not to participate.',
        suggestedMinutes: 2,
        kind: 'guidance',
      },
      {
        id: 'settle',
        title: 'Make room for stillness',
        instructions:
          'Invite everyone to settle comfortably. They may keep their eyes open, change position or step outside whenever they wish.',
        suggestedMinutes: 2,
        kind: 'guidance',
      },
      {
        id: 'programme',
        title: 'Lead the guided experience',
        instructions:
          'Read the session guidance aloud at a comfortable pace. Offer prayer and reflection as invitations, not requirements.',
        suggestedMinutes: Math.max(
          3,
          Math.ceil(seconds / 60)
        ),
        kind: 'programme',
      },
      {
        id: 'discussion',
        title: 'Optional discussion',
        instructions:
          DISCUSSION[dayId] +
          ' Invite people to pass or simply listen. Do not request details about sexual behaviour, setbacks or personal recovery.',
        suggestedMinutes: 5,
        kind: 'discussion',
      },
      {
        id: 'close',
        title: 'Close the session',
        instructions:
          'Thank everyone for being present. Offer an optional closing prayer. Let participants decide whether to continue the programme independently.',
        suggestedMinutes: 2,
        kind: 'closing',
      },
    ],
  };
}

export function hostGuideMinutes(
  guide: HostGuide
): number {
  return guide.agenda.reduce(
    (total, item) => total + item.suggestedMinutes,
    0
  );
}
