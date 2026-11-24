import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';

/** Returns 16px horizontal inset on narrow phones (<360px) and 24px otherwise */
export function useScreenInset() {
  const { width } = useWindowDimensions();
  return {
    inset: width < 360 ? Spacing.narrowScreenInset : Spacing.screenInset,
    isNarrow: width < 360,
  };
}

/** Original wave-and-cross Stillwater mark */
export function StillwaterMark({
  size = 25,
  color = Palette.light.scripture,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Path
        d="M14 2v13M9 7h10M2 17q6-4 12 0t12 0M2 22q6-4 12 0t12 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Original geometric stained-glass arch reserved exclusively for Scripture & prayer panels */
export function StainedGlassArch({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.archWrap, style]}
    >
      <Svg width={148} height={194} viewBox="0 0 160 210">
        <Defs>
          <ClipPath id="stillwaterArch">
            <Path d="M22 210V83a63 63 0 0 1 126 0v127Z" />
          </ClipPath>
        </Defs>
        <G clipPath="url(#stillwaterArch)" stroke="#D9C8FF" strokeWidth={1.3}>
          <Path d="M22 210V83a63 63 0 0 1 126 0v127Z" fill="#6039AB" />
          <Path d="M22 83 85 20 85 115 22 152Z" fill="#8856C5" />
          <Path d="M85 20 148 83 148 152 85 115Z" fill="#49268D" />
          <Path d="M22 152 85 115 85 210 22 210Z" fill="#3158C7" />
          <Path d="M85 115 148 152 148 210 85 210Z" fill="#A33362" />
          <Path d="M85 20V210M22 83H148M22 152H148" fill="none" />
          <Circle cx={85} cy={83} r={30} fill="#442283" stroke="#F5D87F" />
          <Path d="M85 62V105M70 77H100" fill="none" stroke="#F5D87F" strokeWidth={2.5} />
        </G>
        <Path
          d="M22 210V83a63 63 0 0 1 126 0v127"
          fill="none"
          stroke="#F5D87F"
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
}

/** Persistent top header across the 3 tabs with direct shortcut to existing /pause flow */
export function AppHeader() {
  const router = useRouter();
  const { inset, isNarrow } = useScreenInset();

  return (
    <View style={[styles.header, { paddingHorizontal: inset }]}>
      <View style={styles.brandRow}>
        <StillwaterMark size={24} color={Palette.light.scripture} />
        <Text style={[styles.wordmark, isNarrow && { fontSize: 20 }]}>stillwater.</Text>
      </View>

      <Pressable
        onPress={() => router.push('/pause')}
        accessibilityRole="button"
        accessibilityLabel="Take a Pause"
        style={({ pressed }) => [
          styles.headerPauseBtn,
          pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text style={styles.headerPauseText}>Take a Pause</Text>
      </Pressable>
    </View>
  );
}

/** 4px flat step indicator bar */
export function StepBar({
  total,
  current,
  mode = 'light',
}: {
  total: number;
  current: number; // 0-indexed
  mode?: 'light' | 'night';
}) {
  const activeColor = mode === 'night' ? Palette.night.breathRing : Palette.light.primary;
  const idleColor = mode === 'night' ? Palette.night.border : Palette.light.border;

  return (
    <View
      style={styles.stepBar}
      accessible
      accessibilityLabel={`Step ${current + 1} of ${total}`}
    >
      {Array.from({ length: total }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.stepSegment,
            { backgroundColor: idx <= current ? activeColor : idleColor },
          ]}
        />
      ))}
    </View>
  );
}

/** Full-width 52px Royal Blue primary action button */
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.primaryBtn,
        pressed && !disabled && styles.primaryBtnPressed,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

/** Full-width 52px Tonal Blue secondary action button */
export function SecondaryButton({
  label,
  onPress,
  mode = 'light',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  mode?: 'light' | 'night';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isNight = mode === 'night';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.secondaryBtn,
        isNight && styles.secondaryBtnNight,
        pressed && !disabled && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text style={[styles.secondaryBtnText, isNight && styles.secondaryBtnTextNight]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Accessible 48px selectable ChoiceChip (color + 2px border + state) */
export function ChoiceChip({
  label,
  selected,
  onPress,
  mode = 'light',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  mode?: 'light' | 'night';
}) {
  const isNight = mode === 'night';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        isNight && styles.chipNight,
        selected && (isNight ? styles.chipSelectedNight : styles.chipSelected),
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          isNight && styles.chipTextNight,
          selected && (isNight ? styles.chipTextSelectedNight : styles.chipTextSelected),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Concentric SVG rings for The Pause (radius 32, 48, 64, 80) */
export function BreathRings({
  color = Palette.night.breathRing,
  size = 220,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {[32, 48, 64, 80].map((r) => (
        <Circle
          key={r}
          cx={90}
          cy={90}
          r={r}
          stroke={color}
          strokeWidth={1.5}
          opacity={1 - r / 135}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.light.background,
    paddingVertical: Spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  wordmark: {
    fontFamily: Typography.sansFamily,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -1.1,
    color: Palette.light.text,
  },
  headerPauseBtn: {
    minHeight: Sizes.minTouchTarget,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.supportBackground,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.supportBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerPauseText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.support,
  },
  archWrap: {
    position: 'absolute',
    right: -18,
    bottom: -22,
    opacity: 0.82,
  },
  stepBar: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: Spacing.lg,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 3,
  },
  primaryBtn: {
    width: '100%',
    minHeight: Sizes.primaryButtonHeight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: Palette.light.primaryPressed,
    transform: [{ scale: 0.985 }],
  },
  primaryBtnText: {
    ...Typography.button,
    color: Palette.light.onPrimary,
  },
  secondaryBtn: {
    width: '100%',
    minHeight: Sizes.primaryButtonHeight,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.primaryTonal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnNight: {
    backgroundColor: Palette.night.primaryTonal,
  },
  secondaryBtnText: {
    ...Typography.button,
    color: Palette.light.primary,
  },
  secondaryBtnTextNight: {
    color: Palette.night.primaryTonalText,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  chip: {
    minHeight: Sizes.minTouchTarget,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.surface,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipNight: {
    backgroundColor: Palette.night.surface,
    borderColor: Palette.night.border,
  },
  chipSelected: {
    backgroundColor: Palette.light.primaryTonal,
    borderColor: Palette.light.primary,
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  chipSelectedNight: {
    backgroundColor: Palette.night.primaryTonal,
    borderColor: Palette.night.breathRing,
    borderWidth: 2,
    paddingHorizontal: 13,
  },
  chipText: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '500',
    color: Palette.light.text,
  },
  chipTextNight: {
    color: Palette.night.text,
  },
  chipTextSelected: {
    color: Palette.light.primaryPressed,
    fontWeight: '600',
  },
  chipTextSelectedNight: {
    color: Palette.night.primaryTonalText,
    fontWeight: '600',
  },
});