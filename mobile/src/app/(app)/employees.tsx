import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getMyBusinesses } from '../../lib/business';
import {
  cancelInvitation,
  listEmployeeInvitations,
  listEmployees,
  removeEmployee,
  sendEmployeeInvitation,
  type Employee,
  type Invitation,
} from '../../lib/invitation';
import { card, fonts, radius, spacing, typography, type ThemeColors } from '../../theme';

function statusColors(colors: ThemeColors): Record<Invitation['status'], { bg: string; text: string }> {
  return {
    PENDING: { bg: colors.warningSoft, text: colors.warning },
    ACCEPTED: { bg: colors.accentSoft, text: colors.accentDark },
    EXPIRED: { bg: colors.muted, text: colors.textSecondary },
    CANCELLED: { bg: colors.dangerSoft, text: colors.danger },
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' } as Intl.DateTimeFormatOptions);
}

export default function EmployeesScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const statuses = useMemo(() => statusColors(colors), [colors]);
  const businessId = user?.businessId ?? null;

  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }
    setError(null);
    try {
      const businesses = await getMyBusinesses();
      const business = businesses.find((item) => item.id === businessId);
      const owner = business?.role === 'OWNER';
      setIsOwner(owner);
      if (!owner) return;

      const [loadedInvitations, loadedEmployees] = await Promise.all([
        listEmployeeInvitations(businessId),
        listEmployees(businessId),
      ]);
      setInvitations(loadedInvitations);
      setEmployees(loadedEmployees);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load team.');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  async function handleSendInvitation() {
    if (!businessId || isSending || !email.trim()) return;
    setIsSending(true);
    setError(null);
    setMessage(null);
    try {
      await sendEmployeeInvitation(businessId, {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
      });
      setFullName('');
      setEmail('');
      setMessage('Invitation email sent. They can sign up or sign in, then open the link to join.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send invitation.');
    } finally {
      setIsSending(false);
    }
  }

  function confirmRemove(employee: Employee) {
    Alert.alert(
      'Remove employee',
      `Remove ${employee.full_name} from this workspace? Their account stays active for other businesses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!businessId) return;
            setRemovingId(employee.user_id);
            setError(null);
            try {
              await removeEmployee(businessId, employee.user_id);
              setEmployees((current) => current.filter((item) => item.user_id !== employee.user_id));
              setMessage(`${employee.full_name} was removed from this workspace.`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to remove employee.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  }

  function confirmCancelInvitation(invitation: Invitation) {
    Alert.alert(
      'Cancel invitation',
      `Cancel the invitation sent to ${invitation.email}?`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel invitation',
          style: 'destructive',
          onPress: async () => {
            if (!businessId) return;
            setCancelingId(invitation.id);
            setError(null);
            try {
              await cancelInvitation(businessId, invitation.id);
              setInvitations((current) =>
                current.map((item) =>
                  item.id === invitation.id ? { ...item, status: 'CANCELLED' } : item,
                ),
              );
              setMessage(`Invitation to ${invitation.email} was canceled.`);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Unable to cancel invitation.');
            } finally {
              setCancelingId(null);
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

  if (!businessId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Connect this account to a business to manage employees.</Text>
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Only the business owner can manage employees and invitations.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Team</Text>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Send an invitation</Text>
        <Text style={styles.cardSubtitle}>They join this workspace as an employee after signing in.</Text>

        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Display name (optional)"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="employee@example.com"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.primaryButton, (isSending || !email.trim()) && styles.buttonDisabled]}
          onPress={handleSendInvitation}
          disabled={isSending || !email.trim()}
          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
        >
          {isSending ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>Send invitation</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sent invitations</Text>
        {invitations.length === 0 ? (
          <Text style={styles.muted}>No invitations have been sent yet.</Text>
        ) : (
          invitations.map((invitation) => (
            <View key={invitation.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{invitation.email}</Text>
                <Text style={styles.rowMeta}>Sent {formatDate(invitation.created_at)}</Text>
              </View>
              <View style={styles.rowEnd}>
                <View style={[styles.badge, { backgroundColor: statuses[invitation.status].bg }]}>
                  <Text style={[styles.badgeText, { color: statuses[invitation.status].text }]}>
                    {invitation.status}
                  </Text>
                </View>
                {invitation.status === 'PENDING' ? (
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => confirmCancelInvitation(invitation)}
                    disabled={cancelingId === invitation.id}
                    android_ripple={{ color: 'rgba(220,38,38,0.12)' }}
                  >
                    {cancelingId === invitation.id ? (
                      <ActivityIndicator color={colors.danger} size="small" />
                    ) : (
                      <Text style={styles.removeButtonText}>Cancel</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Team members ({employees.length})</Text>
        {employees.length === 0 ? (
          <Text style={styles.muted}>No employees have joined this business yet.</Text>
        ) : (
          employees.map((employee) => (
            <View key={employee.user_id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{employee.full_name}</Text>
                <Text style={styles.rowMeta}>{employee.email}</Text>
              </View>
              <Pressable
                style={styles.removeButton}
                onPress={() => confirmRemove(employee)}
                disabled={removingId === employee.user_id}
                android_ripple={{ color: 'rgba(220,38,38,0.12)' }}
              >
                {removingId === employee.user_id ? (
                  <ActivityIndicator color={colors.danger} size="small" />
                ) : (
                  <Text style={styles.removeButtonText}>Remove</Text>
                )}
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
      padding: spacing.xl,
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
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
      ...card(colors),
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
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingVertical: spacing.md,
      alignItems: 'center',
      overflow: 'hidden',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.onAccent,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.background,
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
    rowEnd: {
      alignItems: 'flex-end',
      gap: spacing.xs,
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
    removeButton: {
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    removeButtonText: {
      fontFamily: fonts.bodySemiBold,
      color: colors.danger,
      fontSize: 12,
    },
  });
