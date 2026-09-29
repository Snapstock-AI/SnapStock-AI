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
  register: (fullName: string, email: string, password: string) => Promise<string>;
  createBusiness: (data: CreateBusinessInput) => Promise<Business>;
  acceptInvitation: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type CreateBusinessInput = {
  business_name: string;
  business_email: string;
  address: string;
  contact_number: string;
};

export type Business = CreateBusinessInput & {
  id: string;
  role: 'OWNER' | 'EMPLOYEE';
  freshness_alert_threshold?: number;
  low_stock_threshold?: number;
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

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const result = await apiRequest<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    });

    // Registration does not issue a session. Clear any prior account so Login
    // does not auto-redirect into the previous user's dashboard.
    await clearAuth();
    setToken(null);
    setUser(null);

    return result.data?.message || 'Registered successfully. Please verify your email.';
  }, []);

  const createBusiness = useCallback(async (data: CreateBusinessInput) => {
    const result = await apiRequest<{
      business: Business;
      token: string;
      refreshToken: string;
      user: AuthUser;
    }>(
      '/businesses',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
    );

    if (!result.data?.business || !result.data.token || !result.data.user) {
      throw new Error('Business creation failed');
    }

    await setAuth(result.data.token, result.data.user, result.data.refreshToken);
    setToken(result.data.token);
    setUser(result.data.user);

    return result.data.business;
  }, []);

  const acceptInvitation = useCallback(async (invitationToken: string) => {
    const result = await apiRequest<{
      token: string;
      refreshToken: string;
      user: AuthUser;
    }>(
      '/businesses/invitations/accept',
      {
        method: 'POST',
        body: JSON.stringify({ token: invitationToken }),
      },
      true,
    );

    if (!result.data?.token || !result.data.user) {
      throw new Error('Invitation acceptance failed');
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
      register,
      createBusiness,
      acceptInvitation,
      logout,
    }),
    [user, token, isHydrating, login, register, createBusiness, acceptInvitation, logout],
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
