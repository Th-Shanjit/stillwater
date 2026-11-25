import type {
  ProgrammeDefinition,
  ProgrammePublisher,
} from './programme';

export interface PublisherProfile {
  id: string;
  name: string;
  kind: ProgrammePublisher['kind'];
  biography: string;
  tradition: string;
}

const PROFILES: PublisherProfile[] = [
  {
    id: 'stillwater',
    name: 'Stillwater',
    kind: 'stillwater',
    biography:
      'Practical, faith-centred experiences for intentional living, healthier habits and moments of stillness.',
    tradition: 'Christian',
  },
];

export function getPublisherProfile(
  publisher: ProgrammePublisher
): PublisherProfile | null {
  const profile = PROFILES.find(item =>
    item.id === publisher.id &&
    item.kind === publisher.kind &&
    item.name === publisher.name
  );

  return profile ? { ...profile } : null;
}

export function listPublisherProfiles():
  PublisherProfile[] {
  return PROFILES.map(item => ({ ...item }));
}

export function publisherProgrammes(
  publisherId: string,
  programmes: ProgrammeDefinition[]
): ProgrammeDefinition[] {
  const selected = new Map<
    string,
    ProgrammeDefinition
  >();

  for (const programme of programmes) {
    const profile = getPublisherProfile(
      programme.publisher
    );

    if (!profile || profile.id !== publisherId) {
      continue;
    }

    const existing = selected.get(programme.id);

    if (!existing ||
        programme.version > existing.version) {
      selected.set(programme.id, programme);
    }
  }

  return [...selected.values()];
}
