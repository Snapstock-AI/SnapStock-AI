import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getInventory, type InventoryItem } from '../../lib/dashboard';

const RANGE_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
] as const;

const STATUS_COLORS: Record<InventoryItem['status'], { bg: string; text: string }> = {
  Fresh: { bg: '#dcfce7', text: '#15803d' },
  Ripe: { bg: '#fef3c7', text: '#b45309' },
  Spoiled: { bg: '#fee2e2', text: '#b91c1c' },
  Unknown: { bg: '#f3f4f6', text: '#4b5563' },
};

export default function InventoryScreen() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? null;

  const [windowDays, setWindowDays] = useState<number>(7);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setError(null);
    try {
      const result = await getInventory(businessId, windowDays);
      setItems(result.data?.items ?? []);
      setLowStockThreshold(result.data?.lowStockThreshold ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load inventory');
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
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
        {lowStockThreshold !== null ? (
          <Text style={styles.subtitle}>Low-stock threshold: {lowStockThreshold} units</Text>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <FlatList
            data={items}
            keyExtractor={(item, index) => `${item.product}-${index}`}
            contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No detections in this window yet. Scan a shelf to populate inventory.</Text>
            }
            renderItem={({ item }) => {
              const colors = STATUS_COLORS[item.status] ?? STATUS_COLORS.Unknown;
              return (
                <View style={styles.row}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{item.product}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.rowMeta}>
                    Stock: {item.stock} · Freshness: {Math.round(item.freshnessPct)}%
                  </Text>
                  <Text style={styles.rowMeta}>
                    Fresh {item.fresh} · Ripe {item.ripe} · Spoiled {item.spoiled}
                  </Text>
                  {item.lowStock ? <Text style={styles.lowStock}>Low stock</Text> : null}
                </View>
              );
            }}
          />
        </>
      )}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lowStock: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    marginTop: 2,
  },
});
