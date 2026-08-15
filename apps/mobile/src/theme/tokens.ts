import { Platform } from 'react-native';

export const colors = {
  canvas: '#F7F4F0',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EDF7',
  lavender: '#8B84D7',
  lavenderDark: '#635CAC',
  lavenderSoft: '#E8E5F7',
  ink: '#20233A',
  muted: '#6E7082',
  line: '#E4E0E8',
  success: '#2D8A72',
  successSoft: '#DFF3EC',
  warning: '#B96B35',
  warningSoft: '#F9E7D9',
  danger: '#B34C58',
  dangerSoft: '#F8E1E5',
  neutral: '#A6A5AE',
  black: '#11121A',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const typography = {
  display: 'Newsreader_600SemiBold',
  displayItalic: 'Newsreader_600SemiBold_Italic',
  body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
} as const;

export const shadow = Platform.select({
  ios: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  android: { elevation: 3 },
  default: {},
});
