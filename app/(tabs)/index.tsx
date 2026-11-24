import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Sizes, Spacing, Typography } from '../../theme/tokens';
import {
  ClarityDay,
  completeMorningAnchor,
  getClarityGrid,
  getLocalDateString,
  getPreferences,
  ToneTrack,
} from '../../db/queries';
import {
  AppHeader,
  StainedGlassArch,
  useScreenInset,
} from '../../components/RoyalUI';
import anchors from '../../assets/content/morning_anchors.json';

export default function TodayScreen() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();
  const [track, setTrack] = useState<ToneTrack>('scripture');
  const [grid, setGrid] = useState<ClarityDay[]>([]);
  const [clarityCount, setClarityCount] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [morningDone, setMorningDone] = useState(false);

  const loadData = useCallback(async () => {
    const prefs = await getPreferences();
    const res = await getClarityGrid(30);
    setTrack(prefs.tone_track);
    setGrid(res.grid);
    setClarityCount(res.clarityCount);
    setActiveDays(res.activeDays);
    const todayCell = res.grid[res.grid.length - 1];
    setMorningDone(Boolean(todayCell?.morningCompleted));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const anchor = anchors[new Date().getDate() % anchors.length];
  const copy = anchor.tracks[track];
  const todayStr = getLocalDateString();
  const formattedDay = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const handleCarryToday = async () => {
    await completeMorningAnchor(String(anchor.dayIndex));
    await loadData();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: inset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Local Date Heading */}
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>{formattedDay}</Text>
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.screenTitle]}>
            Today
          </Text>
        </View>

        {/* Morning Anchor — Liturgical Violet Scripture Panel */}
        <View style={styles.scriptureCard}>
          <StainedGlassArch />
          <View style={styles.scriptureInner}>
            <Text style={styles.scriptureEyebrow}>
              MORNING ANCHOR · {copy.source.toUpperCase()}
            </Text>
            <Text style={styles.scriptureQuote}>“{copy.excerpt}”</Text>
            <Text style={styles.scriptureBody}>{copy.reflection}</Text>

            <Pressable
              onPress={handleCarryToday}
              accessibilityRole="button"
              accessibilityState={{ selected: morningDone }}
              style={({ pressed }) => [
                styles.carryBtn,
                morningDone && styles.carryBtnDone,
                pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
              ]}
            >
              {morningDone && (
                <Feather name="check" size={17} color={Palette.light.onPrimary} />
              )}
              <Text style={[styles.carryBtnText, morningDone && styles.carryBtnTextDone]}>
                {morningDone ? 'Carried into today' : 'Carry this today'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 30-Day Clarity Panel — White Grouped Surface */}
        <View style={styles.clarityPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>30-Day Clarity</Text>
            <Pressable
              onPress={() => router.push('/(tabs)/rhythm')}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={styles.quietLink}>Rhythm ↗</Text>
            </Pressable>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricNumber}>{clarityCount}</Text>
            <Text style={styles.metricCaption}>
              of the last {Math.max(activeDays, 1)} days lived in clarity.
            </Text>
          </View>

          <View style={styles.calendarGrid}>
            {grid.map((day) => {
              const isToday = day.date === todayStr;
              const dayNum = Number(day.date.slice(8, 10));
              return (
                <View
                  key={day.date}
                  accessible
                  accessibilityLabel={`${day.date}: ${day.status}`}
                  style={[
                    styles.cell,
                    day.status === 'clarity' && styles.cellClarity,
                    day.status === 'returned' && styles.cellReturned,
                    isToday && styles.cellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      day.status === 'clarity' && styles.cellTextClarity,
                      day.status === 'returned' && styles.cellTextReturned,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Immediate Urge Support — Sacred Crimson Blush Row */}
        <Pressable
          onPress={() => router.push('/pause')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.supportRow,
            pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.supportTitle}>Take a Pause</Text>
            <Text style={styles.supportSub}>60-second breath prayer & weather check</Text>
          </View>
          <Feather name="arrow-right" size={20} color={Palette.light.support} />
        </Pressable>

        {/* Grouped Daily Practices List (Reset with Grace + Evening Examen) */}
        <View style={styles.groupedRows}>
          <Pressable
            onPress={() => router.push('/grace-reset')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
          >
            <Feather name="rotate-ccw" size={Sizes.icon} color={Palette.light.scripture} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Reset with Grace</Text>
              <Text style={styles.rowSub}>Honest debrief & 24-hour boundary</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Palette.light.textSecondary} />
          </Pressable>

          <View style={styles.rowDivider} />

          <Pressable
            onPress={() => router.push('/examen')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
          >
            <Feather name="moon" size={Sizes.icon} color={Palette.light.scripture} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Evening Examen</Text>
              <Text style={styles.rowSub}>2-minute pre-bed wind-down</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Palette.light.textSecondary} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  container: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  headingBlock: { gap: Spacing.xs },
  eyebrow: {
    ...Typography.label,
    color: Palette.light.textSecondary,
  },
  screenTitle: { color: Palette.light.text },
  scriptureCard: {
    backgroundColor: Palette.light.scripture,
    borderRadius: Radius.feature,
    overflow: 'hidden',
    padding: 20,
    minHeight: 210,
  },
  scriptureInner: { gap: Spacing.md, zIndex: 1 },
  scriptureEyebrow: {
    ...Typography.label,
    color: Palette.light.scriptureGold,
  },
  scriptureQuote: {
    ...Typography.scripture,
    color: Palette.light.scriptureText,
    maxWidth: '82%',
  },
  scriptureBody: {
    ...Typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: Palette.light.scriptureSecondary,
  },
  carryBtn: {
    marginTop: Spacing.xs,
    minHeight: Sizes.primaryButtonHeight,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  carryBtnDone: {
    backgroundColor: Palette.light.success,
  },
  carryBtnText: {
    ...Typography.button,
    color: Palette.light.scripture,
  },
  carryBtnTextDone: {
    color: Palette.light.onPrimary,
  },
  clarityPanel: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.feature,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    ...Typography.section,
    color: Palette.light.text,
  },
  quietLink: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.primary,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  metricNumber: {
    ...Typography.metric,
    color: Palette.light.text,
  },
  metricCaption: {
    ...Typography.secondary,
    color: Palette.light.textSecondary,
    flexShrink: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: '12.5%',
    aspectRatio: 1,
    borderRadius: Radius.small,
    backgroundColor: Palette.light.background,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellClarity: {
    backgroundColor: Palette.light.success,
    borderColor: Palette.light.success,
  },
  cellReturned: {
    backgroundColor: Palette.light.scriptureTonal,
    borderColor: Palette.light.scripture,
    borderWidth: 1.5,
  },
  cellToday: {
    borderColor: Palette.light.primary,
    borderWidth: 2,
  },
  cellText: {
    fontFamily: Typography.sansFamily,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: Palette.light.textSecondary,
  },
  cellTextClarity: { color: Palette.light.onPrimary },
  cellTextReturned: { color: Palette.light.scripture },
  supportRow: {
    minHeight: 62,
    borderRadius: Radius.group,
    backgroundColor: Palette.light.supportBackground,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.supportBorder,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  supportTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.light.support,
  },
  supportSub: {
    ...Typography.secondary,
    fontSize: 12,
    color: Palette.light.supportMuted,
    marginTop: 2,
  },
  groupedRows: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    paddingHorizontal: Spacing.lg,
  },
  actionRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  actionRowPressed: { opacity: 0.7 },
  rowDivider: {
    height: Sizes.borderWidth,
    backgroundColor: Palette.light.border,
  },
  rowTitle: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.light.text,
  },
  rowSub: {
    ...Typography.secondary,
    color: Palette.light.textSecondary,
    marginTop: 2,
  },
});