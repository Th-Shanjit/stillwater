export type AccessSource =
  | 'store_subscription'
  | 'store_no_expiry'
  | 'scholarship'
  | 'development'
  | 'free'
  | 'unavailable';

export interface PlusAccess {
  active: boolean;
  source: AccessSource;
  expiresAt: string | null;
}

export type PlanChoice =
  | 'monthly'
  | 'annual'
  | 'lifetime';

export const PLUS_BENEFITS = [
  'The complete 30-day recovery path',
  'Additional optional guided practices',
] as const;

export const FREE_BENEFITS = [
  'Immediate support and starting again',
  'Morning and evening routines',
  'Personal plans, privacy and reminders',
  'Personal Compass and Sanctuary',
  'The first week of the recovery path',
  'Basic programmes, hosting and sharing',
] as const;

export interface StoreEntitlement {
  isActive: boolean;
  expirationDate: string | null;
}

export function resolvePlusAccess(input: {
  store: StoreEntitlement | null;
  storeChecked: boolean;
  scholarshipUntil: string | null;
  development: boolean;
  now: number;
}): PlusAccess {
  // RevenueCat owns store entitlement validity.
  // Do not independently override its grace periods.
  if (input.store?.isActive) {
    return {
      active: true,
      source: input.store.expirationDate === null
        ? 'store_no_expiry'
        : 'store_subscription',
      expiresAt: input.store.expirationDate,
    };
  }

  if (
    input.scholarshipUntil &&
    Date.parse(input.scholarshipUntil) > input.now
  ) {
    return {
      active: true,
      source: 'scholarship',
      expiresAt: input.scholarshipUntil,
    };
  }

  if (input.development) {
    return {
      active: true,
      source: 'development',
      expiresAt: null,
    };
  }

  return {
    active: false,
    source: input.storeChecked ? 'free' : 'unavailable',
    expiresAt: null,
  };
}

export function permitsContent(
  tier: 'free' | 'plus',
  hasPlus: boolean
): boolean {
  return tier === 'free' || hasPlus;
}

export function validStorePlan(
  choice: PlanChoice,
  packageType: string,
  period: string | null,
  price: string
): boolean {
  if (!price.trim()) return false;

  if (choice === 'monthly') {
    return packageType === 'MONTHLY' &&
      period === 'P1M';
  }

  if (choice === 'annual') {
    return packageType === 'ANNUAL' &&
      (period === 'P1Y' || period === 'P12M');
  }

  return packageType === 'LIFETIME' &&
    period === null;
}

export function validLegalUrl(
  url: string | undefined
): boolean {
  if (!url) return false;

  return /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[a-zA-Z0-9._~/%-]*)?$/i
    .test(url);
}
