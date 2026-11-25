import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Sizes, Spacing, Typography } from '../../theme/tokens';
import { getCompletedPathDays, togglePathDayComplete } from '../../db/pathQueries';
import { hasStillwaterPlus, setDevPlusPreview } from '../../db/entitlements';
import {
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  StainedGlassArch,
  useScreenInset,
} from '../../components/RoyalUI';
import { AudioRescuePlayer, RescueAudioTrack } from '../../components/AudioRescuePlayer';
import { PlusOfferView } from '../../components/PlusOfferView';
import recoveryPathData from '../../assets/content/recovery_path.json';
import psalmsLamentData from '../../assets/content/psalms_lament.json';
import midnightAudioData from '../../assets/content/midnight_audio.json';
import breathPrayersData from '../../assets/content/breath_prayers.json';

interface PathDay {
  day: number;
  week: number;
  weekTitle: string;
  tier: 'free' | 'plus';
  title: string;
  readMinutes: number;
  scriptureRef: string;
  scriptureText: string;
  clinicalLens: string;
  reflection: string;
  practice: string;
}

interface LamentItem {
  id: string;
  title: string;
  scriptureRef: string;
  scriptureText: string;
  originalPrayer: string;
  prompt: string;
}

const PATH_DAYS = recoveryPathData as PathDay[];
const LAMENTS = psalmsLamentData as LamentItem[];
const AUDIO_TRACKS = midnightAudioData as RescueAudioTrack[];

