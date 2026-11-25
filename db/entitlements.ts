import { permitsOfferRedemption } from '../content/offerPolicy';
import { resolvePlusAccess, validStorePlan, validLegalUrl, type PlusAccess, type PlanChoice } from '../content/membershipPolicy';
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

let configured = false;
let configuration: Promise<boolean> | null = null;
let transactionBusy = false;

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

export async function initEntitlements():
  Promise<boolean> {
  if (configured) return true;
  if (configuration) return configuration;

  if (
    Platform.OS === 'web' ||
    isRunningInExpoGo()
  ) return false;

  const apiKey = getPlatformApiKey();
  if (!apiKey) return false;

  configuration = (async () => {
    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey });
      }

      configured = true;
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await configuration;
  } finally {
    configuration = null;
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
 * Use RevenueCat CustomerInfo and its native caching for purchased access.
 */

export async function getPlusAccess():
  Promise<PlusAccess> {
  const scholarshipUntil =
    await getFlag(SCHOLARSHIP_UNTIL_KEY)
      .catch(() => null);

  const development = __DEV__
    ? await getFlag(DEV_PLUS_KEY)
      .then(value => value === '1')
      .catch(() => false)
    : false;

  let store: CustomerInfo | null = null;
  let storeChecked = false;

  if (await initEntitlements()) {
    try {
      store = await Purchases.getCustomerInfo();
      storeChecked = true;
    } catch {
      // Do not invent paid access when verification fails.
      // RevenueCat can return its supported cached access.
    }
  }

  return resolvePlusAccess({
    store: store?.entitlements.active[PLUS_ENTITLEMENT_ID]
      ?? null,
    storeChecked,
    scholarshipUntil,
    development,
    now: Date.now(),
  });
}

export async function hasStillwaterPlus():
  Promise<boolean> {
  // Local scholarship access remains available offline.
  if (
    await hasActiveGraceScholarship().catch(() => false)
  ) return true;

  if (__DEV__) {
    const preview = await getFlag(DEV_PLUS_KEY)
      .catch(() => null);

    if (preview === '1') return true;
  }

  if (!(await initEntitlements())) return false;

  try {
    return hasEntitlementInInfo(
      await Purchases.getCustomerInfo()
    );
  } catch {
    return false;
  }
}

export async function openSubscriptionManagement():
  Promise<void> {
  if (!(await initEntitlements())) {
    throw new Error('Store management is unavailable.');
  }

  const info = await Purchases.getCustomerInfo();
  const url = info.managementURL;

  if (!url || !url.startsWith('https://')) {
    throw new Error(
      'Manage your purchases through the original store account.'
    );
  }

  await Linking.openURL(url);
}

function matchesPlan(
  choice: PlanChoice,
  pkg: PurchasesPackage | null
): pkg is PurchasesPackage {
  return Boolean(pkg && validStorePlan(
    choice,
    String(pkg.packageType),
    pkg.product.subscriptionPeriod,
    pkg.product.priceString
  ));
}

export async function setDevPlusPreview(enabled: boolean): Promise<void> {
  if (!__DEV__) return;
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
    const annual = matchesPlan(
      'annual', current.annual ?? null
    ) ? current.annual : null;

    const monthly = matchesPlan(
      'monthly', current.monthly ?? null
    ) ? current.monthly : null;

    const lifetime = matchesPlan(
      'lifetime', current.lifetime ?? null
    ) ? current.lifetime : null;

    return {
      annual,
      monthly,
      lifetime,
      isLiveStore: Boolean(annual || monthly || lifetime),
    };
  } catch {
    return { annual: null, monthly: null, lifetime: null, isLiveStore: false };
  }
}


export async function purchasePlan(
  pkg: PurchasesPackage
): Promise<{
  success: boolean;
  cancelled?: boolean;
  error?: string;
}> {
  if (transactionBusy) {
    return {
      success: false,
      error: 'A store operation is already in progress.',
    };
  }

  transactionBusy = true;

  try {
    if (!(await initEntitlements())) {
      return {
        success: false,
        error: 'Store purchases are unavailable.',
      };
    }

    const supported = (
      ['annual', 'monthly', 'lifetime'] as const
    ).some(choice => matchesPlan(choice, pkg));

    if (!supported) {
      return {
        success: false,
        error: 'This store plan is not supported.',
      };
    }

    const existing = await Purchases.getCustomerInfo();

    if (hasEntitlementInInfo(existing)) {
      return { success: true };
    }

    const { customerInfo } =
      await Purchases.purchasePackage(pkg);

    return {
      success: hasEntitlementInInfo(customerInfo),
    };

  } catch (error: unknown) {
    const cancelled = Boolean(
      (error as { userCancelled?: boolean })
        ?.userCancelled
    );

    return cancelled
      ? { success: false, cancelled: true }
      : {
          success: false,
          error:
            'The store could not confirm Plus access. Check your purchase status or restore purchases before retrying.',
        };

  } finally {
    transactionBusy = false;
  }
}

export async function restoreStillwaterPurchases():
  Promise<{ restored: boolean; error?: string }> {
  if (transactionBusy) {
    return {
      restored: false,
      error: 'A store operation is already in progress.',
    };
  }

  transactionBusy = true;

  try {
    if (!(await initEntitlements())) {
      return {
        restored: false,
        error: 'Store restoration is unavailable.',
      };
    }

    const info = await Purchases.restorePurchases();

    return {
      restored: hasEntitlementInInfo(info),
    };

  } catch {
    return {
      restored: false,
      error: 'Unable to restore purchases right now.',
    };
  } finally {
    transactionBusy = false;
  }
}

/**
 * Native OS Offer Code redemption for Church Partner Licenses (Guideline 3.1.1 compliant).
 */

export function storeOffersEnabled(): boolean {
  const platform =
    Platform.OS === 'android'
      ? 'android'
      : Platform.OS === 'ios'
        ? 'ios'
        : 'unsupported';

  return permitsOfferRedemption({
    platform,

    androidEnabled:
      process.env.EXPO_PUBLIC_ANDROID_OFFERS_ENABLED === 'true',

    iosEnabled:
      process.env.EXPO_PUBLIC_IOS_OFFERS_ENABLED === 'true',

    legalReady:
      validLegalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL) &&
      validLegalUrl(process.env.EXPO_PUBLIC_TERMS_URL),

    supportedBuild:
      Platform.OS !== 'web' &&
      !isRunningInExpoGo(),
  });
}

export async function openNativeOfferCodeRedemption():
  Promise<void> {
  if (!storeOffersEnabled()) {
    throw new Error(
      'Store offers are not available in this build.'
    );
  }

  if (transactionBusy) {
    throw new Error(
      'A store operation is already in progress.'
    );
  }

  transactionBusy = true;

  try {
    if (!(await initEntitlements())) {
      throw new Error(
        'Store configuration is unavailable.'
      );
    }

    if (Platform.OS === 'ios') {
      await Purchases.presentCodeRedemptionSheet();
      return;
    }

    if (Platform.OS === 'android') {
      await Linking.openURL(
        'https://play.google.com/redeem'
      );

      return;
    }

    throw new Error(
      'Store offer redemption is unavailable.'
    );

  } finally {
    transactionBusy = false;
  }
}
