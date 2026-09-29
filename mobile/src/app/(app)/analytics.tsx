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
import { getAnalytics, type AnalyticsData } from '../../lib/dashboard';

export default function AnalyticsScreen() {
  const { user } = useAuth();
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
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Analytics</Text>
      </View>
      <Text style={styles.subtitle}>Waste patterns and inventory trends from the last 7 days of scans</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : !data?.hasData ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No analytics yet</Text>
          <Text style={styles.emptyText}>Complete shelf scans to see waste rates and product trends.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/scan')}>
            <Text style={styles.primaryButtonText}>Run a scan</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.kpiGrid}>
            <KpiTile label="Weekly waste" value={`${data.wastePct}%`} sub="Spoiled share of detections" />
            <KpiTile label="Items graded fresh" value={String(data.itemsSaved)} sub="Fresh detections this week" />
            <KpiTile
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

function KpiTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.kpiTile}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  muted: {
    color: '#6b7280',
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backLink: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: -8,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiTile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  kpiSub: {
    fontSize: 11,
    color: '#15803d',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  productRow: {
    gap: 6,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    color: '#111827',
  },
  productMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
