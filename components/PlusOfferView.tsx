import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import {
  activateGraceScholarship,
  AvailablePlans,
  getAvailablePlans,
  isRunningInExpoGo,
  openNativeOfferCodeRedemption,
  purchasePlan,
  restoreStillwaterPurchases,
  setDevPlusPreview,
} from '../db/entitlements';
import { PrimaryButton, SecondaryButton, StillwaterMark } from './RoyalUI';

type PlanChoice = 'annual' | 'monthly' | 'lifetime';

interface PlusOfferViewProps {
  eyebrow?: string;
  headline?: string;
  freeActionLabel?: string;
  onUnlocked: () => void;
  onContinueFree: () => void;
}

const BENEFITS = [
  'Full 30-Day Root-Cause Recovery Path (Weeks 1–4)',
  'All Eyes-Closed Midnight Rescue audio companions',
  'Zero-Spyware Night Guard & 90-Day Weather Map',
];

export function PlusOfferView({
  eyebrow = 'STILLWATER PLUS · 14 DAYS FREE',
  headline = 'Go deeper in the daylight.',
  freeActionLabel = 'Continue with Free Sanctuary',
  onUnlocked,
  onContinueFree,
}: PlusOfferViewProps) {
  const [plans, setPlans] = useState<AvailablePlans>({
    annual: null,
    monthly: null,
    lifetime: null,
    isLiveStore: false,
  });
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selected, setSelected] = useState<PlanChoice>('annual');
  const [busy, setBusy] = useState(false);
  const [showScholarship, setShowScholarship] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    getAvailablePlans()
      .then(setPlans)
      .finally(() => setLoadingPlans(false));
  }, []);

  const annualPrice = plans.annual?.product.priceString ?? '$49.99';
  const monthlyPrice = plans.monthly?.product.priceString ?? '$6.99';
  const lifetimePrice = plans.lifetime?.product.priceString ?? '$119.99';

  const activePackage: PurchasesPackage | null =
    selected === 'annual'
      ? plans.annual
      : selected === 'monthly'
        ? plans.monthly
        : plans.lifetime;

  const ctaLabel =
    selected === 'annual'
      ? `Start 14-day free trial · ${annualPrice}/yr`
      : selected === 'monthly'
        ? `Continue monthly · ${monthlyPrice}/mo`
        : `Unlock lifetime · ${lifetimePrice}`;

  const handleSubscribe = async () => {
    if (busy) return;
    setFeedback(null);
    setBusy(true);

    try {
      if (!activePackage) {
        if (__DEV__ || isRunningInExpoGo()) {
          await setDevPlusPreview(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          onUnlocked();
          return;
        }
        setFeedback('Store plans are still syncing. Please try again in a moment.');
        return;
      }

      const result = await purchasePlan(activePackage);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onUnlocked();
      } else if (!result.cancelled && result.error) {
        setFeedback(result.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (busy) return;
    setFeedback(null);
    setBusy(true);
    try {
      const res = await restoreStillwaterPurchases();
      if (res.restored) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onUnlocked();
      } else {
        setFeedback(res.error ?? 'No active Stillwater Plus subscription found on this account.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRedeemCode = async () => {
    setFeedback(null);
    try {
      await openNativeOfferCodeRedemption();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to open offer code sheet.';
      Alert.alert('Church Offer Code', msg);
    }
  };

  const handleActivateScholarship = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await activateGraceScholarship();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onUnlocked();
    } finally {
      setBusy(false);
    }
  };

  if (showScholarship) {
    return (
      <View style={styles.block}>
        <Text style={styles.eyebrow}>THE GRACE PROMISE</Text>
        <Text style={styles.headline}>No one turned away for money.</Text>
        <Text style={styles.body}>
          If $49.99/year is genuinely out of reach right now—whether you are a student, between jobs, or carrying a heavy season—activate a full 1-year Grace Scholarship right here. No forms, no tracking, no questions asked.
        </Text>

        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Your scholarship unlocks all 30 recovery modules and Midnight Rescue audio on this device for 12 months.
          </Text>
        </View>

        <PrimaryButton
          label={busy ? 'Activating...' : 'Activate 1-year Grace Scholarship'}
          onPress={handleActivateScholarship}
          disabled={busy}
        />
        <SecondaryButton
          label="Back to plans"
          onPress={() => setShowScholarship(false)}
          disabled={busy}
        />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.brandRow}>
        <StillwaterMark size={22} color={Palette.light.scripture} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>

      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>
        Crisis tools—The Pause, Grace Reset, Evening Examen, and Week 1—stay free forever. Stillwater Plus keeps the app 100% private, local-first, and ad-free.
      </Text>

      {/* Benefits Card */}
      <View style={styles.groupedCard}>
        {BENEFITS.map((item, idx) => (
          <View key={item}>
            {idx > 0 && <View style={styles.divider} />}
            <View style={styles.benefitRow}>
              <Feather name="check" size={18} color={Palette.light.success} />
              <Text style={styles.benefitText}>{item}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Plan Selector */}
      {loadingPlans ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator color={Palette.light.primary} />
        </View>
      ) : (
        <View style={styles.planList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected === 'annual' }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setSelected('annual');
            }}
            style={[styles.planCard, selected === 'annual' && styles.planCardActive]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.planTitleRow}>
                <Text style={styles.planTitle}>Annual</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>14 days free</Text>
                </View>
              </View>
              <Text style={styles.planSub}>Best value · Cancel anytime before Day 14</Text>
            </View>
            <Text style={styles.planPrice}>{annualPrice}/yr</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected === 'monthly' }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setSelected('monthly');
            }}
            style={[styles.planCard, selected === 'monthly' && styles.planCardActive]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.planTitle}>Monthly</Text>
              <Text style={styles.planSub}>Flexible month-to-month support</Text>
            </View>
            <Text style={styles.planPrice}>{monthlyPrice}/mo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: selected === 'lifetime' }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setSelected('lifetime');
            }}
            style={[styles.planCard, selected === 'lifetime' && styles.planCardActive]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.planTitle}>Lifetime</Text>
              <Text style={styles.planSub}>Pay once, keep Stillwater Plus forever</Text>
            </View>
            <Text style={styles.planPrice}>{lifetimePrice}</Text>
          </Pressable>
        </View>
      )}

      {feedback && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      <View style={styles.ctaGroup}>
        <PrimaryButton
          label={busy ? 'Connecting to store...' : ctaLabel}
          onPress={handleSubscribe}
          disabled={busy}
        />
        <SecondaryButton
          label={freeActionLabel}
          onPress={onContinueFree}
          disabled={busy}
        />
      </View>

      {/* Transparent Renewal Disclosure + Restore / Church Code / Scholarship */}
      <Text style={styles.legalNote}>
        {selected === 'lifetime'
          ? 'One-time purchase billed through your App Store or Google Play account.'
          : 'Subscriptions renew automatically unless canceled at least 24 hours before the end of the trial or billing period in device settings.'}
      </Text>

      <View style={styles.footerLinks}>
        <Pressable onPress={handleRestore} hitSlop={8} style={styles.footerBtn}>
          <Text style={styles.footerLink}>Restore purchases</Text>
        </Pressable>
        <Text style={styles.footerDot}>·</Text>
        <Pressable onPress={handleRedeemCode} hitSlop={8} style={styles.footerBtn}>
          <Text style={styles.footerLink}>Church offer code</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => setShowScholarship(true)}
        hitSlop={8}
        style={styles.scholarshipBtn}
      >
        <Text style={styles.scholarshipLink}>
          Cannot afford Plus right now? Request a free Grace Scholarship
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.md },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  eyebrow: { ...Typography.label, color: Palette.light.scripture },
  headline: { ...Typography.display, fontSize: 30, lineHeight: 36, color: Palette.light.text },
  body: { ...Typography.body, fontSize: 15, lineHeight: 22, color: Palette.light.textSecondary },
  groupedCard: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    paddingHorizontal: Spacing.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 13,
  },
  benefitText: { ...Typography.body, fontSize: 14, lineHeight: 20, color: Palette.light.text, flex: 1 },
  divider: { height: Sizes.borderWidth, backgroundColor: Palette.light.border },
  loaderBox: { paddingVertical: Spacing.xl, alignItems: 'center' },
  planList: { gap: Spacing.sm },
  planCard: {
    minHeight: 68,
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.standard,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  planCardActive: {
    borderWidth: 2,
    borderColor: Palette.light.primary,
    backgroundColor: Palette.light.primaryTonal,
  },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  planTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 16,
    fontWeight: '700',
    color: Palette.light.text,
  },
  planSub: { ...Typography.secondary, fontSize: 12, color: Palette.light.textSecondary },
  planPrice: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: Palette.light.text,
  },
  badge: {
    backgroundColor: Palette.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: Typography.sansFamily,
    fontSize: 11,
    fontWeight: '700',
    color: Palette.light.onPrimary,
  },
  callout: {
    backgroundColor: Palette.light.scriptureTonal,
    borderRadius: Radius.standard,
    padding: Spacing.lg,
  },
  calloutText: { ...Typography.body, fontSize: 15, color: Palette.light.scripture },
  feedbackBox: {
    backgroundColor: Palette.light.supportBackground,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.supportBorder,
    borderRadius: Radius.standard,
    padding: Spacing.md,
  },
  feedbackText: { ...Typography.secondary, color: Palette.light.support },
  ctaGroup: { gap: Spacing.sm, marginTop: Spacing.xs },
  legalNote: {
    ...Typography.secondary,
    fontSize: 12,
    lineHeight: 17,
    color: Palette.light.textSecondary,
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  footerBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  footerLink: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.primary,
  },
  footerDot: { color: Palette.light.textSecondary },
  scholarshipBtn: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  scholarshipLink: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.scripture,
    textAlign: 'center',
  },
});