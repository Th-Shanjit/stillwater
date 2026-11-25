export interface SharedLink {
  kind: 'moment' | 'walk';
  id: string;
  version: number;
}

export const MOMENT_LINK: SharedLink = {
  kind: 'moment',
  id: 'little_room',
  version: 1,
};

export const WALK_LINK: SharedLink = {
  kind: 'walk',
  id: 'three_quiet_evenings',
  version: 1,
};

export function parseSharedLink(
  value: unknown
): SharedLink | null {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Record<string, unknown>;

  if (Object.keys(raw).some(
    key => !['kind', 'id', 'v'].includes(key)
  )) return null;

  if (
    raw.kind !== 'moment' &&
    raw.kind !== 'walk'
  ) return null;

  if (
    typeof raw.id !== 'string' ||
    !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(raw.id)
  ) return null;

  if (
    typeof raw.v !== 'string' ||
    !/^[1-9][0-9]{0,6}$/.test(raw.v)
  ) return null;

  const version = Number(raw.v);
  if (version > 1000000) return null;

  return {
    kind: raw.kind,
    id: raw.id,
    version,
  };
}

export function sameSharedLink(
  a: SharedLink,
  b: SharedLink
): boolean {
  return a.kind === b.kind &&
    a.id === b.id &&
    a.version === b.version;
}

export function shareQuery(link: SharedLink): string {
  return 'kind=' + link.kind +
    '&id=' + encodeURIComponent(link.id) +
    '&v=' + link.version;
}

export function nativeShareLink(link: SharedLink): string {
  return 'stillwater://shared?' + shareQuery(link);
}

export function publicShareLink(
  base: string | undefined,
  link: SharedLink
): string | null {
  // Deliberately accept only a plain HTTPS site address.
  if (
    !base ||
    !/^https:\/\/[a-z0-9.-]+(?:\/[a-zA-Z0-9._~/-]*)?$/i.test(base)
  ) return null;

  // A fragment keeps content parameters out of
  // ordinary HTTP request URLs.
  return base + '#' + shareQuery(link);
}
