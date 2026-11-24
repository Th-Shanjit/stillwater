import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import { ToneTrack, updatePreferences } from '../db/queries';
import { requestNotificationPermission, scheduleDailyRhythms } from '../db/notifications';
import {
  ChoiceChip,
  PrimaryButton,
  StepBar,
  StillwaterMark,
  useScreenInset,
} from '../components/RoyalUI';
import { PlusOfferView } from '../components/PlusOfferView';

const WINDOWS = [
  'Late night in bed',
  'Home alone',
  'After high-stress work',
  'Weekend afternoons',
  'Scrolling without realizing it',
];

const BEDTIMES = [
  { label: '9:30 PM', value: '21:30' },
  { label: '10:00 PM', value: '22:00' },
  { label: '10:30 PM', value: '22:30' },
  { label: '11:00 PM', value: '23:00' },
  { label: '11:30 PM', value: '23:30' },
  { label: '12:00 AM', value: '00:00' },
];

const ICONS = [
  { id: 'open_book', label: 'Open Book' },
  { id: 'still_wave', label: 'Still Wave' },
  { id: 'linen_mark', label: 'Linen Mark' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();
  const [step, setStep] = useState(0);
  const [track, setTrack] = useState<ToneTrack>('scripture');
  const [windows, setWindows] = useState<string[]>(['Late night in bed']);
  const [bedtime, setBedtime] = useState('22:30');
  const [biometricLock, setBiometricLock] = useState(false);
  const [keepLocalOnly, setKeepLocalOnly] = useState(true);
  const [appIcon, setAppIcon] = useState('linen_mark');
  const [saving, setSaving] = useState(false);

  const toggleWindow = (w: string) => {
    Haptics.selectionAsync().catch(() => {});
    setWindows((prev) => (prev.includes(w) ? prev.filter((i) => i !== w) : [...prev, w]));
  };

  const handleToggleBiometrics = async (nextVal: boolean) => {
    if (!nextVal) {
      setBiometricLock(false);
      return;
    }
    try {
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricLock(Boolean(hasHw && enrolled));
    } catch {
      setBiometricLock(false);
    }
  };

  const handleSavePrivacyAndContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updatePreferences({
        tone_track: track,
        vulnerable_windows: windows,
        bedtime_hhmm: bedtime,
        biometric_lock: biometricLock,
        save_laments: !keepLocalOnly,
        app_icon: appIcon,
        onboarded_at: new Date().toISOString(),
      });

      try {
        const granted = await requestNotificationPermission();
        if (granted) {
          await scheduleDailyRhythms('07:30', bedtime);
        }
      } catch {
        // Local notifications gracefully skipped if unavailable in Expo Go
      }

      setStep(4);
    } finally {
      setSaving(false);
    }
  };

  const handleEnterApp = async () => {
    await updatePreferences({ onboarding_completed: true });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
        showsVerticalScrollIndicator={false}
      >
        {step > 0 && <StepBar total={4} current={step - 1} />}

        {step === 0 && (
          <View style={styles.block}>
            <View style={styles.brandRow}>
              <StillwaterMark size={28} color={Palette.light.scripture} />
              <Text style={styles.wordmark}>stillwater.</Text>
            </View>
            <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
              An undivided heart, one ordinary day at a time.
            </Text>
            <Text style={styles.body}>
              A quiet companion for stepping out of compulsive habits—without streaks, shame, or surveillance.
            </Text>
            <PrimaryButton label="Begin" onPress={() => setStep(1)} style={{ marginTop: Spacing.md }} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.block}>
            <Text style={styles.eyebrow}>1 OF 4 · CHOOSE YOUR VOICE</Text>
            <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
              How does prayer usually feel most natural to you?
            </Text>
            <Text style={styles.body}>You can switch this anytime.</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: track === 'scripture' }}
              style={[styles.choiceCard, track === 'scripture' && styles.choiceCardActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setTrack('scripture');
              }}
            >
              <Text style={styles.choiceTitle}>Scripture & Reflection</Text>
              <Text style={styles.choiceSub}>
                Plainspoken daily anchors rooted in honest biblical passages and grounded reflection.
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: track === 'liturgical' }}
              style={[styles.choiceCard, track === 'liturgical' && styles.choiceCardActive]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setTrack('liturgical');
              }}
            >
              <Text style={styles.choiceTitle}>Liturgical & Contemplative</Text>
              <Text style={styles.choiceSub}>
                Rhythmic breath prayers, evening stillness, and ancient practices of watchfulness.
              </Text>
            </Pressable>

            <PrimaryButton label="Continue" onPress={() => setStep(2)} style={{ marginTop: Spacing.sm }} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.block}>
            <Text style={styles.eyebrow}>2 OF 4 · YOUR VULNERABLE WINDOW</Text>
            <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
              When does the noise usually get loudest?
            </Text>
            <Text style={styles.body}>
              Knowing your tired hours helps Stillwater meet you before autopilot takes over.
            </Text>

            <View style={styles.pillWrap}>
              {WINDOWS.map((w) => (
                <ChoiceChip
                  key={w}
                  label={w}
                  selected={windows.includes(w)}
                  onPress={() => toggleWindow(w)}
                />
              ))}
            </View>

            <Text style={styles.label}>When do you usually wind down for sleep?</Text>
            <Text style={styles.smallNote}>We’ll send one quiet nudge 30 minutes before.</Text>

            <View style={styles.pillWrap}>
              {BEDTIMES.map((b) => (
                <ChoiceChip
                  key={b.value}
                  label={b.label}
                  selected={bedtime === b.value}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBedtime(b.value);
                  }}
                />
              ))}
            </View>

            <PrimaryButton label="Continue" onPress={() => setStep(3)} style={{ marginTop: Spacing.sm }} />
          </View>
        )}

        {step === 3 && (
          <View style={styles.block}>
            <Text style={styles.eyebrow}>3 OF 4 · PRIVACY & DISGUISE</Text>
            <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
              This stays between you and God.
            </Text>
            <Text style={styles.body}>
              Your reflections live strictly on your device—never sold, never tracked, never reported to anyone else.
            </Text>

            <View style={styles.groupedSurface}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>Require Biometric Lock</Text>
                  <Text style={styles.smallNote}>
                    Use FaceID or fingerprint when returning to Stillwater
                  </Text>
                </View>
                <Switch
                  value={biometricLock}
                  onValueChange={handleToggleBiometrics}
                  trackColor={{ true: Palette.light.primary, false: Palette.light.border }}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceTitle}>Burn Box Laments</Text>
                  <Text style={styles.smallNote}>
                    Dissolve raw laments immediately without saving to disk
                  </Text>
                </View>
                <Switch
                  value={keepLocalOnly}
                  onValueChange={setKeepLocalOnly}
                  trackColor={{ true: Palette.light.primary, false: Palette.light.border }}
                />
              </View>
            </View>

            <Text style={styles.label}>Discreet Icon Style</Text>
            <View style={styles.pillWrap}>
              {ICONS.map((icon) => (
                <ChoiceChip
                  key={icon.id}
                  label={icon.label}
                  selected={appIcon === icon.id}
                  onPress={() => setAppIcon(icon.id)}
                />
              ))}
            </View>

            <View style={styles.notifPreview}>
              <Text style={styles.eyebrow}>LOCK-SCREEN NOTIFICATION PREVIEW</Text>
              <Text style={styles.notifTitle}>Stillwater</Text>
              <Text style={styles.notifBody}>Your evening reflection is ready.</Text>
            </View>

            <PrimaryButton
              label={saving ? 'Saving preferences...' : 'Continue'}
              onPress={handleSavePrivacyAndContinue}
              disabled={saving}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {step === 4 && (
          <PlusOfferView
            eyebrow="4 OF 4 · STILLWATER PLUS"
            headline="Try Stillwater Plus free for 14 days."
            freeActionLabel="Continue with Free Sanctuary"
            onUnlocked={handleEnterApp}
            onContinueFree={handleEnterApp}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.xl },
  block: { gap: Spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  wordmark: {
    fontFamily: Typography.sansFamily,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -1.1,
    color: Palette.light.text,
  },
  eyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  title: { color: Palette.light.text },
  body: { ...Typography.body, color: Palette.light.textSecondary },
  label: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.light.text,
    marginTop: Spacing.xs,
  },
  smallNote: { ...Typography.secondary, color: Palette.light.textSecondary },
  choiceCard: {
    backgroundColor: Palette.light.surface,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    borderRadius: Radius.group,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  choiceCardActive: {
    borderWidth: 2,
    borderColor: Palette.light.primary,
    backgroundColor: Palette.light.primaryTonal,
  },
  choiceTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 16,
    fontWeight: '700',
    color: Palette.light.text,
  },
  choiceSub: { ...Typography.secondary, fontSize: 14, color: Palette.light.textSecondary },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  groupedSurface: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    paddingHorizontal: Spacing.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  divider: { height: Sizes.borderWidth, backgroundColor: Palette.light.border },
  notifPreview: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.group,
    padding: Spacing.lg,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    gap: Spacing.xs,
  },
  notifTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.light.text,
  },
  notifBody: { ...Typography.secondary, fontSize: 14, color: Palette.light.textSecondary },
});