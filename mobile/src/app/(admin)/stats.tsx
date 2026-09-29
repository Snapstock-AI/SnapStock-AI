import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAdminStats, type AdminStats } from '../../lib/admin';
import { card, fonts, radius, spacing, typography, type ThemeColors } from '../../theme';

export default function StatsScreen() {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load stats');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>System stats</Text>
          <Text style={styles.subtitle}>{user?.full_name ?? 'Admin'}</Text>
        </View>
        <Pressable onPress={() => logout()} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {stats ? (
            <>
              <View style={styles.grid}>
                <StatTile styles={styles} label="Businesses" value={String(stats.totalBusinesses)} />
                <StatTile styles={styles} label="Active" value={String(stats.activeBusinesses)} />
                <StatTile styles={styles} label="Suspended" value={String(stats.suspendedBusinesses)} />
                <StatTile styles={styles} label="Users" value={String(stats.totalUsers)} />
                <StatTile styles={styles} label="Scans" value={String(stats.totalScans)} />
                <StatTile styles={styles} label="Detections" value={String(stats.totalDetections)} />
                <StatTile styles={styles} label="Active alerts" value={String(stats.activeAlerts)} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>System health</Text>
                <HealthRow styles={styles} colors={colors} label="Database" status={stats.health.database} />
                <HealthRow styles={styles} colors={colors} label="AI service" status={stats.health.aiService} />
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function StatTile({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function HealthRow({
  label,
  status,
  styles,
  colors,
}: {
  label: string;
  status: string;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}) {
  const ok = status === 'ok';
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthLabel}>{label}</Text>
      <View style={[styles.healthBadge, { backgroundColor: ok ? colors.accentSoft : colors.dangerSoft }]}>
        <Text style={[styles.healthBadgeText, { color: ok ? colors.accentDark : colors.danger }]}>{status}</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
    },
    center: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
    signOut: {
      fontFamily: fonts.bodySemiBold,
      color: colors.danger,
      fontSize: 13,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      color: colors.danger,
      fontSize: 13,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tile: {
      flexBasis: '31%',
      flexGrow: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      ...card(colors),
    },
    tileValue: {
      ...typography.h2,
      fontSize: 20,
      color: colors.textPrimary,
    },
    tileLabel: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    healthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    healthLabel: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    healthBadge: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    healthBadgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      textTransform: 'uppercase',
    },
  });
