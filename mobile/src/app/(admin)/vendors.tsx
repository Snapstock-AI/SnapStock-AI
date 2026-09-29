import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { activateVendor, listVendors, suspendVendor, type Vendor } from '../../lib/admin';
import { card, fonts, radius, spacing, typography, type ThemeColors } from '../../theme';

export default function VendorsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listVendors();
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load vendors');
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

  function confirmToggle(vendor: Vendor) {
    const suspending = vendor.status === 'ACTIVE';
    Alert.alert(
      suspending ? 'Suspend vendor' : 'Activate vendor',
      suspending
        ? `Suspend "${vendor.business_name}"? Its owner and employees will be signed out and unable to log back in until reactivated.`
        : `Reactivate "${vendor.business_name}"? Its team will regain access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: suspending ? 'Suspend' : 'Activate',
          style: suspending ? 'destructive' : 'default',
          onPress: async () => {
            setPendingId(vendor.id);
            try {
              if (suspending) {
                await suspendVendor(vendor.id);
              } else {
                await activateVendor(vendor.id);
              }
              setVendors((current) =>
                current.map((item) =>
                  item.id === vendor.id
                    ? { ...item, status: suspending ? 'SUSPENDED' : 'ACTIVE' }
                    : item,
                ),
              );
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Action failed');
            } finally {
              setPendingId(null);
            }
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vendors</Text>
        <Text style={styles.headerSubtitle}>{vendors.length} business(es) on the platform</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={vendors}
        keyExtractor={(item) => item.id}
        contentContainerStyle={vendors.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No businesses registered yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowTop}>
              <Text style={styles.rowName}>{item.business_name}</Text>
              <View
                style={[
                  styles.badge,
                  item.status === 'ACTIVE' ? styles.badgeActive : styles.badgeSuspended,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.status === 'ACTIVE' ? styles.badgeTextActive : styles.badgeTextSuspended,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.rowMeta}>{item.business_email}</Text>
            <Text style={styles.rowMeta}>
              Owner: {item.owner_name ?? 'Unknown'} {item.owner_email ? `(${item.owner_email})` : ''}
            </Text>
            <Pressable
              style={[
                styles.actionButton,
                item.status === 'ACTIVE' ? styles.actionButtonSuspend : styles.actionButtonActivate,
              ]}
              onPress={() => confirmToggle(item)}
              disabled={pendingId === item.id}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {pendingId === item.id ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <Text style={styles.actionButtonText}>
                  {item.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      />
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
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
      gap: 2,
    },
    headerTitle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textMuted,
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
    badgeActive: {
      backgroundColor: colors.accentSoft,
    },
    badgeSuspended: {
      backgroundColor: colors.dangerSoft,
    },
    badgeText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
    },
    badgeTextActive: {
      color: colors.accentDark,
    },
    badgeTextSuspended: {
      color: colors.danger,
    },
    actionButton: {
      marginTop: spacing.xs,
      alignSelf: 'flex-start',
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      overflow: 'hidden',
    },
    actionButtonSuspend: {
      backgroundColor: colors.danger,
    },
    actionButtonActivate: {
      backgroundColor: colors.accent,
    },
    actionButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
      fontSize: 13,
    },
  });
