import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  countHistoryItems,
  formatHistoryDate,
  getScanHistory,
  type ScanHistoryItem,
} from '../../lib/detection';
import { fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

type RangeOption = { label: string; days: number | null };

const RANGE_OPTIONS: RangeOption[] = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All time', days: null },
];

function statusColors(colors: ThemeColors): Record<ScanHistoryItem['status'], { bg: string; text: string }> {
  return {
    PENDING: { bg: colors.warningSoft, text: colors.warning },
    PROCESSING: { bg: colors.muted, text: colors.info },
    COMPLETED: { bg: colors.accentSoft, text: colors.accentDark },
    FAILED: { bg: colors.dangerSoft, text: colors.danger },
  };
}

function rangeStart(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function ScanHistoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statuses = useMemo(() => statusColors(colors), [colors]);
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
        <Pressable onPress={() => router.back()} hitSlop={8}>
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
            android_ripple={ripple}
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
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={scans.length === 0 ? styles.emptyList : styles.list}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No scans found for this range.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => setSelected(item)} android_ripple={ripple}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.shelf_name}</Text>
                <Text style={styles.rowMeta}>
                  {item.item_count} item{item.item_count === 1 ? '' : 's'} · Fresh {item.fresh_count} · Medium{' '}
                  {item.medium_count} · Spoiled {item.spoiled_count}
                </Text>
                <Text style={styles.rowTime}>{formatHistoryDate(item.created_at)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statuses[item.status].bg }]}>
                <Text style={[styles.badgeText, { color: statuses[item.status].text }]}>{item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected ? (
          <View style={[styles.modalContainer, { paddingTop: insets.top + spacing.lg }]}>
            <View style={styles.header}>
              <Pressable onPress={() => setSelected(null)} hitSlop={8}>
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    backLink: {
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
      fontSize: 14,
    },
    title: {
      ...typography.h2,
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    chipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipText: {
      fontFamily: fonts.bodyMedium,
      fontSize: 13,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontFamily: fonts.body,
      color: colors.textMuted,
      fontSize: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    rowMain: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    rowMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    rowTime: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    badge: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
    },
    badgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
    },
    statGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    statBox: {
      flexBasis: '47%',
      backgroundColor: colors.muted,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    statLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    statValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 16,
      color: colors.textPrimary,
      marginTop: 2,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    detailLabel: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textPrimary,
      textTransform: 'capitalize',
    },
    detailValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.accentDark,
    },
  });
