import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getDashboard, type DashboardData } from '../../lib/dashboard';
import { card, colors, fonts, radius, ripple, spacing, typography } from '../../theme';

const RANGE_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
] as const;

export default function HomeScreen() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? null;

  const [windowDays, setWindowDays] = useState<number>(7);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setError(null);
    try {
      const result = await getDashboard(businessId, windowDays);
      if (!result.data) throw new Error(result.message || 'Unable to load dashboard');
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    }
  }, [businessId, windowDays]);

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
        <View style={styles.headerRowTop}>
          <Text style={styles.greeting}>Welcome, {user?.full_name?.split(' ')[0] ?? 'vendor'}</Text>
          {user?.businessRole === 'OWNER' ? (
            <Pressable onPress={() => router.push('/analytics')} hitSlop={8} android_ripple={ripple}>
              <Text style={styles.analyticsLink}>Analytics</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.chipRow}>
        {RANGE_OPTIONS.map((option) => (
          <Pressable
            key={option.days}
            style={[styles.chip, windowDays === option.days && styles.chipActive]}
            onPress={() => setWindowDays(option.days)}
            android_ripple={ripple}
          >
            <Text style={[styles.chipText, windowDays === option.days && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {data ? (
            <>
              <View style={styles.kpiGrid}>
                <KpiTile label="Total SKUs" value={String(data.kpis.totalSkus)} />
                <KpiTile
                  label="Avg freshness"
                  value={data.kpis.avgFreshness !== null ? `${Math.round(data.kpis.avgFreshness)}%` : '—'}
                />
                <KpiTile label="Active alerts" value={String(data.kpis.activeAlerts)} />
                <KpiTile label="Scans today" value={String(data.kpis.scansToday)} />
              </View>

              {data.topAlert ? (
                <View style={styles.topAlert}>
                  <Text style={styles.topAlertTitle}>{data.topAlert.title}</Text>
                  <Text style={styles.topAlertMessage}>{data.topAlert.message}</Text>
                </View>
              ) : null}

              <Pressable
                style={styles.scanButton}
                onPress={() => router.push('/scan')}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={styles.scanButtonText}>Scan a shelf</Text>
              </Pressable>

              {data.freshnessMix.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Freshness mix</Text>
                  {data.freshnessMix.map((segment) => (
                    <View key={segment.label} style={styles.listRow}>
                      <Text style={styles.listRowLabel}>{segment.label}</Text>
                      <Text style={styles.listRowValue}>
                        {Math.round(segment.value)}% ({segment.count})
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {data.shelfHealth.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Shelf health</Text>
                  {data.shelfHealth.map((shelf) => (
                    <View key={shelf.shelfId} style={styles.listRow}>
                      <Text style={styles.listRowLabel}>{shelf.name}</Text>
                      <Text style={styles.listRowValue}>
                        {Math.round(shelf.pct)}% · {shelf.itemCount} items
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {!data.hasData ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No data yet</Text>
                  <Text style={styles.emptyText}>Scan a shelf to start seeing inventory and freshness insights.</Text>
                </View>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiTile}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    gap: 2,
  },
  headerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    ...typography.title,
    fontSize: 21,
    color: colors.textPrimary,
  },
  analyticsLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.accent,
  },
  email: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    fontFamily: fonts.bodySemiBold,
    color: colors.onAccent,
  },
  error: {
    fontFamily: fonts.bodyMedium,
    color: colors.danger,
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...card(),
  },
  kpiValue: {
    ...typography.title,
    fontSize: 22,
    color: colors.textPrimary,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  topAlert: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    gap: 2,
  },
  topAlertTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.danger,
  },
  topAlertMessage: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: '#991b1b',
  },
  scanButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  scanButtonText: {
    fontFamily: fonts.bodySemiBold,
    color: colors.onAccent,
    fontSize: 15,
  },
  section: {
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...card(),
  },
  sectionTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  listRowLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  listRowValue: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
