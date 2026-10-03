import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { fonts, type ThemeColors } from '../../theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Filled icon when the tab is active, outline otherwise — standard iOS/Android tab bar convention. */
function tabIcon(filled: IoniconName, outline: IoniconName) {
  return ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} color={color as string} size={size} />
  );
}

/**
 * Route group for the authenticated app shell (bottom tab navigator).
 * Centralizes the auth/business guard so individual tab screens don't
 * have to repeat it.
 */
export default function AppLayout() {
  const { isAuthenticated, isHydrating, user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (isHydrating) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (user?.system_role === 'SYSTEM_ADMIN') {
    return <Redirect href="/vendors" />;
  }

  if (!user?.businessId) {
    return <Redirect href="/create-business" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        sceneStyle: { paddingTop: insets.top, backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="shelves"
        options={{ title: 'Shelves', tabBarIcon: tabIcon('layers', 'layers-outline') }}
      />
      <Tabs.Screen
        name="scan"
        options={{ title: 'Scan', tabBarIcon: tabIcon('camera', 'camera-outline') }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: 'Inventory', tabBarIcon: tabIcon('cube', 'cube-outline') }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: tabIcon('notifications', 'notifications-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: tabIcon('settings', 'settings-outline') }}
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    tabBar: {
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      elevation: 0,
    },
    tabLabel: {
      fontSize: 11,
      fontFamily: fonts.bodySemiBold,
    },
  });
