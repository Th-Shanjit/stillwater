import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import {
  MOMENT_LINK,
  publicShareLink,
} from '../content/shareLinks';

const base = (
  process.env.EXPO_PUBLIC_CIRCLES_API_URL ?? ''
).replace(/\/$/, '');

const STORAGE_KEY = 'stillwater_circle_membership_v1';

export const circlesConfigured =
  Platform.OS !== 'web' &&
  /^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(base);

export interface CircleState {
  programmeId: string;
  version: number;
  mode: 'pair' | 'circle';
  members: number;
  capacity: number;
  owner: boolean;
  expiresAt: string;
  checkins: {
    dayId: string;
    count: number;
    mine: boolean;
  }[];
}

export function validInvite(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

async function credential(create = false):
  Promise<string | null> {
  if (!circlesConfigured) {
    throw new Error('Connected participation is unavailable.');
  }

  const stored = await SecureStore.getItemAsync(STORAGE_KEY);

  if (stored) {
    const record = JSON.parse(stored);

    if (record.origin !== base ||
        typeof record.token !== 'string' ||
        !validInvite(record.token)) {
      throw new Error('Membership configuration has changed.');
    }

    return record.token;
  }

  if (!create) return null;

  const token = (
    Crypto.randomUUID() + Crypto.randomUUID()
  ).replace(/-/g, '');

  // Save before sending a request, allowing recovery
  // if a successful server response is interrupted.
  await SecureStore.setItemAsync(
    STORAGE_KEY,
    JSON.stringify({ origin: base, token })
  );

  return token;
}

async function request(
  action: string,
  token: string,
  data: Record<string, unknown> = {},
  allowMissing = false
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(base + '/v1/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...data }),
      signal: controller.signal,
    });

    if (response.status === 404 && allowMissing) {
      return null;
    }

    if (!response.ok) {
      const message =
        response.status === 403
          ? 'This action is not authorised.'
          : response.status === 404
            ? 'This invitation or circle is unavailable.'
            : response.status === 409
              ? 'This circle is full or another membership exists.'
              : response.status === 429
                ? 'Too many requests. Try again shortly.'
                : 'Connected participation is temporarily unavailable.';

      throw new Error(message);
    }

    return await response.json();

  } finally {
    clearTimeout(timer);
  }
}

function readState(value: unknown): CircleState {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid circle response.');
  }

  const result = value as CircleState;

  if (
    result.programmeId !== 'three_quiet_evenings' ||
    result.version !== 1 ||
    !['pair', 'circle'].includes(result.mode) ||
    typeof result.owner !== 'boolean' ||
    !Number.isInteger(result.members) ||
    result.members < 1 ||
    result.capacity !== (result.mode === 'pair' ? 2 : 8) ||
    result.members > result.capacity ||
    typeof result.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(result.expiresAt)) ||
    !Array.isArray(result.checkins) ||
    result.checkins.length !== 3
  ) {
    throw new Error('Invalid circle response.');
  }

  const expected = [
    'make_space',
    'reconnect',
    'carry_forward',
  ];

  if (result.checkins.some((item, index) =>
    !item ||
    item.dayId !== expected[index] ||
    typeof item.mine !== 'boolean' ||
    !Number.isInteger(item.count) ||
    item.count < 0 ||
    item.count > result.members
  )) {
    throw new Error('Invalid participation response.');
  }

  return result;
}

export async function loadCircle():
  Promise<CircleState | null> {
  const token = await credential();
  if (!token) return null;

  const result = await request(
    'state', token, {}, true
  );

  return result === null ? null : readState(result);
}

export async function createCircle(
  mode: 'pair' | 'circle',
  pilotCode: string
) {
  const token = await credential(true);
  if (!token) throw new Error('Membership unavailable.');

  return readState(await request(
    'create', token, { mode, pilotCode }
  ));
}

export async function joinCircle(invite: string) {
  if (!validInvite(invite)) {
    throw new Error('Invalid invitation code.');
  }

  const token = await credential(true);
  if (!token) throw new Error('Membership unavailable.');

  return readState(await request(
    'join', token, { invite }
  ));
}

export async function changeCheckin(
  dayId: string,
  shared: boolean
) {
  const token = await credential();
  if (!token) throw new Error('No membership.');

  return readState(await request(
    'checkin', token, { dayId, shared }
  ));
}

export async function generateInvite(): Promise<string> {
  const token = await credential();
  if (!token) throw new Error('No membership.');

  const result = await request('invite', token) as {
    code?: unknown;
  };

  if (typeof result.code !== 'string' ||
      !validInvite(result.code)) {
    throw new Error('Invalid invitation response.');
  }

  return result.code;
}

export async function revokeInvite() {
  const token = await credential();
  if (!token) throw new Error('No membership.');

  await request('revoke', token);
}

export async function leaveCircle() {
  const token = await credential();

  if (token) {
    await request('leave', token);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }
}

export function circleShareMessage(code: string) {
  const publicUrl = publicShareLink(
    process.env.EXPO_PUBLIC_STILLWATER_SHARE_URL,
    MOMENT_LINK
  );

  const link = publicUrl
    ? publicUrl.split('#')[0] + '#circle=' + code
    : 'stillwater://circles?invite=' + code;

  return 'Would you like to join me for a Stillwater programme?\n\n' +
    link + '\n\nInvitation code: ' + code;
}
