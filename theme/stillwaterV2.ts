export const StillwaterV2 = {
  day: {
    background: '#F6F3EB',
    surface: '#FFFCF6',
    primary: '#193B35',
    onPrimary: '#FFFFFF',
    secondary: '#DCE6D9',
    muted: '#48645A',
    text: '#19332E',
    border: '#C9D3C6',
    accent: '#B88A50',
    danger: '#994E3E',
  },
  night: {
    background: '#111F20',
    surface: '#1C302F',
    primary: '#D9E6CA',
    onPrimary: '#111F20',
    secondary: '#29403C',
    muted: '#B6C9BE',
    text: '#F0F2E8',
    border: '#40564F',
    accent: '#D6B47D',
    danger: '#E6A493',
  },
} as const;

export type V2Mode = keyof typeof StillwaterV2;
export type V2Palette = (typeof StillwaterV2)[V2Mode];

export const V2Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40,
} as const;

export const V2Radius = {
  small: 12,
  card: 20,
  feature: 28,
  pill: 999,
} as const;

export const V2Type = {
  display: {
    fontFamily: 'Newsreader_400Regular',
    fontSize: 38,
    lineHeight: 42,
  },
  heading: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '600' as const,
  },
  section: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  secondary: {
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600' as const,
    letterSpacing: 0.7,
  },
} as const;
