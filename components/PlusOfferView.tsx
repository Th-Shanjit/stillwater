import { OFFER_DISCLOSURES } from '../content/offerPolicy';

import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';

import {
  activateGraceScholarship,
  getAvailablePlans,
  getPlusAccess,
  openNativeOfferCodeRedemption,
  storeOffersEnabled,
  openSubscriptionManagement,
  purchasePlan,
  restoreStillwaterPurchases,
  type AvailablePlans,
} from '../db/entitlements';

import {
  FREE_BENEFITS,
  PLUS_BENEFITS,
  validLegalUrl,
  type PlusAccess,
  type PlanChoice,
} from '../content/membershipPolicy';

import {
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
} from './StillwaterUI';

interface PlusOfferViewProps {
  eyebrow?: string;
  headline?: string;
  freeActionLabel?: string;
  onUnlocked: () => void;
  onContinueFree: () => void;
}

const mode = 'day' as const;

const privacyUrl =
  process.env.EXPO_PUBLIC_PRIVACY_URL;

const termsUrl =
  process.env.EXPO_PUBLIC_TERMS_URL;

const legalReady =
  validLegalUrl(privacyUrl) &&
  validLegalUrl(termsUrl);

const EMPTY_PLANS: AvailablePlans = {
  annual: null,
  monthly: null,
  lifetime: null,
  isLiveStore: false,
};

const CHOICES: {
  id: PlanChoice;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'annual',
    title: 'Annual',
    subtitle: 'Billed annually',
  },
  {
    id: 'monthly',
    title: 'Monthly',
    subtitle: 'Billed monthly',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    subtitle: 'One-time purchase of core Plus access',
  },
];

function accessLabel(access: PlusAccess): string {
  switch (access.source) {
    case 'store_subscription':
      return 'Active store membership';
    case 'store_no_expiry':
      return 'Store access without an expiry date';
    case 'scholarship':
      return 'Grace Scholarship';
    case 'development':
      return 'Development preview';
    case 'free':
      return 'Free membership';
    default:
      return 'Store access could not be checked';
  }
}

async function readMembership() {
  const [access, plans] = await Promise.all([
    getPlusAccess(),
    getAvailablePlans(),
  ]);

  return { access, plans };
}

