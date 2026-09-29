import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAlerts, type DashboardAlert } from '../../lib/dashboard';
import { fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

function severityStyle(
  colors: ThemeColors,
): Record<DashboardAlert['severity'], { border: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> {
  return {
    critical: { border: colors.dangerBorder, bg: colors.dangerSoft, icon: 'warning' },
    warning: { border: colors.warningSoft, bg: colors.warningSoft, icon: 'cube' },
    info: { border: colors.border, bg: colors.surface, icon: 'notifications' },
  };
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AlertsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const severity = useMemo(() => severityStyle(colors), [colors]);
  const businessId = user?.businessId ?? null;

  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setError(null);
    try {
      const result = await getAlerts(businessId);
      setAlerts(result.data?.alerts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load alerts');
    }
  }, [businessId]);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        <Text style={styles.headerSubtitle}>Spoilage warnings and low-stock notifications</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={alerts.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={40} color={colors.accent} />
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyText}>No active alerts. Keep scanning shelves to stay ahead of spoilage.</Text>
            <Pressable style={styles.scanButton} onPress={() => router.push('/scan')} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
              <Text style={styles.scanButtonText}>Scan a shelf</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const style = severity[item.severity] ?? severity.info;
          return (
            <View style={[styles.card, { borderColor: style.border, backgroundColor: style.bg }]}>
              <Ionicons name={style.icon} size={20} color={colors.textMuted} style={styles.cardIcon} />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMessage}>{item.message}</Text>
              </View>
              <Text style={styles.cardTime}>{formatRelative(item.createdAt)}</Text>
            </View>
          );
        }}
      />
    </View>
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
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      gap: 4,
    },
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      color: colors.danger,
      fontSize: 13,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    list: {
      paddingHorizontal: spacing.xl,
      paddingBottom: 24,
      gap: spacing.sm,
    },
    emptyList: {
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      paddingTop: 60,
      gap: 6,
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginTop: 4,
    },
    emptyText: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: 12,
    },
    scanButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      overflow: 'hidden',
    },
    scanButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    cardIcon: {
      marginTop: 2,
    },
    cardBody: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    cardMessage: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
    cardTime: {
      fontFamily: fonts.body,
      fontSize: 11,
      color: colors.textMuted,
    },
  });
