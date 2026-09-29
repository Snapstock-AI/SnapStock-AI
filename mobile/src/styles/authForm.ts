import { StyleSheet } from 'react-native';
import { fonts, radius, spacing, type ThemeColors } from '../theme';

// Shared layout for the auth screens (login, register, forgot/reset password,
// verify/resend email, accept-invitation, create-business) so each screen
// only has to define its fields and copy. Takes the active theme's colors so
// these screens follow light/dark like the rest of the app.
export const makeAuthFormStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
    },
    form: {
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    eyebrow: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      textAlign: 'center',
    },
    title: {
      fontFamily: fonts.headingBold,
      fontSize: 26,
      color: colors.textPrimary,
      textAlign: 'center',
      marginTop: 4,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.textPrimary,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      color: colors.danger,
      fontSize: 13,
    },
    success: {
      fontFamily: fonts.bodyMedium,
      color: colors.accentDark,
      fontSize: 13,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
      fontSize: 16,
    },
    buttonTextSecondary: {
      color: colors.accent,
    },
    footerText: {
      marginTop: spacing.xxl,
      textAlign: 'center',
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
    link: {
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
    },

    // Richer layout for login/register: a brand block up top instead of pure
    // vertical centering (which leaves a lot of dead space on tall phones),
    // and the fields sit inside a bordered card instead of floating loose.
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.xl,
    },
    brandRow: {
      alignItems: 'center',
    },
    logoMark: {
      width: 56,
      height: 56,
      borderRadius: radius.lg,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    logoMarkText: {
      fontFamily: fonts.headingBold,
      fontSize: 22,
      color: colors.onAccent,
    },
    brandTitle: {
      fontFamily: fonts.headingBold,
      fontSize: 22,
      color: colors.textPrimary,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.xl,
      gap: spacing.md,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    inputFlex: {
      flex: 1,
      paddingVertical: spacing.md,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.textPrimary,
    },
    eyeButton: {
      padding: spacing.xs,
    },
  });
