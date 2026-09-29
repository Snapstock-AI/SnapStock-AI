import * as SecureStore from 'expo-secure-store';

// Mirrors client/src/lib/auth.ts's AuthUser shape so both apps agree with the backend contract.
export type AuthUser = {
  id: string;
  full_name: string;
  email: string;
  system_role: string;
  businessId: string | null;
  businessRole: 'OWNER' | 'EMPLOYEE' | null;
  must_change_password?: boolean;
};

const TOKEN_KEY = 'snapstock_token';
const REFRESH_KEY = 'snapstock_refresh';
const USER_KEY = 'snapstock_user';

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function setAuth(token: string, user: AuthUser, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  }
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
