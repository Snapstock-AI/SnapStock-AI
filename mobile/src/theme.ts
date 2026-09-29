import { Platform, type ViewStyle } from 'react-native';

// Shared design tokens for the UI polish pass. Values lean toward each
// platform's own conventions (see card()/Platform.select below) rather than
// porting the web client's Tailwind palette 1:1.
export const colors = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  primarySoft: '#f0fdf4',
  primaryBorder: '#bbf7d0',

  background: '#f7f8fa',
  surface: '#ffffff',
  border: '#e5e7eb',

  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
  textOnPrimary: '#ffffff',

  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  info: '#2563eb',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 18, fontWeight: '700' as const },
  h3: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

/** Platform-native elevation: a soft shadow on iOS, Material elevation on Android. */
export function card(elevation: 1 | 2 | 3 = 1): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: elevation },
      shadowOpacity: 0.06 + elevation * 0.01,
      shadowRadius: elevation * 4,
    },
    android: { elevation: elevation * 2 },
    default: {},
  })!;
}

/** Ripple config for Pressable's android_ripple prop; no-op shape on iOS. */
export const ripple = { color: 'rgba(22, 163, 74, 0.12)' };
