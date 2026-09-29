import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { activateVendor, listVendors, suspendVendor, type Vendor } from '../../lib/admin';

export default function VendorsScreen() {
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
        <ActivityIndicator size="large" color="#16a34a" />
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
            >
              {pendingId === item.id ? (
                <ActivityIndicator color="#fff" size="small" />
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
    gap: 2,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
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
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgeSuspended: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#15803d',
  },
  badgeTextSuspended: {
    color: '#b91c1c',
  },
  actionButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionButtonSuspend: {
    backgroundColor: '#dc2626',
  },
  actionButtonActivate: {
    backgroundColor: '#16a34a',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