export function PlusOfferView({
  eyebrow = 'STILLWATER PLUS',
  headline = 'Go a little deeper.',
  freeActionLabel = 'Continue free',
  onUnlocked,
  onContinueFree,
}: PlusOfferViewProps) {
  const [plans, setPlans] =
    useState<AvailablePlans>(EMPTY_PLANS);

  const [access, setAccess] =
    useState<PlusAccess | null>(null);

  const [selected, setSelected] =
    useState<PlanChoice>('annual');

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [feedback, setFeedback] =
    useState('');

  const [scholarship, setScholarship] =
    useState(false);

  const lock = useRef(false);

  useEffect(() => {
    let active = true;

    readMembership()
      .then(result => {
        if (!active) return;

        setAccess(result.access);
        setPlans(result.plans);

        setSelected(
          result.plans.annual
            ? 'annual'
            : result.plans.monthly
              ? 'monthly'
              : 'lifetime'
        );
      })
      .catch(() => {
        if (active) {
          setFeedback(
            'Unable to retrieve membership information.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const perform = async (
    action: () => Promise<void>
  ) => {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setFeedback('');

    try {
      await action();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Unable to complete this request.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const refresh = async () => {
    const result = await readMembership();

    setAccess(result.access);
    setPlans(result.plans);

    setSelected(previous =>
      result.plans[previous]
        ? previous
        : result.plans.annual
          ? 'annual'
          : result.plans.monthly
            ? 'monthly'
            : 'lifetime'
    );
  };

  const activePackage = plans[selected];

  const availableChoices = CHOICES.filter(
    choice => Boolean(plans[choice.id])
  );

  const close = () => {
    if (!lock.current) onContinueFree();
  };

  if (scholarship) {
    return (
      <View style={{ gap: 16 }}>
        <V2Artwork mode={mode}
          kind="growth" height={140} />

        <V2Text mode={mode} variant="display">
          The Grace Scholarship
        </V2Text>

        <V2Text mode={mode}>
          If paid access is out of reach, you can activate
          one year of core Plus access on this device.
        </V2Text>

        <V2Text mode={mode} muted>
          This local hardship pass is not a store purchase.
          It does not require payment or automatically
          create a subscription.
        </V2Text>

        <V2Button mode={mode}
          label="Activate 1-year scholarship"
          disabled={busy || loading}
          onPress={() => void perform(async () => {
            await activateGraceScholarship();
            onUnlocked();
          })} />

        <V2Button mode={mode} tone="quiet"
          label="Back to membership"
          disabled={busy}
          onPress={() => setScholarship(false)} />

        {feedback !== '' && (
          <V2Text mode={mode}>{feedback}</V2Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <V2Artwork mode={mode}
        kind="water" height={150} />

      <V2Text mode={mode} muted variant="label">
        {eyebrow}
      </V2Text>

      <V2Text mode={mode} variant="display">
        {headline}
      </V2Text>

      <V2Text mode={mode} muted>
        Essential support and privacy remain free.
        Plus offers additional structured content.
      </V2Text>

      <V2Card mode={mode} tonal>
        <V2Text mode={mode} variant="section">
          Your membership
        </V2Text>

        <V2Text mode={mode}>
          {loading
            ? 'Checking membership...'
            : access
              ? accessLabel(access)
              : 'Membership unavailable'}
        </V2Text>

        {access?.expiresAt && (
          <V2Text mode={mode} muted variant="secondary">
            Current access period ends {
              new Date(access.expiresAt).toLocaleDateString()
            }
          </V2Text>
        )}

        <V2Button mode={mode} tone="quiet"
          icon="refresh-cw" label="Refresh membership"
          disabled={loading || busy}
          onPress={() => void perform(refresh)} />
      </V2Card>

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          Included in Plus
        </V2Text>

        {PLUS_BENEFITS.map(item => (
          <V2Text key={item} mode={mode}>
            {'✓ ' + item}
          </V2Text>
        ))}

        <V2Text mode={mode} muted variant="secondary">
          Guided practices currently use text where
          recordings are not yet available.
        </V2Text>
      </V2Card>

      {!access?.active && !loading && (
        <>
          {availableChoices.map(choice => {
            const pkg = plans[choice.id];

            if (!pkg) return null;

            return (
              <V2Card key={choice.id}
                mode={mode}
                tonal={selected === choice.id}>

                <V2Text mode={mode} variant="section">
                  {choice.title}
                </V2Text>

                <V2Text mode={mode} variant="heading">
                  {pkg.product.priceString}
                </V2Text>

                <V2Text mode={mode}
                  muted variant="secondary">
                  {choice.subtitle}
                </V2Text>

                <V2Button mode={mode}
                  tone={selected === choice.id
                    ? 'primary'
                    : 'secondary'}
                  icon={selected === choice.id
                    ? 'check'
                    : undefined}
                  label={selected === choice.id
                    ? 'Selected'
                    : 'Select ' + choice.title.toLowerCase()}
                  disabled={busy}
                  onPress={() =>
                    setSelected(choice.id)
                  } />
              </V2Card>
            );
          })}

          {availableChoices.length === 0 && (
            <V2Text mode={mode} muted>
              Store plans are currently unavailable.
              Your free features remain accessible.
            </V2Text>
          )}

          {!legalReady && (
            <V2Text mode={mode}
              muted variant="secondary">
              Purchases are unavailable until the privacy
              policy and terms are configured.
            </V2Text>
          )}

          <V2Button mode={mode}
            label={busy
              ? 'Connecting...'
              : activePackage
                ? 'Continue · ' + activePackage.product.priceString
                : 'Store plan unavailable'}
            disabled={
              busy || loading || !activePackage ||
              !legalReady || access?.source === 'unavailable'
            }
            onPress={() => void perform(async () => {
              if (!activePackage || !legalReady) return;

              const result = await purchasePlan(
                activePackage
              );

              if (result.success) {
                onUnlocked();
              } else if (!result.cancelled) {
                setFeedback(
                  result.error ??
                  'Plus access has not been confirmed. Restore purchases before retrying.'
                );
              }
            })} />

          <V2Text mode={mode} muted variant="secondary">
            {selected === 'lifetime'
              ? 'One-time purchase of core local Plus features. Separately licensed content and future hosted services may be offered separately.'
              : 'Subscriptions renew automatically unless cancelled. The store shows the final price, renewal terms and any eligible offer before confirmation.'}
          </V2Text>
        </>
      )}

      {feedback !== '' && (
        <V2Card mode={mode}>
          <V2Text mode={mode}>{feedback}</V2Text>
        </V2Card>
      )}

      <V2Button mode={mode} tone="secondary"
        label={access?.active
          ? 'Continue'
          : freeActionLabel}
        disabled={busy}
        onPress={close} />

      <V2Button mode={mode} tone="quiet"
        label="Restore purchases"
        disabled={busy || loading}
        onPress={() => void perform(async () => {
          const result = await restoreStillwaterPurchases();

          if (result.restored) {
            onUnlocked();
          } else {
            setFeedback(
              result.error ??
              'No active purchased Plus access was found.'
            );
          }
        })} />

      <V2Button mode={mode} tone="quiet"
        label="Manage store subscription"
        disabled={busy || loading}
        onPress={() => void perform(
          openSubscriptionManagement
        )} />

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          Received an access offer?
        </V2Text>

        <V2Text mode={mode} muted>
          Redeem an eligible promotional or partner
          offer through your original app store.
        </V2Text>

        {storeOffersEnabled() ? (
          <>
            {OFFER_DISCLOSURES.map(item => (
              <V2Text key={item} mode={mode}
                muted variant="secondary">
                {item}
              </V2Text>
            ))}

            <V2Button mode={mode}
              tone="secondary"
              icon="gift"
              label="Redeem store offer"
              disabled={busy || loading}
              onPress={() => void perform(async () => {
                await openNativeOfferCodeRedemption();

                setFeedback(
                  'After redeeming your offer, refresh membership or restore purchases to confirm access.'
                );
              })} />

            <V2Button mode={mode}
              tone="quiet"
              label="Check membership after redemption"
              disabled={busy || loading}
              onPress={() => void perform(refresh)} />
          </>
        ) : (
          <V2Text mode={mode}
            muted variant="secondary">
            Promotional and partner offers are not
            currently enabled for this build.
          </V2Text>
        )}
      </V2Card>

      {!access?.active && (
        <V2Button mode={mode} tone="quiet"
          label="Cannot afford Plus? Grace Scholarship"
          disabled={busy || loading}
          onPress={() => setScholarship(true)} />
      )}

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          Always free
        </V2Text>

        {FREE_BENEFITS.map(item => (
          <V2Text key={item} mode={mode} muted>
            {'✓ ' + item}
          </V2Text>
        ))}
      </V2Card>

      {validLegalUrl(privacyUrl) && privacyUrl && (
        <V2Button mode={mode} tone="quiet"
          label="Privacy policy"
          disabled={busy}
          onPress={() => void perform(async () => {
            await Linking.openURL(privacyUrl);
          })} />
      )}

      {validLegalUrl(termsUrl) && termsUrl && (
        <V2Button mode={mode} tone="quiet"
          label="Terms of use"
          disabled={busy}
          onPress={() => void perform(async () => {
            await Linking.openURL(termsUrl);
          })} />
      )}
    </View>
  );
}
