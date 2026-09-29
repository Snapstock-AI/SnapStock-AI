import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { getAnalytics, type AnalyticsData } from '../../lib/dashboard';
import { card, fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const businessId = user?.businessId ?? null;
  const isOwner = user?.businessRole === 'OWNER';

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !isOwner) return;
    setError(null);
    try {
      const result = await getAnalytics(businessId, 7);
      if (!result.data) throw new Error(result.message || 'Unable to load analytics');
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics');
    }
  }, [businessId, isOwner]);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  if (!isOwner) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Only the business owner can view analytics.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backLink}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Analytics</Text>
      </View>
      <Text style={styles.subtitle}>Waste patterns and inventory trends from the last 7 days of scans</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : !data?.hasData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No analytics yet</Text>
          <Text style={styles.emptyText}>Complete shelf scans to see waste rates and product trends.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/scan')} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
            <Text style={styles.primaryButtonText}>Run a scan</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KpiTile styles={styles} label="Weekly waste" value={`${data.wastePct}%`} sub="Spoiled share of detections" />
            <KpiTile styles={styles} label="Items graded fresh" value={String(data.itemsSaved)} sub="Fresh detections this week" />
            <KpiTile
              styles={styles}
              label="Avg confidence"
              value={data.avgConfidence != null ? `${data.avgConfidence}%` : '—'}
              sub={`${data.scanCount} completed scan(s)`}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Waste by product</Text>
            {data.wasteByProduct.length === 0 ? (
              <Text style={styles.muted}>No product detections yet.</Text>
            ) : (
              data.wasteByProduct.map((item) => (
                <View key={item.product} style={styles.productRow}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{item.product}</Text>
                    <Text style={styles.productMeta}>
                      {item.wastePct}% ({item.spoiled}/{item.total})
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.min(100, item.wastePct)}%` }]} />
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function KpiTile({
  label,
  value,
  sub,
  styles,
}: {
  label: string;
  value: string;
  sub: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.kpiTile}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
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
      paddingBottom: 40,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    muted: {
      fontFamily: fonts.body,
      color: colors.textMuted,
      fontSize: 13,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    backLink: {
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
      fontSize: 14,
    },
    title: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
      marginTop: -8,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      color: colors.danger,
      fontSize: 13,
    },
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    kpiTile: {
      flexBasis: '47%',
      flexGrow: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 2,
      ...card(colors),
    },
    kpiLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    kpiValue: {
      ...typography.title,
      fontSize: 22,
      color: colors.textPrimary,
    },
    kpiSub: {
      fontFamily: fonts.bodyMedium,
      fontSize: 11,
      color: colors.accentDark,
    },
    card: {
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.md,
      ...card(colors),
    },
    cardTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    productRow: {
      gap: spacing.xs,
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    productName: {
      fontFamily: fonts.body,
      fontSize: 14,
      color: colors.textPrimary,
    },
    productMeta: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
    },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.muted,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 24,
      gap: spacing.xs,
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
    primaryButton: {
      marginTop: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      overflow: 'hidden',
    },
    primaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
    },
  });
