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
        <Text style={styles.greeting}>Welcome, {user?.full_name?.split(' ')[0] ?? 'vendor'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.chipRow}>
        {RANGE_OPTIONS.map((option) => (
          <Pressable
            key={option.days}
            style={[styles.chip, windowDays === option.days && styles.chipActive]}
            onPress={() => setWindowDays(option.days)}
          >
            <Text style={[styles.chipText, windowDays === option.days && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
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

              <Pressable style={styles.scanButton} onPress={() => router.push('/scan')}>
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
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  headerRow: {
    gap: 2,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 13,
    color: '#6b7280',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  chipText: {
    fontSize: 13,
    color: '#374151',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  topAlert: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
    gap: 2,
  },
  topAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b91c1c',
  },
  topAlertMessage: {
    fontSize: 12,
    color: '#7f1d1d',
  },
  scanButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listRowLabel: {
    fontSize: 14,
    color: '#111827',
  },
  listRowValue: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
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
});
