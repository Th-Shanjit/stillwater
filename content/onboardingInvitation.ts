export function invitationDestination(
  segment: string | undefined,
  params: Record<string, unknown>
): string | null {
  const keys = Object.keys(params);

  if (
    segment === 'shared' &&
    keys.length === 3 &&
    params.v === '1'
  ) {
    if (
      params.kind === 'moment' &&
      params.id === 'little_room'
    ) {
      return '/shared?kind=moment&id=little_room&v=1';
    }

    if (
      params.kind === 'walk' &&
      params.id === 'three_quiet_evenings'
    ) {
      return '/shared?kind=walk&id=three_quiet_evenings&v=1';
    }
  }

  if (
    segment === 'circles' &&
    keys.length === 1 &&
    typeof params.invite === 'string' &&
    /^[a-f0-9]{64}$/.test(params.invite)
  ) {
    return '/circles?invite=' + params.invite;
  }

  return null;
}

export function safeOnboardingDestination(
  value: unknown
): string {
  if (
    value === '/shared?kind=moment&id=little_room&v=1' ||
    value === '/shared?kind=walk&id=three_quiet_evenings&v=1'
  ) {
    return value;
  }

  if (
    typeof value === 'string' &&
    /^\/circles\?invite=[a-f0-9]{64}$/.test(value)
  ) {
    return value;
  }

  return '/(tabs)';
}
