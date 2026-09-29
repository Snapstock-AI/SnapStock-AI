import { OpenSans_400Regular, OpenSans_500Medium, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    OpenSans_400Regular,
    OpenSans_500Medium,
    OpenSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          // Screens here have no header, so without this their content
          // renders flush under the status bar. (app) and (admin) are each
          // their own tab navigator and handle this themselves below.
          contentStyle: { flex: 1, paddingTop: insets.top, backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(app)" options={{ contentStyle: { flex: 1 } }} />
        <Stack.Screen name="(admin)" options={{ contentStyle: { flex: 1 } }} />
      </Stack>
    </AuthProvider>
  );
}
