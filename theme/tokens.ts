import { Platform } from 'react-native';

export const Palette = {
  // Royal Light v2.0 (Daylight screens: Today, Rhythm, Library, Onboarding, Grace Reset)
  light: {
    background: '#F4F5F9',
    surface: '#FFFFFF',
    surfaceSecondary: '#E9ECF5',
    text: '#151827',
    textSecondary: '#53596D',
    primary: '#2545CF',
    primaryPressed: '#1933A8',
    onPrimary: '#FFFFFF',
    primaryTonal: '#E7ECFF',
    border: '#D7DBE5',
    scripture: '#442283',
    scriptureText: '#FFFFFF',
    scriptureSecondary: '#E5DDFB',
    scriptureGold: '#F5D87F',
    scriptureTonal: '#F0EBFC',
    decorativeGold: '#EBC34E',
    support: '#A51D42',
    supportBackground: '#FCEBF0',
    supportBorder: '#F6D7E1',
    supportMuted: '#7A3750',
    success: '#19754D',
    danger: '#A51D42',
    input: '#FFFFFF',
  },
  // Royal Midnight (Preserved exclusively for late-night Pause & Evening Examen)
  night: {
    background: '#151827',
    surface: '#1E2338',
    surfaceSecondary: '#262D47',
    text: '#F4F5F9',
    textSecondary: '#B4BCD2',
    primary: '#2545CF',
    primaryPressed: '#1933A8',
    onPrimary: '#FFFFFF',
    primaryTonal: '#243161',
    primaryTonalText: '#DCE4FF',
    border: '#2F3754',
    breathRing: '#6C87F5',
    scripture: '#442283',
    scriptureText: '#FFFFFF',
    scriptureSecondary: '#E5DDFB',
    scriptureGold: '#F5D87F',
    success: '#2A9D68',
    support: '#F59BB3',
    supportBackground: '#3B1C2A',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 48,
  screenInset: 24,
  narrowScreenInset: 16,
} as const;

export const Radius = {
  small: 9,
  standard: 14,
  group: 18,
  feature: 22,
  circle: 999,
} as const;

export const Sizes = {
  minTouchTarget: 48,
  primaryButtonHeight: 52,
  icon: 22,
  borderWidth: 1,
} as const;

export const Motion = {
  pressDurationMs: 120,
  colorTransitionMs: 160,
  screenTransitionMs: 180,
} as const;

const SYSTEM_SANS = Platform.select({
  ios: undefined, // Native SF Pro
  android: 'sans-serif',
  default: undefined,
});

const SCRIPTURE_SERIF = Platform.select({
  ios: 'Georgia',
  android: 'Newsreader_400Regular',
  default: 'Georgia',
});

const SCRIPTURE_SERIF_ITALIC = Platform.select({
  ios: 'Georgia',
  android: 'Newsreader_400Regular_Italic',
  default: 'Georgia',
});

export const Typography = {
  sansFamily: SYSTEM_SANS,
  scriptureFamily: SCRIPTURE_SERIF,
  scriptureItalicFamily: SCRIPTURE_SERIF_ITALIC,
  display: {
    fontFamily: SYSTEM_SANS,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '700' as const,
    letterSpacing: -1.35,
  },
  displayNarrow: {
    fontFamily: SYSTEM_SANS,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '700' as const,
    letterSpacing: -1.1,
  },
  section: {
    fontFamily: SYSTEM_SANS,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: -0.6,
  },
  scripture: {
    fontFamily: SCRIPTURE_SERIF,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '400' as const,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: SYSTEM_SANS,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  button: {
    fontFamily: SYSTEM_SANS,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  secondary: {
    fontFamily: SYSTEM_SANS,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400' as const,
  },
  label: {
    fontFamily: SYSTEM_SANS,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
  },
  tab: {
    fontFamily: SYSTEM_SANS,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500' as const,
  },
  metric: {
    fontFamily: SYSTEM_SANS,
    fontSize: 43,
    lineHeight: 46,
    fontWeight: '700' as const,
    letterSpacing: -2,
    fontVariant: ['tabular-nums' as const],
  },
} as const;