export default function LibraryScreen() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();

  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [isPlus, setIsPlus] = useState(false);

  const [activeDay, setActiveDay] = useState<PathDay | null>(null);
  const [activeLament, setActiveLament] = useState<LamentItem | null>(null);
  const [activeAudio, setActiveAudio] = useState<RescueAudioTrack | null>(null);
  const [showPlusSheet, setShowPlusSheet] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  const loadState = useCallback(async () => {
    const [done, plus] = await Promise.all([
      getCompletedPathDays(),
      hasStillwaterPlus(),
    ]);
    setCompletedDays(done);
    setIsPlus(plus);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState])
  );

  const nextPathDay = useMemo(() => {
    const firstIncomplete = PATH_DAYS.find((d) => !completedDays.includes(d.day));
    return firstIncomplete ?? PATH_DAYS[PATH_DAYS.length - 1];
  }, [completedDays]);

  const weeks = useMemo(() => {
    const grouped: Record<number, { week: number; title: string; tier: 'free' | 'plus'; days: PathDay[] }> = {};
    for (const d of PATH_DAYS) {
      if (!grouped[d.week]) {
        grouped[d.week] = { week: d.week, title: d.weekTitle, tier: d.tier, days: [] };
      }
      grouped[d.week].days.push(d);
    }
    return Object.values(grouped);
  }, []);

  const handleOpenDay = (day: PathDay) => {
    Haptics.selectionAsync().catch(() => {});
    if (day.tier === 'plus' && !isPlus) {
      setShowPlusSheet(true);
      return;
    }
    setActiveDay(day);
  };

  const handleOpenAudio = (track: RescueAudioTrack) => {
    Haptics.selectionAsync().catch(() => {});
    if (track.tier === 'plus' && !isPlus) {
      setShowPlusSheet(true);
      return;
    }
    setActiveAudio(track);
  };

  const handleToggleComplete = async (dayNum: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await togglePathDayComplete(dayNum);
    await loadState();
  };

  const handleToggleDevPlus = async () => {
    const next = !isPlus;
    await setDevPlusPreview(next);
    await loadState();
  };

  const isNextDayLocked = nextPathDay.tier === 'plus' && !isPlus;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>Guided practices & recovery</Text>
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
            Journey
          </Text>
        </View>

        {/* Featured Liturgical Violet Card: 30-Day Path Progress */}
        <View style={styles.featuredCard}>
          <StainedGlassArch />
          <View style={styles.featuredInner}>
            <Text style={styles.goldEyebrow}>
              30-DAY ROOT-CAUSE PATH · {completedDays.length} OF 30 COMPLETED
            </Text>
            <Text style={styles.featuredTitle}>
              Day {nextPathDay.day}: {nextPathDay.title}
            </Text>
            <Text style={styles.featuredSub}>
              Week {nextPathDay.week} · {nextPathDay.weekTitle} ({nextPathDay.readMinutes} min)
            </Text>

            <Pressable
              onPress={() => handleOpenDay(nextPathDay)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.featuredBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={styles.featuredBtnText}>
                {isNextDayLocked
                  ? 'Unlock Week 2–4 with Stillwater Plus'
                  : `Read Day ${nextPathDay.day}`}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 1. Eyes-Closed Midnight Rescue Audio */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Guided rescue practices</Text>
          <View style={styles.groupedCard}>
            {AUDIO_TRACKS.map((track, idx) => {
              const locked = track.tier === 'plus' && !isPlus;
              return (
                <View key={track.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <Pressable
                    onPress={() => handleOpenAudio(track)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.72 }]}
                  >
                    <Feather
                      name={locked ? 'lock' : track.audioUri ? 'headphones' : 'book-open'}
                      size={Sizes.icon}
                      color={locked ? Palette.light.textSecondary : Palette.light.scripture}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowTitleLine}>
                        <Text style={styles.rowTitle}>{track.title}</Text>
                        {track.tier === 'plus' && !isPlus && (
                          <View style={styles.plusPill}>
                            <Text style={styles.plusPillText}>Plus</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.rowSub}>{track.subtitle}{track.audioUri ? ' · Audio' : ' · Guided text'}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={Palette.light.textSecondary} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* 2. 30-Day Root-Cause Recovery Path (4 Weeks) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>30-day recovery path</Text>
          <View style={styles.weekList}>
            {weeks.map((wk) => {
              const isOpen = expandedWeek === wk.week;
              const weekDoneCount = wk.days.filter((d) => completedDays.includes(d.day)).length;
              const weekLocked = wk.tier === 'plus' && !isPlus;

              return (
                <View key={wk.week} style={styles.groupedCard}>
                  <Pressable
                    onPress={() => setExpandedWeek(isOpen ? 0 : wk.week)}
                    accessibilityRole="button"
                    style={styles.weekHeader}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.rowTitleLine}>
                        <Text style={styles.weekEyebrow}>
                          WEEK {wk.week} · {weekDoneCount}/{wk.days.length}
                        </Text>
                        {weekLocked ? (
                          <View style={styles.plusPill}>
                            <Text style={styles.plusPillText}>Plus</Text>
                          </View>
                        ) : (
                          <View style={styles.freePill}>
                            <Text style={styles.freePillText}>
                              {wk.tier === 'free' ? 'Free' : 'Unlocked'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.weekTitle}>{wk.title}</Text>
                    </View>
                    <Feather
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Palette.light.textSecondary}
                    />
                  </Pressable>

                  {isOpen &&
                    wk.days.map((d) => {
                      const done = completedDays.includes(d.day);
                      return (
                        <View key={d.day}>
                          <View style={styles.divider} />
                          <Pressable
                            onPress={() => handleOpenDay(d)}
                            accessibilityRole="button"
                            style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.72 }]}
                          >
                            <View style={[styles.dayBadge, done && styles.dayBadgeDone]}>
                              {done ? (
                                <Feather name="check" size={14} color={Palette.light.onPrimary} />
                              ) : weekLocked ? (
                                <Feather name="lock" size={13} color={Palette.light.textSecondary} />
                              ) : (
                                <Text style={styles.dayBadgeText}>{d.day}</Text>
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.rowTitle}>{d.title}</Text>
                              <Text style={styles.rowSub}>
                                {d.clinicalLens} · {d.readMinutes} min
                              </Text>
                            </View>
                            <Feather
                              name="chevron-right"
                              size={18}
                              color={Palette.light.textSecondary}
                            />
                          </Pressable>
                        </View>
                      );
                    })}
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. Psalms of Lament */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Psalms of lament</Text>
          <View style={styles.groupedCard}>
            {LAMENTS.map((item, idx) => (
              <View key={item.id}>
                {idx > 0 && <View style={styles.divider} />}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActiveLament(item);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.rowBtn, pressed && { opacity: 0.72 }]}
                >
                  <Feather name="book-open" size={Sizes.icon} color={Palette.light.scripture} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowSub}>{item.scriptureRef}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={Palette.light.textSecondary} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* 4. Breath Prayer Cadences */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Breath prayers</Text>
          <View style={styles.groupedCard}>
            {breathPrayersData.map((bp, idx) => (
              <View key={bp.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.breathRow}>
                  <Text style={styles.breathLine}>Inhale (4s): “{bp.inhaleText}”</Text>
                  <Text style={styles.rowSub}>Exhale (6s): “{bp.exhaleText}”</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Dev QA Switch (visible only in __DEV__) */}
        {__DEV__ && (
          <Pressable onPress={handleToggleDevPlus} style={styles.devPill}>
            <Text style={styles.devPillText}>
              Dev preview · Stillwater Plus: {isPlus ? 'UNLOCKED' : 'LOCKED'} (tap to toggle)
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Modal 1: 30-Day Path Day Reader */}
      <Modal
        visible={Boolean(activeDay)}
        animationType="slide"
        onRequestClose={() => setActiveDay(null)}
      >
        {activeDay && (
          <SafeAreaView style={styles.safe}>
            <View style={[styles.modalTopBar, { paddingHorizontal: inset }]}>
              <Text style={styles.eyebrow}>
                DAY {activeDay.day} · WEEK {activeDay.week}
              </Text>
              <Pressable onPress={() => setActiveDay(null)} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={[styles.modalScroll, { paddingHorizontal: inset }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                {activeDay.title}
              </Text>

              <View style={styles.featuredCard}>
                <StainedGlassArch />
                <View style={styles.featuredInner}>
                  <Text style={styles.goldEyebrow}>{activeDay.scriptureRef.toUpperCase()}</Text>
                  <Text style={styles.scriptureQuote}>“{activeDay.scriptureText}”</Text>
                </View>
              </View>

              <View style={styles.lensCallout}>
                <Text style={styles.lensLabel}>CLINICAL & SPIRITUAL LENS</Text>
                <Text style={styles.lensValue}>{activeDay.clinicalLens}</Text>
              </View>

              <Text style={styles.readerBody}>{activeDay.reflection}</Text>

              <View style={styles.practiceCard}>
                <Text style={styles.eyebrow}>TODAY’S 2-MINUTE PRACTICE</Text>
                <Text style={styles.practiceText}>{activeDay.practice}</Text>
              </View>

              <PrimaryButton
                label={
                  completedDays.includes(activeDay.day)
                    ? 'Completed — tap to unmark'
                    : `Mark Day ${activeDay.day} complete`
                }
                onPress={() => handleToggleComplete(activeDay.day)}
              />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Modal 2: Psalms of Lament Reader */}
      <Modal
        visible={Boolean(activeLament)}
        animationType="slide"
        onRequestClose={() => setActiveLament(null)}
      >
        {activeLament && (
          <SafeAreaView style={styles.safe}>
            <View style={[styles.modalTopBar, { paddingHorizontal: inset }]}>
              <Text style={styles.eyebrow}>PSALM OF LAMENT</Text>
              <Pressable onPress={() => setActiveLament(null)} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={[styles.modalScroll, { paddingHorizontal: inset }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
                {activeLament.title}
              </Text>

              <View style={styles.featuredCard}>
                <StainedGlassArch />
                <View style={styles.featuredInner}>
                  <Text style={styles.goldEyebrow}>{activeLament.scriptureRef.toUpperCase()}</Text>
                  <Text style={styles.scriptureQuote}>“{activeLament.scriptureText}”</Text>
                </View>
              </View>

              <View style={styles.originalPrayerBlock}>
                <Text style={styles.eyebrow}>ORIGINAL PRAYER</Text>
                <Text style={styles.originalPrayerText}>{activeLament.originalPrayer}</Text>
              </View>

              <View style={styles.lensCallout}>
                <Text style={styles.lensLabel}>QUIET REFLECTION</Text>
                <Text style={styles.lensValue}>{activeLament.prompt}</Text>
              </View>

              <SecondaryButton
                label="Take a Pause"
                onPress={() => {
                  setActiveLament(null);
                  router.push('/pause');
                }}
              />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Modal 3: Eyes-Closed Midnight Rescue Audio Player */}
      <Modal
        visible={Boolean(activeAudio)}
        animationType="fade"
        onRequestClose={() => setActiveAudio(null)}
      >
        {activeAudio && (
          <SafeAreaView style={styles.nightModalSafe}>
            <View style={[styles.modalTopBar, { paddingHorizontal: inset }]}>
              <Text style={styles.nightEyebrow}>MIDNIGHT RESCUE</Text>
              <Pressable onPress={() => setActiveAudio(null)} hitSlop={12} style={styles.closeBtn}>
                <Text style={styles.nightCloseText}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: inset,
                paddingBottom: Spacing.xl,
              }}
            >
              <AudioRescuePlayer
                track={activeAudio}
                onComplete={() => setActiveAudio(null)}
              />
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Modal 4: Live RevenueCat + Grace Scholarship Paywall */}
      <Modal
        visible={showPlusSheet}
        animationType="slide"
        onRequestClose={() => setShowPlusSheet(false)}
      >
        <SafeAreaView style={styles.safe}>
          <View style={[styles.modalTopBar, { paddingHorizontal: inset }]}>
            <Text style={styles.eyebrow}>STILLWATER PLUS</Text>
            <Pressable
              onPress={() => setShowPlusSheet(false)}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.modalScroll, { paddingHorizontal: inset }]}
            showsVerticalScrollIndicator={false}
          >
            <PlusOfferView
              onUnlocked={async () => {
                setShowPlusSheet(false);
                await loadState();
              }}
              onContinueFree={() => setShowPlusSheet(false)}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  nightModalSafe: { flex: 1, backgroundColor: Palette.night.background },
  container: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  headingBlock: { gap: Spacing.xs },
  eyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  nightEyebrow: { ...Typography.label, color: Palette.night.textSecondary },
  title: { color: Palette.light.text },
  sectionBlock: { gap: Spacing.sm },
  sectionTitle: { ...Typography.section, color: Palette.light.text },
  featuredCard: {
    backgroundColor: Palette.light.scripture,
    borderRadius: Radius.feature,
    overflow: 'hidden',
    padding: 20,
    minHeight: 185,
  },
  featuredInner: { gap: Spacing.sm, zIndex: 1 },
  goldEyebrow: { ...Typography.label, color: Palette.light.scriptureGold },
  featuredTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Palette.light.scriptureText,
    maxWidth: '85%',
  },
  featuredSub: {
    ...Typography.secondary,
    fontSize: 14,
    color: Palette.light.scriptureSecondary,
  },
  featuredBtn: {
    marginTop: Spacing.sm,
    minHeight: Sizes.primaryButtonHeight,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  featuredBtnText: { ...Typography.button, color: Palette.light.scripture },
  groupedCard: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    paddingHorizontal: Spacing.lg,
  },
  weekList: { gap: Spacing.md },
  weekHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  weekEyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  weekTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 17,
    fontWeight: '700',
    color: Palette.light.text,
  },
  rowBtn: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.light.text,
  },
  rowSub: { ...Typography.secondary, color: Palette.light.textSecondary, marginTop: 2 },
  divider: { height: Sizes.borderWidth, backgroundColor: Palette.light.border },
  plusPill: {
    backgroundColor: Palette.light.scriptureTonal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plusPillText: {
    fontFamily: Typography.sansFamily,
    fontSize: 11,
    fontWeight: '700',
    color: Palette.light.scripture,
  },
  freePill: {
    backgroundColor: Palette.light.primaryTonal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freePillText: {
    fontFamily: Typography.sansFamily,
    fontSize: 11,
    fontWeight: '700',
    color: Palette.light.primary,
  },
  dayBadge: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
    backgroundColor: Palette.light.background,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeDone: {
    backgroundColor: Palette.light.success,
    borderColor: Palette.light.success,
  },
  dayBadgeText: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: Palette.light.text,
  },
  breathRow: { paddingVertical: Spacing.md, gap: 4 },
  breathLine: {
    fontFamily: Typography.scriptureFamily,
    fontSize: 17,
    color: Palette.light.scripture,
  },
  devPill: {
    minHeight: Sizes.minTouchTarget,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  devPillText: { ...Typography.label, color: Palette.light.textSecondary },
  modalTopBar: {
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: { minHeight: Sizes.minTouchTarget, justifyContent: 'center' },
  closeText: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.light.primary,
  },
  nightCloseText: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.night.primaryTonalText,
  },
  modalScroll: { paddingBottom: Spacing.xxl, gap: Spacing.lg },
  scriptureQuote: {
    ...Typography.scripture,
    color: Palette.light.scriptureText,
    maxWidth: '84%',
  },
  lensCallout: {
    backgroundColor: Palette.light.scriptureTonal,
    borderRadius: Radius.standard,
    padding: Spacing.lg,
    gap: 4,
  },
  lensLabel: { ...Typography.label, color: Palette.light.scripture },
  lensValue: { ...Typography.body, fontSize: 15, color: Palette.light.scripture },
  readerBody: { ...Typography.body, color: Palette.light.text },
  practiceCard: {
    backgroundColor: Palette.light.surface,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    borderRadius: Radius.group,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  practiceText: { ...Typography.body, fontSize: 15, color: Palette.light.text },
  originalPrayerBlock: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  originalPrayerText: {
    fontFamily: Typography.scriptureFamily,
    fontSize: 21,
    lineHeight: 31,
    color: Palette.light.scripture,
  },
});
