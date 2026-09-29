import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getAlerts, type DashboardAlert } from '../../lib/dashboard';

const SEVERITY_STYLE: Record<DashboardAlert['severity'], { border: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  critical: { border: '#fecaca', bg: '#fef2f2', icon: 'warning' },
  warning: { border: '#fde68a', bg: '#fffbeb', icon: 'cube' },
  info: { border: '#e5e7eb', bg: '#fff', icon: 'notifications' },
};

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
        <ActivityIndicator size="large" color="#16a34a" />
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
            <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
            <Text style={styles.emptyTitle}>All clear</Text>
            <Text style={styles.emptyText}>No active alerts. Keep scanning shelves to stay ahead of spoilage.</Text>
            <Pressable style={styles.scanButton} onPress={() => router.push('/scan')}>
              <Text style={styles.scanButtonText}>Scan a shelf</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const style = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.info;
          return (
            <View style={[styles.card, { borderColor: style.border, backgroundColor: style.bg }]}>
              <Ionicons name={style.icon} size={20} color="#6b7280" style={styles.cardIcon} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 10,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  cardMessage: {
    fontSize: 13,
    color: '#4b5563',
  },
  cardTime: {
    fontSize: 11,
    color: '#9ca3af',
  },
});
