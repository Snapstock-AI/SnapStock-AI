import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth, type Business } from '../../context/AuthContext';
import { useTheme, type ThemePreference } from '../../context/ThemeContext';
import { deleteBusiness, getMyBusinesses, updateBusiness } from '../../lib/business';
import { fonts, radius, ripple, spacing, typography, type ThemeColors } from '../../theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, changePassword, switchBusiness, refreshBusinessMembership, logout } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [business, setBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [isLoadingBusiness, setIsLoadingBusiness] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [switchingBusinessId, setSwitchingBusinessId] = useState<string | null>(null);

  const [profileName, setProfileName] = useState(user?.full_name ?? '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [lowStockThreshold, setLowStockThreshold] = useState('25');
  const [freshnessThreshold, setFreshnessThreshold] = useState('65');
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [isDeletingBusiness, setIsDeletingBusiness] = useState(false);

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
        setAllBusinesses(businesses);
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

  async function handleSwitchBusiness(businessId: string) {
    if (!businessId || businessId === user?.businessId || switchingBusinessId) return;
    setMessage(null);
    setError(null);
    setSwitchingBusinessId(businessId);
    try {
      await switchBusiness(businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch workspace.');
    } finally {
      setSwitchingBusinessId(null);
    }
  }

  function confirmDeleteBusiness() {
    if (!user?.businessId || isDeletingBusiness) return;
    Alert.alert(
      'Delete business',
      'Delete this business and all of its inventory, shelves, scans, and memberships? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setMessage(null);
            setError(null);
            setIsDeletingBusiness(true);
            try {
              await deleteBusiness(user.businessId!);
              await refreshBusinessMembership();
              router.replace('/');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to delete business.');
            } finally {
              setIsDeletingBusiness(false);
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <View style={styles.chipRow}>
          {THEME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.chip, preference === option.value && styles.chipActive]}
              onPress={() => setPreference(option.value)}
              android_ripple={ripple}
            >
              <Text style={[styles.chipText, preference === option.value && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Profile</Text>
          {!isEditingProfile ? (
            <Pressable onPress={() => setIsEditingProfile(true)} hitSlop={8}>
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
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  setProfileName(user?.full_name ?? '');
                  setIsEditingProfile(false);
                }}
                disabled={isSavingProfile}
                android_ripple={ripple}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSavingProfile && styles.buttonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile || !profileName.trim()}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.primaryButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <InfoRow styles={styles} label="Full name" value={user?.full_name ?? 'Not available'} />
            <InfoRow styles={styles} label="Email" value={user?.email ?? 'Not available'} />
            <InfoRow styles={styles} label="Account role" value={user?.system_role ?? 'Not available'} />
          </>
        )}
      </View>

      {allBusinesses.length > 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Workspaces</Text>
          {allBusinesses.map((item) => {
            const isCurrent = item.id === user?.businessId;
            const isSwitching = switchingBusinessId === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.workspaceRow, isCurrent && styles.workspaceRowActive]}
                onPress={() => handleSwitchBusiness(item.id)}
                disabled={isCurrent || Boolean(switchingBusinessId)}
                android_ripple={ripple}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{item.business_name}</Text>
                  <Text style={styles.rowMeta}>{item.role}</Text>
                </View>
                {isSwitching ? (
                  <ActivityIndicator color={colors.accent} size="small" />
                ) : isCurrent ? (
                  <Text style={styles.currentBadge}>Current</Text>
                ) : null}
              </Pressable>
            );
          })}
          <Pressable onPress={() => router.push('/create-business')} hitSlop={8}>
            <Text style={styles.editLink}>+ Create new business</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Business</Text>
          {business?.role === 'OWNER' ? (
            <Pressable onPress={confirmDeleteBusiness} disabled={isDeletingBusiness} hitSlop={8}>
              {isDeletingBusiness ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <Text style={styles.deleteLink}>Delete business</Text>
              )}
            </Pressable>
          ) : null}
        </View>
        {isLoadingBusiness ? (
          <ActivityIndicator color={colors.accent} />
        ) : businessError ? (
          <Text style={styles.error}>{businessError}</Text>
        ) : business ? (
          <>
            <InfoRow styles={styles} label="Business name" value={business.business_name} />
            <InfoRow styles={styles} label="Business email" value={business.business_email} />
            <InfoRow styles={styles} label="Contact number" value={business.contact_number} />
            <InfoRow styles={styles} label="Address" value={business.address} />
            <InfoRow styles={styles} label="Your role" value={business.role} />
          </>
        ) : (
          <Text style={styles.muted}>No business connected to this account.</Text>
        )}
      </View>

      {business?.role === 'OWNER' ? (
        <Pressable style={styles.card} onPress={() => router.push('/employees')} android_ripple={ripple}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Team</Text>
            <Text style={styles.editLink}>Manage</Text>
          </View>
          <Text style={styles.muted}>Invite employees and manage who has access to this business.</Text>
        </Pressable>
      ) : null}

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
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Freshness risk alert at / above (%)</Text>
        <TextInput
          style={styles.input}
          value={freshnessThreshold}
          onChangeText={setFreshnessThreshold}
          keyboardType="number-pad"
          editable={business?.role === 'OWNER'}
          placeholderTextColor={colors.textMuted}
        />

        {business?.role === 'OWNER' ? (
          <Pressable
            style={[styles.primaryButton, isSavingThresholds && styles.buttonDisabled]}
            onPress={handleSaveThresholds}
            disabled={isSavingThresholds}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {isSavingThresholds ? (
              <ActivityIndicator color={colors.onAccent} />
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
          placeholderTextColor={colors.textMuted}
          secureTextEntry
        />
        <Pressable
          style={[styles.primaryButton, isSavingPassword && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={isSavingPassword || newPassword.length < 6}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {isSavingPassword ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>Change password</Text>
          )}
        </Pressable>
      </View>

      <Pressable style={styles.signOutButton} onPress={() => logout()} android_ripple={{ color: 'rgba(220,38,38,0.12)' }}>
        <Text style={styles.signOutButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.xl,
      gap: spacing.lg,
      paddingBottom: 40,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    success: {
      fontFamily: fonts.bodyMedium,
      color: colors.accentDark,
      fontSize: 13,
    },
    error: {
      fontFamily: fonts.bodyMedium,
      color: colors.danger,
      fontSize: 13,
    },
    muted: {
      fontFamily: fonts.body,
      color: colors.textMuted,
      fontSize: 13,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: {
      ...typography.h3,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -6,
    },
    editLink: {
      fontFamily: fonts.bodySemiBold,
      color: colors.info,
      fontSize: 13,
    },
    deleteLink: {
      fontFamily: fonts.bodySemiBold,
      color: colors.danger,
      fontSize: 13,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    chip: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingVertical: spacing.sm,
      alignItems: 'center',
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
    workspaceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    workspaceRowActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    rowMain: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    rowMeta: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    currentBadge: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.accentDark,
    },
    infoRow: {
      gap: 2,
    },
    infoLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
    },
    infoValue: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textPrimary,
    },
    field: {
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontFamily: fonts.body,
      fontSize: 15,
      color: colors.textPrimary,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      flex: 1,
      overflow: 'hidden',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
      fontSize: 14,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      flex: 1,
    },
    secondaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
      fontSize: 14,
    },
    signOutButton: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
    },
    signOutButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.danger,
      fontSize: 14,
    },
  });
