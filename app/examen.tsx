import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import { completeEveningExamen, getPreferences, ToneTrack } from '../db/queries';
import {
  ChoiceChip,
  PrimaryButton,
  SecondaryButton,
  StainedGlassArch,
  StillwaterMark,
  useScreenInset,
} from '../components/RoyalUI';
import examenPrompts from '../assets/content/examen_prompts.json';

type ExamenStep = 'consolation' | 'desolation' | 'surrender' | 'goodnight';

const DRAINED_OPTIONS = [
  'Work pressure',
  'Feeling unseen',
  'Physical fatigue',
  'Aimless scrolling',
  'Conflict or tension',
  'Quiet day — felt steady',
];

export default function ExamenModal() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();
  const { fontScale } = useWindowDimensions();

  const stackPrayerArt = isNarrow || fontScale > 1.2;
  const [step, setStep] = useState<ExamenStep>('consolation');
  const [track, setTrack] = useState<ToneTrack>('scripture');
  const [gratitude, setGratitude] = useState('');
  const [drainedTags, setDrainedTags] = useState<string[]>([]);

  useEffect(() => {
    getPreferences().then((p) => setTrack(p.tone_track));
  }, []);

  const prompt = examenPrompts[new Date().getDate() % examenPrompts.length];

  const toggleDrained = (label: string) => {
    Haptics.selectionAsync().catch(() => {});
    setDrainedTags((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await completeEveningExamen(
      gratitude,
      drainedTags.map((t) => t.toLowerCase().replace(/\s+/g, '_'))
    );
    setStep('goodnight');
  };

  const stepIndex = step === 'consolation' ? 0 : step === 'desolation' ? 1 : 2;

  return (
    <SafeAreaView style={styles.safe}>
      {step !== 'goodnight' && (
        <>
          <View style={[styles.topBar, { paddingHorizontal: inset }]}>
            <Text style={styles.eyebrow}>EVENING EXAMEN</Text>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: inset }}>
            <View
              style={styles.examenProgress}
              accessible
              accessibilityLabel={`Step ${stepIndex + 1} of 3`}
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    index <= stepIndex && styles.progressSegmentActive,
                  ]}
                />
              ))}
            </View>
          </View>
        </>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'consolation' && (
            <View style={styles.block}>
              <View style={styles.reflectionMark}>
                <StillwaterMark
                  size={32}
                  color={Palette.night.scriptureGold}
                />
              </View>
              <Text style={styles.stepNum}>1 OF 3 · WHERE GRACE MET YOU</Text>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.heading]}>
                {prompt.consolation}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="One quiet line (optional)..."
                placeholderTextColor={Palette.night.textSecondary}
                selectionColor={Palette.night.breathRing}
                keyboardAppearance="dark"
                accessibilityLabel={prompt.consolation}
                multiline
                value={gratitude}
                onChangeText={setGratitude}
              />
              <PrimaryButton label="Continue" onPress={() => setStep('desolation')} />
            </View>
          )}

          {step === 'desolation' && (
            <View style={styles.block}>
              <Text style={styles.stepNum}>2 OF 3 · WHERE YOU FELT STRETCHED</Text>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.heading]}>
                {prompt.desolation}
              </Text>
              <Text style={styles.subtext}>
                Not to judge yourself—just to notice what cost you energy today.
              </Text>

              <View style={styles.pillWrap}>
                {DRAINED_OPTIONS.map((item) => (
                  <ChoiceChip
                    key={item}
                    label={item}
                    selected={drainedTags.includes(item)}
                    mode="night"
                    onPress={() => toggleDrained(item)}
                  />
                ))}
              </View>

              <PrimaryButton label="Continue" onPress={() => setStep('surrender')} />
            </View>
          )}

          {step === 'surrender' && (
            <View style={styles.block}>
              <Text style={styles.stepNum}>3 OF 3 · LAY DOWN THE DAY</Text>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.heading]}>
                Release what is unfinished.
              </Text>

              <View
                style={[
                  styles.prayerCard,
                  stackPrayerArt && styles.prayerCardStacked,
                ]}
              >
                <Text style={styles.prayerText}>
                  {track === 'scripture'
                    ? '“You carried enough today. Hand the rest of the weight over—you are not required to hold the world together while you sleep.”'
                    : '“Into your hands I place the unfinished hours, the quiet wins, and the tired edges of today.”'}
                </Text>

                <StainedGlassArch
                  width={stackPrayerArt ? 56 : 66}
                  style={styles.prayerArtwork}
                />
              </View>

              <PrimaryButton label="Lay the day down" onPress={handleComplete} />
            </View>
          )}

          {step === 'goodnight' && (
            <View style={styles.goodnightStage}>
              <View
                style={styles.goodnightHalo}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <View style={styles.goodnightHaloInner}>
                  <StillwaterMark
                    size={42}
                    color={Palette.night.scriptureGold}
                  />
                </View>
              </View>
              <Text style={[Typography.display, styles.goodnightTitle]}>Today is finished.</Text>
              <Text style={styles.goodnightSub}>
                Plug your phone in across the room and rest.
              </Text>
              <SecondaryButton
                label="Goodnight"
                mode="night"
                onPress={() => router.back()}
                style={{ maxWidth: 220, marginTop: Spacing.lg }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.night.background },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: { ...Typography.label, color: Palette.night.textSecondary },
  closeBtn: { minHeight: Sizes.minTouchTarget, justifyContent: 'center' },
  closeText: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.night.primaryTonalText,
  },
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.xl },
  block: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: Spacing.xl,
  },
  examenProgress: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: Spacing.lg,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    backgroundColor: Palette.night.border,
  },
  progressSegmentActive: {
    backgroundColor: Palette.night.scriptureGold,
  },
  reflectionMark: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.sm,
  },
  stepNum: { ...Typography.label, color: Palette.night.scriptureGold },
  heading: { color: Palette.night.text },
  subtext: { ...Typography.body, color: Palette.night.textSecondary },
  input: {
    backgroundColor: Palette.night.surface,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.night.border,
    borderRadius: Radius.standard,
    padding: Spacing.lg,
    minHeight: 152,
    textAlignVertical: 'top',
    ...Typography.body,
    color: Palette.night.text,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  prayerCard: {
    backgroundColor: Palette.night.scripture,
    borderRadius: Radius.feature,
    overflow: 'hidden',
    padding: 20,
    minHeight: 175,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  prayerCardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  prayerArtwork: {
    position: 'relative',
    right: 0,
    bottom: 0,
    opacity: 1,
    flexShrink: 0,
    alignSelf: 'center',
  },
  prayerText: {
    ...Typography.scripture,
    fontFamily: Typography.scriptureItalicFamily,
    fontStyle: Platform.OS === 'android' ? 'normal' : 'italic',
    fontSize: 22,
    lineHeight: 32,
    color: Palette.night.scriptureText,
    flexShrink: 1,
    minWidth: 0,
  },
  goodnightHalo: {
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderColor: 'rgba(245, 216, 127, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  goodnightHaloInner: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Palette.night.surface,
    borderWidth: 1,
    borderColor: 'rgba(245, 216, 127, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goodnightStage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  goodnightTitle: {
    color: Palette.night.text,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  goodnightSub: {
    ...Typography.body,
    color: Palette.night.textSecondary,
    textAlign: 'center',
  },
});