import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
} from 'react-native-purchases';
import { getDb } from './schema';

export const PLUS_ENTITLEMENT_ID = 'plus';

const DEV_PLUS_KEY = 'dev_stillwater_plus_preview';
const SCHOLARSHIP_UNTIL_KEY = 'grace_scholarship_until';
const CACHED_RC_PLUS_KEY = 'cached_rc_plus_active';

let configured = false;

/** True when running inside Expo Go, where native RevenueCat modules are unavailable */
export function isRunningInExpoGo(): boolean {
  return (
    String(Constants.appOwnership) === 'expo' ||
    String(Constants.executionEnvironment) === 'storeClient'
  );
}

async function ensureFlagsTable(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_flags (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function getFlag(key: string): Promise<string | null> {
  await ensureFlagsTable();
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_flags WHERE key = ?;`,
    [key]
  );
  return row?.value ?? null;
}

async function setFlag(key: string, value: string): Promise<void> {
  await ensureFlagsTable();
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_flags (key, value) VALUES (?, ?);`,
    [key, value]
  );
}

function getPlatformApiKey(): string | null {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY
        : null;

  if (!key || key.includes('replace_with_your')) return null;
  return key.trim();
}

function hasEntitlementInInfo(info: CustomerInfo | null | undefined): boolean {
  return Boolean(info?.entitlements?.active?.[PLUS_ENTITLEMENT_ID]);
}

/**
 * Configures RevenueCat once on app startup.
 * Safe no-op in Expo Go or when API keys are not yet populated.
 */
export async function initEntitlements(): Promise<boolean> {
  if (configured) return true;
  if (Platform.OS === 'web' || isRunningInExpoGo()) return false;

  const apiKey = getPlatformApiKey();
  if (!apiKey) return false;

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    const alreadyConfigured = await Purchases.isConfigured();
    if (!alreadyConfigured) {
      Purchases.configure({ apiKey });
    }
    configured = true;

    Purchases.addCustomerInfoUpdateListener((info) => {
      const active = hasEntitlementInInfo(info);
      setFlag(CACHED_RC_PLUS_KEY, active ? '1' : '0').catch(() => {});
    });

    const info = await Purchases.getCustomerInfo();
    await setFlag(CACHED_RC_PLUS_KEY, hasEntitlementInInfo(info) ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}

export async function hasActiveGraceScholarship(): Promise<boolean> {
  const untilIso = await getFlag(SCHOLARSHIP_UNTIL_KEY);
  if (!untilIso) return false;
  const expiry = new Date(untilIso).getTime();
  return !Number.isNaN(expiry) && expiry > Date.now();
}

/** Activates a direct 365-day hardship pass stored locally on-device */
export async function activateGraceScholarship(): Promise<void> {
  const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  await setFlag(SCHOLARSHIP_UNTIL_KEY, oneYearFromNow);
}

/**
 * Single source of truth for Stillwater Plus access (works 100% offline via cached flag).
 */
export async function hasStillwaterPlus(): Promise<boolean> {
  if (await hasActiveGraceScholarship()) return true;

  if (__DEV__) {
    const devPreview = await getFlag(DEV_PLUS_KEY);
    if (devPreview === '1') return true;
  }

  if (configured && !isRunningInExpoGo()) {
    try {
      const info = await Purchases.getCustomerInfo();
      const active = hasEntitlementInInfo(info);
      await setFlag(CACHED_RC_PLUS_KEY, active ? '1' : '0');
      return active;
    } catch {
      // Offline fallback to last verified local status
    }
  }

  const cached = await getFlag(CACHED_RC_PLUS_KEY);
  return cached === '1';
}

export async function setDevPlusPreview(enabled: boolean): Promise<void> {
  await setFlag(DEV_PLUS_KEY, enabled ? '1' : '0');
}

export interface AvailablePlans {
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
  lifetime: PurchasesPackage | null;
  isLiveStore: boolean;
}

export async function getAvailablePlans(): Promise<AvailablePlans> {
  if (!configured) {
    await initEntitlements();
  }
  if (!configured || isRunningInExpoGo()) {
    return { annual: null, monthly: null, lifetime: null, isLiveStore: false };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) {
      return { annual: null, monthly: null, lifetime: null, isLiveStore: false };
    }
    return {
      annual: current.annual ?? null,
      monthly: current.monthly ?? null,
      lifetime: current.lifetime ?? null,
      isLiveStore: Boolean(current.annual || current.monthly || current.lifetime),
    };
  } catch {
    return { annual: null, monthly: null, lifetime: null, isLiveStore: false };
  }
}

export async function purchasePlan(
  pkg: PurchasesPackage
): Promise<{ success: boolean; cancelled?: boolean; error?: string }> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = hasEntitlementInInfo(customerInfo);
    await setFlag(CACHED_RC_PLUS_KEY, active ? '1' : '0');
    return { success: active };
  } catch (err: unknown) {
    const maybeErr = err as { userCancelled?: boolean; message?: string };
    if (maybeErr?.userCancelled) {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      error: maybeErr?.message ?? 'Could not complete purchase. Please try again.',
    };
  }
}

export async function restoreStillwaterPurchases(): Promise<{
  restored: boolean;
  error?: string;
}> {
  if (!configured) {
    await initEntitlements();
  }
  if (!configured || isRunningInExpoGo()) {
    const scholarship = await hasActiveGraceScholarship();
    return {
      restored: scholarship,
      error: scholarship
        ? undefined
        : 'Store restore requires an App Store or Google Play development build.',
    };
  }

  try {
    const info = await Purchases.restorePurchases();
    const active = hasEntitlementInInfo(info);
    await setFlag(CACHED_RC_PLUS_KEY, active ? '1' : '0');
    return { restored: active };
  } catch (err: unknown) {
    const maybeErr = err as { message?: string };
    return {
      restored: false,
      error: maybeErr?.message ?? 'Unable to restore purchases right now.',
    };
  }
}

/**
 * Native OS Offer Code redemption for Church Partner Licenses (Guideline 3.1.1 compliant).
 */
export async function openNativeOfferCodeRedemption(): Promise<void> {
  if (Platform.OS === 'ios' && configured && !isRunningInExpoGo()) {
    await Purchases.presentCodeRedemptionSheet();
    return;
  }
  if (Platform.OS === 'android') {
    await Linking.openURL('https://play.google.com/redeem');
    return;
  }
  throw new Error('Offer code redemption requires an installed iOS or Android store build.');
}