import { useCallback, useEffect, useState } from 'react';
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
import { getMyBusinesses } from '../../lib/business';
import {
  listEmployeeInvitations,
  listEmployees,
  removeEmployee,
  sendEmployeeInvitation,
  type Employee,
  type Invitation,
} from '../../lib/invitation';

const statusColors: Record<Invitation['status'], { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  ACCEPTED: { bg: '#dcfce7', text: '#15803d' },
  EXPIRED: { bg: '#f3f4f6', text: '#4b5563' },
  CANCELLED: { bg: '#fee2e2', text: '#b91c1c' },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' } as Intl.DateTimeFormatOptions);
}

export default function EmployeesScreen() {
  const { user } = useAuth();
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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
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
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="employee@example.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.primaryButton, (isSending || !email.trim()) && styles.buttonDisabled]}
          onPress={handleSendInvitation}
          disabled={isSending || !email.trim()}
        >
          {isSending ? (
            <ActivityIndicator color="#fff" />
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
              <View style={[styles.badge, { backgroundColor: statusColors[invitation.status].bg }]}>
                <Text style={[styles.badgeText, { color: statusColors[invitation.status].text }]}>
                  {invitation.status}
                </Text>
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
              >
                {removingId === employee.user_id ? (
                  <ActivityIndicator color="#dc2626" size="small" />
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
    padding: 20,
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
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
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
  removeButton: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 12,
  },
});
