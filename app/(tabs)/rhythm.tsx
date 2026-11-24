import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Palette, Radius, Sizes, Spacing, Typography } from '../../theme/tokens';
import { getWeatherMapInsights, WeatherMapInsights } from '../../db/queries';
import { AppHeader, useScreenInset } from '../../components/RoyalUI';

export default function RhythmScreen() {
  const { inset, isNarrow } = useScreenInset();
  const [insights, setInsights] = useState<WeatherMapInsights | null>(null);

  useFocusEffect(
    useCallback(() => {
      getWeatherMapInsights().then(setInsights);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>Patterns & observation</Text>
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
            Rhythm & Weather Map
          </Text>
        </View>

        <View style={styles.card}>
          {insights?.hasEnoughData ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Peak noisy window</Text>
                <Text style={styles.rowValue}>{insights.peakWindowLabel}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Most common root need</Text>
                <Text style={styles.rowValue}>
                  {insights.topEmotionTag ?? 'Still observing'}
                </Text>
              </View>

              {insights.examenProtectionRate !== null && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Clarity rate on Evening Examen nights</Text>
                    <Text style={[styles.rowValue, { color: Palette.light.success }]}>
                      {insights.examenProtectionRate}%
                    </Text>
                  </View>
                </>
              )}
            </>
          ) : (
            <Text style={styles.body}>
              Check in quietly over the next few days. Once you log at least 3 pauses or resets, your personal weather patterns will surface here.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  container: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.lg },
  headingBlock: { gap: Spacing.xs },
  eyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  title: { color: Palette.light.text },
  card: {
    backgroundColor: Palette.light.surface,
    padding: Spacing.lg,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    gap: Spacing.md,
  },
  row: { gap: 4 },
  rowLabel: { ...Typography.secondary, color: Palette.light.textSecondary },
  rowValue: {
    ...Typography.section,
    color: Palette.light.text,
    fontVariant: ['tabular-nums'],
  },
  divider: { height: Sizes.borderWidth, backgroundColor: Palette.light.border },
  body: { ...Typography.body, color: Palette.light.textSecondary },
});