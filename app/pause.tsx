import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import {
  getOffRampForEmotion,
  getPreferences,
  logPauseEvent,
  ToneTrack,
} from '../db/queries';
import {
  BreathRings,
  ChoiceChip,
  PrimaryButton,
  SecondaryButton,
  StepBar,
  useScreenInset,
} from '../components/RoyalUI';
import breathPrayers from '../assets/content/breath_prayers.json';

type PauseStep = 'breathe' | 'weather' | 'fork' | 'surf';

const EMOTIONS = [
  { key: 'exhausted', label: 'Exhausted', heading: 'Your body wants rest, not a screen.' },
  { key: 'lonely', label: 'Lonely', heading: 'You are hungry for real presence, not a substitute.' },
  { key: 'stressed', label: 'Stressed', heading: 'Your nervous system is asking for relief, not a trial.' },
  { key: 'bored', label: 'Bored', heading: 'Restlessness is just unspent energy looking for a door.' },
  { key: 'numb', label: 'Numb', heading: 'Trying to feel something fast usually leaves you emptier.' },
  { key: 'rejected', label: 'Rejected', heading: 'Pain wants anesthesia—let it be heard instead of hidden.' },
  { key: 'autopilot', label: 'Pure autopilot', heading: 'You caught the habit before it ran the script.' },
] as const;

const SURF_PROMPTS = [
  'You made it here before autopilot took over. Don’t try to force the craving out of your head—fighting a thought only hands it a megaphone.',
  'Unclench your jaw. Drop your shoulders an inch away from your ears. Let your breath stay slow and unhurried.',
  'An urge feels permanent when it hits, like an alarm that won’t stop until you obey it. Biologically, it is a wave—it builds, crests, and breaks on its own if you stay on the shore.',
  'The early desert monks noticed that stray images knock on every human mind. A thought knocking at the door is not a sin—it is just weather passing through.',
  'Ask quietly: What am I actually tired of or hungry for right now? Name that real need honestly before God. He is not annoyed by how human you are.',
  'When this timer finishes, don’t open another app. Lock the screen, set the phone out of reach, and do one ordinary physical thing.',
];

