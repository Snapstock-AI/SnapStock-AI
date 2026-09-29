import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { user, isAuthenticated, isHydrating } = useAuth();

  if (isHydrating) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/login" />;
  return <Redirect href={user?.businessId ? '/home' : '/create-business'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
