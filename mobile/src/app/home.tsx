import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, isAuthenticated, isHydrating, logout } = useAuth();

  if (!isHydrating && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {user?.full_name ?? 'vendor'}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <Pressable style={styles.button} onPress={() => logout()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    gap: 8,
    paddingHorizontal: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  button: {
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#dc2626',
    fontWeight: '600',
  },
});
