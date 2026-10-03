import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getPostAuthRoute } from '../lib/routing';

export default function Index() {
  const { user, isAuthenticated, isHydrating } = useAuth();
  const { colors } = useTheme();

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Signed-out users land on the marketing/landing page (see app/welcome.tsx)
  // — both a cold start and an explicit sign-out end up here, since the
  // (app)/(admin) layout guards also redirect to /welcome now.
  if (!isAuthenticated) return <Redirect href="/welcome" />;
  return <Redirect href={getPostAuthRoute(user)} />;
}
