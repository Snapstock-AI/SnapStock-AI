import { Platform, type ViewStyle } from 'react-native';

// Business-SaaS design system (via the ui-ux-pro-max skill: Flat Design style,
// "industrial slate + stock green" palette, Poppins/Open Sans typography).
// Flat Design deliberately avoids shadows/gradients/3D effects — depth comes
// from color and borders, not elevation.
export const colors = {
  primary: '#334155',
  primaryDark: '#1e293b',
  onPrimary: '#ffffff',
  secondary: '#475569',
  onSecondary: '#ffffff',
  accent: '#059669',
  accentDark: '#047857',
  accentSoft: '#ecfdf5',
  onAccent: '#ffffff',

  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e6e8ea',

  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#475569',
  textOnPrimary: '#ffffff',

  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  onDanger: '#ffffff',
  warning: '#d97706',
  warningSoft: '#fffbeb',
  info: '#2563eb',

  muted: '#f2f3f4',
  ring: '#334155',
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

// Poppins for headings/emphasis, Open Sans for body — loaded via
// @expo-google-fonts/{poppins,open-sans} and gated behind a splash screen
// in app/_layout.tsx. Falls back to the system font on the (brief) frame
// before fonts finish loading.
export const fonts = {
  heading: 'Poppins_600SemiBold',
  headingBold: 'Poppins_700Bold',
  body: 'OpenSans_400Regular',
  bodyMedium: 'OpenSans_500Medium',
  bodySemiBold: 'OpenSans_600SemiBold',
} as const;

export const typography = {
  title: { fontFamily: fonts.headingBold, fontSize: 22 },
  h2: { fontFamily: fonts.heading, fontSize: 18 },
  h3: { fontFamily: fonts.heading, fontSize: 15 },
  body: { fontFamily: fonts.body, fontSize: 14 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12 },
};

/**
 * Flat Design has no shadows/elevation — this exists only to keep a stable
 * card-surface API (border + background) as screens get restyled, without
 * every screen repeating the same three lines.
 */
export function card(): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  };
}

/** Ripple config for Pressable's android_ripple prop; no-op shape on iOS. */
export const ripple = { color: 'rgba(5, 150, 105, 0.12)' };