export default function PauseModal() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();
  const [step, setStep] = useState<PauseStep>('breathe');
  const [track, setTrack] = useState<ToneTrack>('scripture');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [selectedEmotion, setSelectedEmotion] = useState<(typeof EMOTIONS)[number] | null>(null);
  const [offRamp, setOffRamp] = useState('');
  const [surfSecondsLeft, setSurfSecondsLeft] = useState(180);
  const [usedSurf, setUsedSurf] = useState(false);

  const ringScale = useSharedValue(0.86);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPreferences().then((p) => setTrack(p.tone_track));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const activePrayer = useMemo(() => {
    const matching = breathPrayers.filter((p) => p.track === 'both' || p.track === track);
    return matching[0] ?? breathPrayers[0];
  }, [track]);

  const totalCycles = activePrayer.defaultCycles ?? 6;

  // 0.1 Hz Breath Prayer Loop (4s inhale / 6s exhale) — keeps rings static under reduced motion
  useEffect(() => {
    if (step !== 'breathe') return;

    let cancelled = false;
    let currentCycle = 0;

    const runCycle = () => {
      if (cancelled) return;
      setPhase('inhale');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (!reduceMotion) {
        ringScale.value = withTiming(1.06, {
          duration: activePrayer.inhaleMs,
          easing: Easing.inOut(Easing.sin),
        });
      }

      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setPhase('exhale');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
        if (!reduceMotion) {
          ringScale.value = withTiming(0.86, {
            duration: activePrayer.exhaleMs,
            easing: Easing.inOut(Easing.sin),
          });
        }

        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          currentCycle += 1;
          setCyclesCompleted(currentCycle);
          if (currentCycle < totalCycles) {
            runCycle();
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          }
        }, activePrayer.exhaleMs);
      }, activePrayer.inhaleMs);
    };

    runCycle();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, activePrayer, totalCycles, ringScale, reduceMotion]);

  useEffect(() => {
    if (step !== 'surf') return;
    setUsedSurf(true);
    const interval = setInterval(() => {
      setSurfSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : ringScale.value }],
  }));

  const handleSelectEmotion = async (emotion: (typeof EMOTIONS)[number]) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedEmotion(emotion);
    const plan = await getOffRampForEmotion(emotion.key);
    setOffRamp(plan);
    setStep('fork');
  };

  const handleFinish = async (outcome: 'steady' | 'exited_early' = 'steady') => {
    await logPauseEvent({
      emotionTag: selectedEmotion?.key,
      breathCyclesCompleted: cyclesCompleted,
      usedAudio: usedSurf,
      outcome,
    });
    router.back();
  };

  const surfIndex = Math.min(
    SURF_PROMPTS.length - 1,
    Math.floor((180 - surfSecondsLeft) / 30)
  );
  const formattedTimer = `${Math.floor(surfSecondsLeft / 60)}:${String(surfSecondsLeft % 60).padStart(2, '0')}`;
  const currentStepIdx = step === 'breathe' ? 0 : step === 'weather' ? 1 : 2;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.topBar, { paddingHorizontal: inset }]}>
        <Text style={styles.eyebrow}>THE PAUSE</Text>
        <Pressable
          onPress={() => handleFinish('exited_early')}
          hitSlop={12}
          accessibilityRole="button"
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: inset }}>
        <StepBar total={3} current={currentStepIdx} mode="night" />
      </View>

      {step === 'breathe' && (
        <View style={[styles.centerStage, { paddingHorizontal: inset }]}>
          <View style={styles.ringWrapper}>
            <Animated.View style={[styles.ringsAbsolute, animatedRingStyle]}>
              <BreathRings color={Palette.night.breathRing} size={230} />
            </Animated.View>
            <View style={styles.innerText}>
              <Text style={styles.phaseLabel}>
                {cyclesCompleted >= totalCycles
                  ? 'STEADY'
                  : phase === 'inhale'
                    ? 'INHALE · 4s'
                    : 'EXHALE · 6s'}
              </Text>
              <Text style={styles.prayerText}>
                {cyclesCompleted >= totalCycles
                  ? 'Your body has slowed down.'
                  : phase === 'inhale'
                    ? activePrayer.inhaleText
                    : activePrayer.exhaleText}
              </Text>
            </View>
          </View>

          <Text style={styles.cycleCount}>
            {Math.min(cyclesCompleted, totalCycles)} of {totalCycles} slow breaths
          </Text>

          {cyclesCompleted >= totalCycles ? (
            <PrimaryButton label="Continue" onPress={() => setStep('weather')} />
          ) : (
            <SecondaryButton
              label="Skip ahead to check-in"
              mode="night"
              onPress={() => setStep('weather')}
            />
          )}
        </View>
      )}

      {step === 'weather' && (
        <ScrollView
          contentContainerStyle={[styles.contentStage, { paddingHorizontal: inset }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.heading]}>
            A pull knocking at the door is not a moral verdict.
          </Text>
          <Text style={styles.subtext}>
            It is just noise passing through a tired mind. What are you actually carrying underneath this urge?
          </Text>

          <View style={styles.pillWrap}>
            {EMOTIONS.map((e) => (
              <ChoiceChip
                key={e.key}
                label={e.label}
                selected={selectedEmotion?.key === e.key}
                mode="night"
                onPress={() => handleSelectEmotion(e)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {step === 'fork' && selectedEmotion && (
        <ScrollView
          contentContainerStyle={[styles.contentStage, { paddingHorizontal: inset }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.goldEyebrow}>
            UNDERNEATH THE PULL · {selectedEmotion.label.toUpperCase()}
          </Text>
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.heading]}>
            {selectedEmotion.heading}
          </Text>
          <Text style={styles.subtext}>
            You do not need to win the whole month tonight—just the next ten minutes.
          </Text>

          <View style={styles.offRampCard}>
            <Text style={styles.eyebrow}>YOUR CHOSEN OFF-RAMP</Text>
            <Text style={styles.offRampText}>{offRamp}</Text>
          </View>

          <View style={styles.forkButtons}>
            <PrimaryButton
              label="I’m steady — close for now"
              onPress={() => handleFinish('steady')}
            />
            <SecondaryButton
              label="Ride out 3 more minutes"
              mode="night"
              onPress={() => setStep('surf')}
            />
          </View>
        </ScrollView>
      )}

      {step === 'surf' && (
        <View style={[styles.centerStage, { paddingHorizontal: inset }]}>
          <Text style={styles.timerText}>{formattedTimer}</Text>
          <Text style={styles.surfBody}>{SURF_PROMPTS[surfIndex]}</Text>
          <Text style={styles.cycleCount}>
            {surfSecondsLeft === 0
              ? 'The wave has passed. Put the phone down.'
              : 'Stay on the shore. Let the wave crest and fall.'}
          </Text>
          <PrimaryButton
            label={surfSecondsLeft === 0 ? 'Put phone down & close' : 'I’m steady now'}
            onPress={() => handleFinish('steady')}
          />
        </View>
      )}
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
  goldEyebrow: { ...Typography.label, color: Palette.night.scriptureGold },
  closeBtn: { minHeight: Sizes.minTouchTarget, justifyContent: 'center' },
  closeText: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.night.primaryTonalText,
  },
  centerStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  ringWrapper: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringsAbsolute: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerText: { width: 205, alignItems: 'center', gap: Spacing.sm },
  phaseLabel: {
    ...Typography.label,
    color: Palette.night.scriptureGold,
    letterSpacing: 1.2,
  },
  prayerText: {
    fontFamily: Typography.scriptureItalicFamily,
    fontSize: 22,
    lineHeight: 30,
    color: Palette.night.text,
    textAlign: 'center',
  },
  cycleCount: {
    ...Typography.secondary,
    color: Palette.night.textSecondary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  contentStage: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  heading: { color: Palette.night.text },
  subtext: { ...Typography.body, color: Palette.night.textSecondary },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingTop: Spacing.xs },
  offRampCard: {
    backgroundColor: Palette.night.surface,
    borderRadius: Radius.group,
    padding: Spacing.lg,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.night.border,
    gap: Spacing.sm,
  },
  offRampText: {
    fontFamily: Typography.scriptureFamily,
    fontSize: 20,
    lineHeight: 28,
    color: Palette.night.text,
  },
  forkButtons: { gap: Spacing.md, marginTop: Spacing.sm },
  timerText: {
    ...Typography.metric,
    fontSize: 54,
    lineHeight: 58,
    color: Palette.night.primaryTonalText,
  },
  surfBody: {
    fontFamily: Typography.scriptureFamily,
    fontSize: 21,
    lineHeight: 31,
    color: Palette.night.text,
    textAlign: 'center',
  },
});