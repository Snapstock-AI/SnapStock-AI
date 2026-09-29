import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  countHistoryItems,
  formatHistoryDate,
  getScanHistory,
  type ScanHistoryItem,
} from '../../lib/detection';

type RangeOption = { label: string; days: number | null };

const RANGE_OPTIONS: RangeOption[] = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All time', days: null },
];

const statusColors: Record<ScanHistoryItem['status'], { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  PROCESSING: { bg: '#dbeafe', text: '#1d4ed8' },
  COMPLETED: { bg: '#dcfce7', text: '#15803d' },
  FAILED: { bg: '#fee2e2', text: '#b91c1c' },
};

function rangeStart(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function ScanHistoryScreen() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? null;

  const [range, setRange] = useState<RangeOption>(RANGE_OPTIONS[1]);
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScanHistoryItem | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setError(null);
    try {
      const data = await getScanHistory(
        businessId,
        range.days ? rangeStart(range.days) : undefined,
      );
      setScans(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load scan history.');
    }
  }, [businessId, range]);

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
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Scan history</Text>
      </View>

      <View style={styles.chipRow}>
        {RANGE_OPTIONS.map((option) => (
          <Pressable
            key={option.label}
            style={[styles.chip, range.label === option.label && styles.chipActive]}
            onPress={() => setRange(option)}
          >
            <Text style={[styles.chipText, range.label === option.label && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={scans.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No scans found for this range.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setSelected(item)}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.shelf_name}</Text>
                <Text style={styles.rowMeta}>
                  {item.item_count} item{item.item_count === 1 ? '' : 's'} · Fresh {item.fresh_count} · Medium{' '}
                  {item.medium_count} · Spoiled {item.spoiled_count}
                </Text>
                <Text style={styles.rowTime}>{formatHistoryDate(item.created_at)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColors[item.status].bg }]}>
                <Text style={[styles.badgeText, { color: statusColors[item.status].text }]}>{item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected ? (
          <View style={styles.modalContainer}>
            <View style={styles.header}>
              <Pressable onPress={() => setSelected(null)}>
                <Text style={styles.backLink}>‹ Close</Text>
              </Pressable>
              <Text style={styles.title}>{selected.shelf_name}</Text>
            </View>
            <Text style={styles.modalSubtitle}>{formatHistoryDate(selected.created_at)}</Text>

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Status</Text>
                <Text style={styles.statValue}>{selected.status}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Items</Text>
                <Text style={styles.statValue}>{selected.item_count}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Fresh</Text>
                <Text style={styles.statValue}>{selected.fresh_count}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Spoiled</Text>
                <Text style={styles.statValue}>{selected.spoiled_count}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Detected items</Text>
            <FlatList
              data={Object.entries(countHistoryItems(selected.items))}
              keyExtractor={([type]) => type}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>No detected items.</Text>}
              renderItem={({ item: [type, count] }) => (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{type}</Text>
                  <Text style={styles.detailValue}>{count}</Text>
                </View>
              )}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backLink: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowMain: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  rowTime: {
    fontSize: 12,
    color: '#9ca3af',
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statBox: {
    flexBasis: '47%',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textTransform: 'capitalize',
  },
  detailValue: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '700',
  },
});
