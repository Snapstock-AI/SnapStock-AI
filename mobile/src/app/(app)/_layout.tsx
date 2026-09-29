import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

/**
 * Route group for the authenticated app shell (bottom tab navigator).
 * Centralizes the auth/business guard so individual tab screens don't
 * have to repeat it.
 */
export default function AppLayout() {
  const { isAuthenticated, isHydrating, user } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (user?.system_role === 'SYSTEM_ADMIN') {
    return <Redirect href="/vendors" />;
  }

  if (!user?.businessId) {
    return <Redirect href="/create-business" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#16a34a' }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="shelves"
        options={{
          title: 'Shelves',
          tabBarIcon: ({ color, size }) => <Ionicons name="layers" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <Ionicons name="camera" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="employees"
        // Reachable from Settings (owners only) rather than the tab bar itself.
        options={{ href: null }}
      />
      <Tabs.Screen
        name="scan-history"
        // Reachable from the Scan tab's "History" link rather than the tab bar itself.
        options={{ href: null }}
      />
      <Tabs.Screen
        name="analytics"
        // Reachable from Home (owners only) rather than the tab bar itself.
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
