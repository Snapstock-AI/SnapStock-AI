import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest } from '../lib/api';
import { clearAuth, getStoredUser, getToken, setAuth, type AuthUser } from '../lib/auth';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  /** True while the stored session is being read from SecureStore on app start. */
  isHydrating: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // SecureStore is async (unlike localStorage), so the initial session has to be
  // loaded after mount rather than in useState's initializer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedToken, storedUser] = await Promise.all([getToken(), getStoredUser()]);
      if (cancelled) return;
      setToken(storedToken);
      setUser(storedUser);
      setIsHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{
      message: string;
      token: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!result.data?.token || !result.data.user) {
      throw new Error('Login failed');
    }

    await setAuth(result.data.token, result.data.user, result.data.refreshToken);
    setToken(result.data.token);
    setUser(result.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, true);
    } catch {
      // Client logout still proceeds if the API is unreachable.
    }
    await clearAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isHydrating,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, isHydrating, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
