import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import { logGraceReset, shouldTriggerBingeBreaker } from '../db/queries';
import {
  ChoiceChip,
  PrimaryButton,
  SecondaryButton,
  StepBar,
  StillwaterMark,
  useScreenInset,
} from '../components/RoyalUI';

type ResetStep = 'loading' | 'binge' | 'stop' | 'debrief' | 'boundary' | 'lament' | 'closed';

const DOOR_OPENERS = ['Phone in bed', 'Alone in the house', 'Heavy stress', 'Late-night insomnia', 'Conflict / hurt'];
const NUMBING_NEEDS = ['Loneliness', 'Pressure', 'Boredom', 'Restlessness', 'Exhaustion'];
const AFTERMATHS = ['Still empty', 'More drained', 'Foggy', 'Just tired'];

const BOUNDARY_PRESETS = [
  'Charge my phone outside the bedroom tonight',
  'Sign out of social feeds after 9 PM',
  'Keep the door open while working at my desk',
  'Send a normal text to a friend so I am not isolated',
];

export default function GraceResetModal() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();
  const [step, setStep] = useState<ResetStep>('loading');
  const [isBinge, setIsBinge] = useState(false);

  const [doorOpener, setDoorOpener] = useState<string | undefined>();
  const [numbingNeed, setNumbingNeed] = useState<string | undefined>();
  const [aftermath, setAftermath] = useState<string | undefined>();
  const [boundary, setBoundary] = useState<string>(BOUNDARY_PRESETS[0]);
  const [customBoundary, setCustomBoundary] = useState('');
  const [lamentText, setLamentText] = useState('');

  const holdProgress = useSharedValue(0);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    shouldTriggerBingeBreaker().then((triggered) => {
      setIsBinge(triggered);
      setStep(triggered ? 'binge' : 'stop');
    });
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const handleBingeAction = async (goToPause: boolean) => {
    await logGraceReset({ wasBingeBreaker: true });
    if (goToPause) {
      router.replace('/pause');
    } else {
      router.back();
    }
  };

  const finalizeReset = async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    const chosenBoundary = customBoundary.trim() || boundary;
    await logGraceReset({
      wasBingeBreaker: isBinge,
      doorOpenerTag: doorOpener?.toLowerCase().replace(/\s+/g, '_'),
      numbingNeedTag: numbingNeed?.toLowerCase().replace(/\s+/g, '_'),
      aftermathTag: aftermath?.toLowerCase().replace(/\s+/g, '_'),
      boundaryLabel: chosenBoundary,
      lamentText,
    });

    setLamentText('');
    setStep('closed');
  };

  const handleHoldStart = () => {
    if (completedRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    holdProgress.value = withTiming(1, { duration: 2000 });
    holdTimerRef.current = setTimeout(() => {
      finalizeReset();
    }, 2000);
  };

  const handleHoldEnd = () => {
    if (completedRef.current) return;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdProgress.value = withTiming(0, { duration: 250 });
  };

  const fillBarStyle = useAnimatedStyle(() => ({
    width: `${holdProgress.value * 100}%`,
  }));

  const lamentFadeStyle = useAnimatedStyle(() => ({
    opacity: 1 - holdProgress.value * 0.9,
  }));

  const stepIndexMap: Partial<Record<ResetStep, number>> = {
    stop: 0,
    debrief: 1,
    boundary: 2,
    lament: 3,
  };
  const currentStepIdx = stepIndexMap[step];

  const renderChipRow = (
    items: string[],
    selected: string | undefined,
    onSelect: (val: string) => void
  ) => (
    <View style={styles.pillWrap}>
      {items.map((item) => {
        const active = selected === item;
        return (
          <ChoiceChip
            key={item}
            label={item}
            selected={active}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(active ? '' : item);
            }}
          />
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.topBar, { paddingHorizontal: inset }]}>
        <Text style={styles.eyebrow}>
          {step === 'binge' ? 'INTERRUPT THE SPIRAL' : 'RESET WITH GRACE'}
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {currentStepIdx !== undefined && <StepBar total={4} current={currentStepIdx} />}

          {step === 'binge' && (
            <View style={styles.block}>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                The spiral is talking right now—don’t believe it.
              </Text>
              <View style={styles.supportNotice}>
                <Text style={styles.supportNoticeText}>
                  Right now your brain is whispering, “Today is already wrecked, so what’s one more time?” That is the oldest trap in the loop. You can step off the escalator at any floor—including this one.
                </Text>
              </View>
              <Text style={styles.body}>
                Skip the analysis for now. Step into another room and reset your body first.
              </Text>
              <PrimaryButton label="Take a 60-second breath" onPress={() => handleBingeAction(true)} />
              <SecondaryButton label="Close & step away from the phone" onPress={() => handleBingeAction(false)} />
              <Pressable
                onPress={() => setStep('debrief')}
                accessibilityRole="button"
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>I’m calm—log what happened anyway</Text>
              </Pressable>
            </View>
          )}

          {step === 'stop' && (
            <View style={styles.block}>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                Stop right here.
              </Text>
              <View style={styles.callout}>
                <StillwaterMark
                  size={30}
                  color={Palette.light.scriptureGold}
                />
                <Text style={styles.calloutText}>
                  Shame wants you to hide, call yourself a fraud, and slip again to numb the sting. Grace wants you awake, honest, and still in the room.
                </Text>
              </View>
              <Text style={styles.body}>
                One bad hour does not erase who you are or the quiet days you have already walked.
              </Text>
              <PrimaryButton
                label="Take a breath & continue"
                onPress={() => setStep('debrief')}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}

          {step === 'debrief' && (
            <View style={styles.block}>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                Let’s look at the room, not put you on trial.
              </Text>

              <Text style={styles.label}>What opened the door?</Text>
              {renderChipRow(DOOR_OPENERS, doorOpener, setDoorOpener)}

              <Text style={styles.label}>What were you hoping it would take away?</Text>
              {renderChipRow(NUMBING_NEEDS, numbingNeed, setNumbingNeed)}

              <Text style={styles.label}>How did it actually leave you feeling afterward?</Text>
              {renderChipRow(AFTERMATHS, aftermath, setAftermath)}

              <PrimaryButton
                label="Next"
                onPress={() => setStep('boundary')}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}

          {step === 'boundary' && (
            <View style={styles.block}>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                One small boundary for the next 24 hours.
              </Text>
              <Text style={styles.body}>
                Willpower wears thin after dark; simple environment shifts carry you. Skip the sweeping vows.
              </Text>

              <View style={styles.boundaryList}>
                {BOUNDARY_PRESETS.map((item) => {
                  const selected = boundary === item && !customBoundary.trim();
                  return (
                    <Pressable
                      key={item}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.boundaryCard, selected && styles.boundaryCardActive]}
                      onPress={() => {
                        setBoundary(item);
                        setCustomBoundary('');
                        Haptics.selectionAsync().catch(() => {});
                      }}
                    >
                      <Text style={[
                        styles.boundaryText,
                        selected && styles.boundaryTextActive,
                      ]}>
                        {item}
                      </Text>

                      <View
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                        style={[
                          styles.boundaryIndicator,
                          selected &&
                            styles.boundaryIndicatorActive,
                        ]}
                      >
                        {selected && (
                          <Feather
                            name="check"
                            size={15}
                            color={Palette.light.onPrimary}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Or write your own small shift..."
                placeholderTextColor={Palette.light.textSecondary}
                accessibilityLabel="Custom boundary"
                selectionColor={Palette.light.primary}
                keyboardAppearance="light"
                value={customBoundary}
                onChangeText={setCustomBoundary}
              />

              <PrimaryButton
                label="Commit for 24 hours"
                onPress={() => setStep('lament')}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}

          {step === 'lament' && (
            <View style={styles.block}>
              <View style={styles.lamentMark}>
                <StillwaterMark
                  size={34}
                  color={Palette.light.scripture}
                />
              </View>
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                Say one unfiltered line to God.
              </Text>
              <Text style={styles.body}>
                No polite church language. Anger, exhaustion, and frustration belong here too. When you hold below, these words dissolve—nothing is kept.
              </Text>

              <Animated.View style={lamentFadeStyle}>
                <TextInput
                  style={[styles.input, styles.lamentBox]}
                  placeholder="Honestly, I’m just tired of..."
                  placeholderTextColor={Palette.light.textSecondary}
                  accessibilityLabel="Your lament"
                  selectionColor={Palette.light.scripture}
                  keyboardAppearance="light"
                  multiline
                  value={lamentText}
                  onChangeText={setLamentText}
                />
              </Animated.View>

              <Pressable
                onPressIn={handleHoldStart}
                onPressOut={handleHoldEnd}
                accessibilityRole="button"
                accessibilityLabel="Press and hold for two seconds to lay this down"
                style={styles.holdBtn}
              >
                <Animated.View style={[styles.holdFill, fillBarStyle]} />
                <View style={styles.holdContent}>
                  <Feather
                    name="unlock"
                    size={19}
                    color={Palette.light.scripture}
                  />
                  <Text style={styles.holdBtnText}>
                    Press & hold (2s) to lay this down
                  </Text>
                </View>
              </Pressable>
            </View>
          )}

          {step === 'closed' && (
            <View style={[styles.block, styles.closedStage]}>
              <View
                style={styles.closedHalo}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              >
                <View style={styles.closedHaloInner}>
                  <Feather
                    name="check-circle"
                    size={44}
                    color={Palette.light.success}
                  />
                </View>
              </View>

              <Text style={[
                styles.eyebrow,
                styles.closedEyebrow,
              ]}>
                LEDGER CLOSED
              </Text>

              <Text style={[
                Typography.display,
                isNarrow && Typography.displayNarrow,
                styles.title,
                styles.closedTitle,
              ]}>
                Mercy does not run out at midnight.
              </Text>

              <Text style={[styles.body, styles.closedBody]}>
                Today has been marked as an honest return, not a failure. Close the app, drink some water, and go live the rest of your day in the light.
              </Text>
              <PrimaryButton
                label="Return to Today"
                onPress={() => router.back()}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  closeBtn: { minHeight: Sizes.minTouchTarget, justifyContent: 'center' },
  closeText: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.light.primary,
  },
  container: { flexGrow: 1, justifyContent: 'center', paddingVertical: Spacing.lg },
  block: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: Spacing.lg,
  },
  title: { color: Palette.light.text },
  body: { ...Typography.body, color: Palette.light.textSecondary },
  callout: {
    backgroundColor: Palette.light.scripture,
    borderRadius: Radius.feature,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },

  calloutText: {
    ...Typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: Palette.light.scriptureText,
  },
  supportNotice: {
    backgroundColor: Palette.light.supportBackground,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.supportBorder,
    borderRadius: Radius.standard,
    padding: Spacing.lg,
  },
  supportNoticeText: {
    ...Typography.body,
    fontSize: 15,
    color: Palette.light.support,
  },
  label: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.light.text,
    marginTop: Spacing.xs,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  boundaryList: { gap: Spacing.sm },
  boundaryCard: {
    minHeight: 64,
    backgroundColor: Palette.light.surface,
    borderWidth: 2,
    borderColor: Palette.light.border,
    padding: Spacing.lg,
    borderRadius: Radius.standard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },

  boundaryIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Palette.light.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  boundaryIndicatorActive: {
    backgroundColor: Palette.light.primary,
    borderColor: Palette.light.primary,
  },
  boundaryCardActive: {
    backgroundColor: Palette.light.primaryTonal,
    borderColor: Palette.light.primary,
    borderWidth: 2,
  },
  boundaryText: {
    flex: 1,
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '500',
    color: Palette.light.text,
  },
  boundaryTextActive: {
    color: Palette.light.primaryPressed,
    fontWeight: '600',
  },
  input: {
    minHeight: Sizes.primaryButtonHeight,
    backgroundColor: Palette.light.input,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    borderRadius: Radius.standard,
    padding: Spacing.md,
    ...Typography.body,
    color: Palette.light.text,
  },
  lamentMark: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.sm,
  },

  lamentBox: {
    minHeight: 180,
    padding: Spacing.lg,
    textAlignVertical: 'top',
    borderRadius: Radius.group,
  },
  linkBtn: { minHeight: Sizes.minTouchTarget, justifyContent: 'center', alignItems: 'center' },
  linkText: { ...Typography.secondary, color: Palette.light.textSecondary },
  holdBtn: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 60,
    paddingVertical: Spacing.md,
    backgroundColor: Palette.light.surface,
    borderWidth: 2,
    borderColor: Palette.light.scripture,
    borderRadius: Radius.standard,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  holdFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Palette.light.scriptureSecondary,
  },
  holdContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    zIndex: 1,
  },

  holdBtnText: {
    ...Typography.button,
    flexShrink: 1,
    textAlign: 'center',
    color: Palette.light.scripture,
  },

  closedStage: {
    alignItems: 'center',
    gap: Spacing.xl,
  },

  closedHalo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(25, 117, 77, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closedHaloInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(25, 117, 77, 0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closedEyebrow: {
    color: Palette.light.success,
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  closedTitle: {
    textAlign: 'center',
  },

  closedBody: {
    textAlign: 'center',
    maxWidth: 380,
  },
});