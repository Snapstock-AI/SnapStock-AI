import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getAdminStats, type AdminStats } from '../../lib/admin';

export default function StatsScreen() {
  const { user, logout } = useAuth();
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
        <Pressable onPress={() => logout()}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {stats ? (
            <>
              <View style={styles.grid}>
                <StatTile label="Businesses" value={String(stats.totalBusinesses)} />
                <StatTile label="Active" value={String(stats.activeBusinesses)} />
                <StatTile label="Suspended" value={String(stats.suspendedBusinesses)} />
                <StatTile label="Users" value={String(stats.totalUsers)} />
                <StatTile label="Scans" value={String(stats.totalScans)} />
                <StatTile label="Detections" value={String(stats.totalDetections)} />
                <StatTile label="Active alerts" value={String(stats.activeAlerts)} />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>System health</Text>
                <HealthRow label="Database" status={stats.health.database} />
                <HealthRow label="AI service" status={stats.health.aiService} />
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function HealthRow({ label, status }: { label: string; status: string }) {
  const ok = status === 'ok';
  return (
    <View style={styles.healthRow}>
      <Text style={styles.healthLabel}>{label}</Text>
      <View style={[styles.healthBadge, ok ? styles.healthBadgeOk : styles.healthBadgeError]}>
        <Text style={[styles.healthBadgeText, ok ? styles.healthBadgeTextOk : styles.healthBadgeTextError]}>
          {status}
        </Text>
      </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  signOut: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    flexBasis: '31%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  tileValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tileLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  healthLabel: {
    fontSize: 14,
    color: '#111827',
  },
  healthBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  healthBadgeOk: {
    backgroundColor: '#dcfce7',
  },
  healthBadgeError: {
    backgroundColor: '#fee2e2',
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  healthBadgeTextOk: {
    color: '#15803d',
  },
  healthBadgeTextError: {
    color: '#b91c1c',
  },
});
