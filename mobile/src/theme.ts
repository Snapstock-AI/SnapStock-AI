import type { ViewStyle } from 'react-native';

// Business-SaaS design system (via the ui-ux-pro-max skill: Flat Design style,
// "industrial slate + stock green" palette, Poppins/Open Sans typography).
// Flat Design deliberately avoids shadows/gradients/3D effects — depth comes
// from color and borders, not elevation.
export type ColorScheme = 'light' | 'dark';

// Brand accent stays the same hex across both themes (common for a product's
// core brand color) rather than shifting hue between light/dark — only the
// neutral chrome (backgrounds, borders, text) adapts per scheme.
const brand = {
  accent: '#059669',
  accentDark: '#047857',
  onAccent: '#ffffff',
  danger: '#dc2626',
  onDanger: '#ffffff',
  warning: '#d97706',
  info: '#2563eb',
} as const;

type ThemeColorTokens = typeof brand & {
  primary: string;
  primaryDark: string;
  onPrimary: string;
  secondary: string;
  onSecondary: string;
  accentSoft: string;
  background: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  dangerSoft: string;
  dangerBorder: string;
  warningSoft: string;
  muted: string;
  ring: string;
};

const lightColors: ThemeColorTokens = {
  ...brand,
  primary: '#334155',
  primaryDark: '#1e293b',
  onPrimary: '#ffffff',
  secondary: '#475569',
  onSecondary: '#ffffff',
  accentSoft: '#ecfdf5',

  background: '#f8fafc',
  surface: '#ffffff',
  border: '#e6e8ea',

  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#475569',
  textOnPrimary: '#ffffff',

  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  warningSoft: '#fffbeb',

  muted: '#f2f3f4',
  ring: '#334155',
};

const darkColors: ThemeColorTokens = {
  ...brand,
  primary: '#cbd5e1',
  primaryDark: '#e2e8f0',
  onPrimary: '#0f172a',
  secondary: '#94a3b8',
  onSecondary: '#0f172a',
  accentSoft: '#0f2e22',

  background: '#0b1220',
  surface: '#161f2e',
  border: '#293548',

  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  textOnPrimary: '#0f172a',

  dangerSoft: '#3f1d1d',
  dangerBorder: '#7f1d1d',
  warningSoft: '#3f2d09',

  muted: '#1e293b',
  ring: '#cbd5e1',
};

export const palettes: Record<ColorScheme, typeof lightColors> = {
  light: lightColors,
  dark: darkColors,
};

export type ThemeColors = typeof lightColors;

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
 * every screen repeating the same three lines. Takes the active theme's
 * colors so it stays correct when the user switches light/dark.
 */
export function card(colors: ThemeColors): ViewStyle {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  };
}

/** Ripple config for Pressable's android_ripple prop; no-op shape on iOS. */
export const ripple = { color: 'rgba(5, 150, 105, 0.12)' };
