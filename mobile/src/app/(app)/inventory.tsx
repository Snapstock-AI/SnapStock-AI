import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getInventory, type InventoryItem } from '../../lib/dashboard';
import { card, fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

const RANGE_OPTIONS = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
] as const;

function statusColors(colors: ThemeColors): Record<InventoryItem['status'], { bg: string; text: string }> {
  return {
    Fresh: { bg: colors.accentSoft, text: colors.accentDark },
    Ripe: { bg: colors.warningSoft, text: colors.warning },
    Spoiled: { bg: colors.dangerSoft, text: colors.danger },
    Unknown: { bg: colors.muted, text: colors.textSecondary },
  };
}

export default function InventoryScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const badgeColors = useMemo(() => statusColors(colors), [colors]);
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
              android_ripple={ripple}
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
          <ActivityIndicator size="large" color={colors.accent} />
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
              const badge = badgeColors[item.status] ?? badgeColors.Unknown;
              return (
                <View style={styles.row}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName}>{item.product}</Text>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
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
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    subtitle: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.lg,
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
      paddingHorizontal: 40,
    },
    emptyText: {
      fontFamily: fonts.body,
      color: colors.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
    row: {
      padding: spacing.md,
      borderRadius: radius.md,
      gap: 4,
      ...card(colors),
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowName: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    rowMeta: {
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
    lowStock: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.warning,
      marginTop: 2,
    },
  });
