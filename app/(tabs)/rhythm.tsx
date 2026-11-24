import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { Palette, Radius, Sizes, Spacing, Typography } from '../../theme/tokens';
import { getWeatherMapInsights, WeatherMapInsights } from '../../db/queries';
import { AppHeader, useScreenInset } from '../../components/RoyalUI';

function WeatherIllustration({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={
        compact
          ? styles.compactWeatherArt
          : styles.weatherArtwork
      }
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 320 160"
        preserveAspectRatio="xMidYMid meet"
        accessible={false}
      >
        <Circle
          cx={264}
          cy={34}
          r={20}
          stroke={Palette.light.decorativeGold}
          strokeWidth={1.5}
          fill="none"
        />

        {!compact && (
          <Path
            d="M76 14V48 M63 25H89"
            stroke={Palette.light.scriptureGold}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        )}

        {Array.from({ length: 6 }).map((_, index) => (
          <Path
            key={index}
            d={`M12 ${65 + index * 14}
                Q48 ${32 + index * 14}
                86 ${65 + index * 14}
                T160 ${65 + index * 14}
                T234 ${65 + index * 14}
                T308 ${65 + index * 14}`}
            stroke="#FFFFFF"
            strokeOpacity={0.75 - index * 0.09}
            strokeWidth={1.4}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </View>
  );
}

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

        {insights?.hasEnoughData ? (
          <View style={styles.insightsStack}>

            <View style={styles.peakCard}>
              <Text style={styles.peakLabel}>
                Peak noisy window
              </Text>

              <Text style={styles.peakValue}>
                {insights.peakWindowLabel}
              </Text>

              <WeatherIllustration compact />
            </View>

            <View style={styles.insightGroup}>
              <View style={styles.insightRow}>
                <Text style={styles.rowLabel}>
                  Most common root need
                </Text>

                <Text style={styles.rootNeedValue}>
                  {insights.topEmotionTag ?? 'Still observing'}
                </Text>
              </View>

              {insights.examenProtectionRate !== null && (
                <>
                  <View style={styles.divider} />

                  <View style={styles.insightRow}>
                    <Text style={styles.rowLabel}>
                      Clarity rate on Evening Examen nights
                    </Text>

                    <Text style={styles.clarityValue}>
                      {insights.examenProtectionRate}%
                    </Text>
                  </View>
                </>
              )}
            </View>

          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.weatherPanel}>
              <WeatherIllustration />
            </View>

            <Text style={styles.emptyBody}>
              Check in quietly over the next few days. Once you log at least 3 pauses or resets, your personal weather patterns will surface here.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Palette.light.background,
  },

  container: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },

  headingBlock: {
    gap: Spacing.xs,
  },

  eyebrow: {
    ...Typography.label,
    color: Palette.light.textSecondary,
  },

  title: {
    color: Palette.light.text,
  },

  emptyState: {
    gap: Spacing.lg,
  },

  weatherPanel: {
    backgroundColor: Palette.light.primary,
    borderRadius: Radius.feature,
    overflow: 'hidden',
    padding: Spacing.md,
    minHeight: 170,
    justifyContent: 'center',
  },

  weatherArtwork: {
    width: '100%',
    aspectRatio: 2,
    alignSelf: 'center',
  },

  emptyBody: {
    ...Typography.body,
    color: Palette.light.textSecondary,
    lineHeight: 25,
  },

  insightsStack: {
    gap: Spacing.lg,
  },

  peakCard: {
    backgroundColor: Palette.light.primary,
    borderRadius: Radius.feature,
    padding: Spacing.xl,
    gap: Spacing.sm,
    overflow: 'hidden',
  },

  peakLabel: {
    ...Typography.label,
    color: Palette.light.primaryTonal,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  peakValue: {
    ...Typography.display,
    fontSize: 30,
    lineHeight: 37,
    color: Palette.light.onPrimary,
  },

  compactWeatherArt: {
    width: '100%',
    height: 70,
    marginTop: Spacing.xs,
  },

  insightGroup: {
    backgroundColor: Palette.light.surface,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    paddingHorizontal: Spacing.lg,
  },

  insightRow: {
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },

  rowLabel: {
    ...Typography.secondary,
    color: Palette.light.textSecondary,
  },

  rootNeedValue: {
    ...Typography.section,
    fontSize: 25,
    lineHeight: 31,
    color: Palette.light.text,
  },

  clarityValue: {
    ...Typography.metric,
    fontSize: 38,
    lineHeight: 44,
    color: Palette.light.success,
  },

  divider: {
    height: Sizes.borderWidth,
    backgroundColor: Palette.light.border,
  },
});
