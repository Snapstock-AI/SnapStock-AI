import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth, type Business } from '../../context/AuthContext';
import { getMyBusinesses, updateBusiness } from '../../lib/business';

export default function SettingsScreen() {
  const { user, updateProfile, changePassword, logout } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);

  const [profileName, setProfileName] = useState(user?.full_name ?? '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [lowStockThreshold, setLowStockThreshold] = useState('25');
  const [freshnessThreshold, setFreshnessThreshold] = useState('65');
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.businessId) {
      setIsLoadingBusiness(false);
      return;
    }
    let active = true;
    getMyBusinesses()
      .then((businesses) => {
        if (!active) return;
        const current = businesses.find((item) => item.id === user.businessId) ?? null;
        setBusiness(current);
        if (current) {
          setLowStockThreshold(String(current.low_stock_threshold ?? 25));
          setFreshnessThreshold(String(current.freshness_alert_threshold ?? 65));
        }
      })
      .catch((err) => {
        if (active) setBusinessError(err instanceof Error ? err.message : 'Unable to load business details.');
      })
      .finally(() => {
        if (active) setIsLoadingBusiness(false);
      });
    return () => {
      active = false;
    };
  }, [user?.businessId]);

  async function handleSaveProfile() {
    if (isSavingProfile) return;
    setMessage(null);
    setError(null);
    setIsSavingProfile(true);
    try {
      await updateProfile(profileName.trim());
      setMessage('Profile updated successfully.');
      setIsEditingProfile(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveThresholds() {
    if (!user?.businessId || business?.role !== 'OWNER' || isSavingThresholds) return;
    setMessage(null);
    setError(null);
    setIsSavingThresholds(true);
    try {
      const updated = await updateBusiness(user.businessId, {
        low_stock_threshold: Number(lowStockThreshold),
        freshness_alert_threshold: Number(freshnessThreshold),
      });
      setBusiness((prev) => (prev ? { ...prev, ...updated, role: prev.role } : updated));
      setMessage('Alert thresholds saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save thresholds.');
    } finally {
      setIsSavingThresholds(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6 || isSavingPassword) return;
    setMessage(null);
    setError(null);
    setIsSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setMessage('Password changed successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile</Text>
          {!isEditingProfile ? (
            <Pressable onPress={() => setIsEditingProfile(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          ) : null}
        </View>

        {isEditingProfile ? (
          <View style={styles.field}>
            <TextInput
              style={styles.input}
              value={profileName}
              onChangeText={setProfileName}
              placeholder="Full name"
            />
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setProfileName(user?.full_name ?? '');
                  setIsEditingProfile(false);
                }}
                disabled={isSavingProfile}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSavingProfile && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile || !profileName.trim()}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <InfoRow label="Full name" value={user?.full_name ?? 'Not available'} />
            <InfoRow label="Email" value={user?.email ?? 'Not available'} />
            <InfoRow label="Account role" value={user?.system_role ?? 'Not available'} />
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Business</Text>
        {isLoadingBusiness ? (
          <ActivityIndicator color="#16a34a" />
        ) : businessError ? (
          <Text style={styles.error}>{businessError}</Text>
        ) : business ? (
          <>
            <InfoRow label="Business name" value={business.business_name} />
            <InfoRow label="Business email" value={business.business_email} />
            <InfoRow label="Contact number" value={business.contact_number} />
            <InfoRow label="Address" value={business.address} />
            <InfoRow label="Your role" value={business.role} />
          </>
        ) : (
          <Text style={styles.muted}>No business connected to this account.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Alert thresholds</Text>
        <Text style={styles.cardSubtitle}>Used for low-stock and freshness-risk alerts</Text>

        <Text style={styles.label}>Low stock threshold (count)</Text>
        <TextInput
          style={styles.input}
          value={lowStockThreshold}
          onChangeText={setLowStockThreshold}
          keyboardType="number-pad"
          editable={business?.role === 'OWNER'}
        />

        <Text style={styles.label}>Freshness risk alert at / above (%)</Text>
        <TextInput
          style={styles.input}
          value={freshnessThreshold}
          onChangeText={setFreshnessThreshold}
          keyboardType="number-pad"
          editable={business?.role === 'OWNER'}
        />

        {business?.role === 'OWNER' ? (
          <Pressable
            style={[styles.primaryButton, isSavingThresholds && styles.buttonDisabled]}
            onPress={handleSaveThresholds}
            disabled={isSavingThresholds}
          >
            {isSavingThresholds ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save thresholds</Text>
            )}
          </Pressable>
        ) : (
          <Text style={styles.muted}>Only the business owner can change alert thresholds.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password (min 6 characters)"
          placeholderTextColor="#9ca3af"
          secureTextEntry
        />
        <Pressable
          style={[styles.primaryButton, isSavingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={isSavingPassword || newPassword.length < 6}
        >
          {isSavingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Change password</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.signOutButton} onPress={() => logout()}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  success: {
    color: '#15803d',
    fontSize: 13,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  muted: {
    color: '#6b7280',
    fontSize: 13,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -6,
  },
  editLink: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 13,
  },
  infoRow: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  field: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
