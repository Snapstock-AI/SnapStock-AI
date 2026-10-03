import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPostAuthRoute } from '../lib/routing';
import { fonts, radius, ripple, spacing, typography, type ThemeColors } from '../theme';

// Mobile-adapted version of the web client's marketing landing page
// (client/src/sections/{Hero,Features,HowItWorks}.tsx) — this app's
// pre-auth entry point, shown once per cold start to a signed-out user
// (see index.tsx). Not the authenticated Home tab.
const STATS = [
  { value: '138k+', label: 'training images' },
  { value: '3-tier', label: 'freshness scoring' },
  { value: '< 2s', label: 'per shelf scan' },
] as const;

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string }[] = [
  {
    icon: 'camera-outline',
    title: 'Scan with any phone',
    description:
      'Point your camera at a shelf. Our vision model counts stock and reads freshness — no scanners, no scales, no barcodes.',
  },
  {
    icon: 'leaf-outline',
    title: 'Freshness scoring',
    description: 'A model trained on 138k+ produce images grades each item as Fresh, Medium or Spoiled.',
  },
  {
    icon: 'notifications-outline',
    title: 'Real-time alerts',
    description: 'Get pinged the moment a batch is nearing spoilage or a bin drops below your reorder threshold.',
  },
  {
    icon: 'bar-chart-outline',
    title: 'Waste analytics',
    description: 'See which SKUs spoil fastest and where your shelf life is quietly eating margin.',
  },
  {
    icon: 'storefront-outline',
    title: 'Multi-tenant catalog',
    description: 'Manage multiple stalls, staff, and product catalogs from one dashboard with role-based access.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Private by default',
    description: 'Images are processed securely and never used to train third-party models.',
  },
];

const STEPS = [
  { num: '01', title: 'Snap the shelf', description: 'Open SnapStock-AI and capture a photo of your produce section.' },
  { num: '02', title: 'AI does the counting', description: 'Our detector identifies items and estimates ripeness for each unit.' },
  { num: '03', title: 'Act on insights', description: 'Review counts, mark spoiled items, and let alerts guide your next reorder.' },
];

export default function WelcomeScreen() {
  const { isAuthenticated, isHydrating, user } = useAuth();
  const { colors, scheme, toggle } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (isHydrating) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Reachable only from index.tsx's redirect for signed-out users, but
  // guard directly too in case something links here while authenticated.
  if (isAuthenticated) {
    return <Redirect href={getPostAuthRoute(user)} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoDot} />
          <Text style={styles.brandName}>SnapStock-AI</Text>
        </View>
        <Pressable onPress={toggle} hitSlop={10} style={styles.themeToggle} android_ripple={ripple}>
          <Ionicons name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.badge}>
        <Ionicons name="sparkles-outline" size={13} color={colors.accentDark} />
        <Text style={styles.badgeText}>Built for small-scale retailers</Text>
      </View>

      <Text style={styles.heading}>
        Every shelf, <Text style={{ color: colors.accent }}>counted.</Text>
        {'\n'}Every fruit, <Text style={{ color: colors.warning }}>graded.</Text>
      </Text>

      <Text style={styles.subcopy}>
        SnapStock-AI turns a smartphone camera into a real-time inventory and freshness auditor. No hardware. No
        barcodes. Just point, scan, and stop losing produce to spoilage.
      </Text>

      <View style={styles.ctaRow}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/register')}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <Text style={styles.primaryButtonText}>Get started</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/login')} android_ripple={ripple}>
          <Text style={styles.secondaryButtonText}>Sign in</Text>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        {STATS.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>Features</Text>
        <Text style={styles.sectionTitle}>Enterprise-grade produce intelligence, sized for the corner shop.</Text>
      </View>

      <View style={styles.featureGrid}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon} size={20} color={colors.accent} />
            </View>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.eyebrow}>How it works</Text>
        <Text style={styles.sectionTitle}>From shelf to insight in seconds.</Text>
      </View>

      <View style={styles.stepsColumn}>
        {STEPS.map((step) => (
          <View key={step.num} style={styles.stepCard}>
            <Text style={styles.stepNum}>{step.num}</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerCta}>
        <Text style={styles.footerTitle}>Ready to stop guessing what's on your shelves?</Text>
        <Pressable
          style={[styles.primaryButton, styles.footerButton]}
          onPress={() => router.push('/register')}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          <Text style={styles.primaryButtonText}>Start free trial</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
        </Pressable>
        <Pressable onPress={() => router.push('/login')} hitSlop={8}>
          <Text style={styles.footerLink}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      paddingBottom: 40,
      gap: spacing.xxl,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    logoDot: {
      width: 22,
      height: 22,
      borderRadius: radius.sm,
      backgroundColor: colors.accent,
    },
    brandName: {
      ...typography.h2,
      color: colors.textPrimary,
    },
    themeToggle: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      backgroundColor: colors.accentSoft,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginTop: -spacing.md,
    },
    badgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.accentDark,
    },
    heading: {
      ...typography.title,
      fontSize: 32,
      lineHeight: 38,
      color: colors.textPrimary,
      marginTop: -spacing.lg,
    },
    subcopy: {
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      marginTop: -spacing.lg,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: -spacing.md,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      flex: 1,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      overflow: 'hidden',
    },
    primaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
      fontSize: 15,
    },
    footerButton: {
      flex: 0,
      width: '100%',
    },
    secondaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    secondaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
      fontSize: 15,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.lg,
      marginTop: -spacing.md,
    },
    statItem: {
      gap: 2,
    },
    statValue: {
      ...typography.h2,
      color: colors.textPrimary,
    },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    sectionHeader: {
      gap: spacing.xs,
    },
    eyebrow: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      color: colors.accentDark,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    sectionTitle: {
      ...typography.title,
      fontSize: 20,
      lineHeight: 26,
      color: colors.textPrimary,
    },
    featureGrid: {
      gap: spacing.md,
      marginTop: -spacing.md,
    },
    featureCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.xs,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    featureTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    featureDescription: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    stepsColumn: {
      gap: spacing.md,
      marginTop: -spacing.md,
    },
    stepCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: 4,
    },
    stepNum: {
      fontFamily: fonts.headingBold,
      fontSize: 24,
      color: colors.border,
    },
    stepTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    stepDescription: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
    },
    footerCta: {
      alignItems: 'center',
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.xxl,
    },
    footerTitle: {
      ...typography.h2,
      fontSize: 18,
      textAlign: 'center',
      color: colors.textPrimary,
    },
    footerLink: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.accent,
    },
  });
