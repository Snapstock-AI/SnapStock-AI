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
  switchBusiness: (businessId: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
  /** Re-syncs businessId/businessRole from the backend after e.g. deleting the active business. */
  refreshBusinessMembership: () => Promise<boolean>;
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

  const switchBusiness = useCallback(async (businessId: string) => {
    const result = await apiRequest<{
      token: string;
      refreshToken: string;
      user: AuthUser;
    }>(
      '/businesses/switch',
      {
        method: 'POST',
        body: JSON.stringify({ businessId }),
      },
      true,
    );

    if (!result.data?.token || !result.data.user) {
      throw new Error('Unable to switch workspace');
    }

    await setAuth(result.data.token, result.data.user, result.data.refreshToken);
    setToken(result.data.token);
    setUser(result.data.user);
  }, []);

  const changePassword = useCallback(
    async (password: string) => {
      const result = await apiRequest<{ message: string }>(
        '/auth/password',
        {
          method: 'PATCH',
          body: JSON.stringify({ password }),
        },
        true,
      );

      if (!result.data) throw new Error('Password update failed');
      if (!user) return;

      const nextUser: AuthUser = { ...user, must_change_password: false };
      const currentToken = await getToken();
      if (currentToken) await setAuth(currentToken, nextUser);
      setUser(nextUser);
    },
    [user],
  );

  const updateProfile = useCallback(
    async (fullName: string) => {
      const result = await apiRequest<AuthUser>(
        '/auth/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({ full_name: fullName }),
        },
        true,
      );

      if (!result.data) throw new Error('Profile update failed');

      const currentToken = await getToken();
      const previous = await getStoredUser();
      const nextUser: AuthUser = {
        ...result.data,
        businessId: previous?.businessId ?? user?.businessId ?? null,
        businessRole: previous?.businessRole ?? user?.businessRole ?? null,
      };
      if (currentToken) await setAuth(currentToken, nextUser);
      setUser(nextUser);
    },
    [user?.businessId, user?.businessRole],
  );

  const refreshBusinessMembership = useCallback(async () => {
    const currentToken = await getToken();
    const currentUser = await getStoredUser();
    if (!currentUser || !currentToken) return false;

    try {
      const result = await apiRequest<Business[]>('/businesses/mine', {}, true);
      const memberships = result.data ?? [];
      const preferred =
        memberships.find((item) => item.id === currentUser.businessId) ?? memberships[0] ?? null;
      const businessId = preferred?.id || null;
      const businessRole = preferred?.role || null;

      if (businessId === currentUser.businessId && businessRole === currentUser.businessRole) {
        return Boolean(businessId);
      }

      // Prefer rotating the JWT so API calls use the active workspace claim.
      if (businessId) {
        const switched = await apiRequest<{
          token: string;
          refreshToken: string;
          user: AuthUser;
        }>(
          '/businesses/switch',
          {
            method: 'POST',
            body: JSON.stringify({ businessId }),
          },
          true,
        );
        if (switched.data?.token && switched.data.user) {
          await setAuth(switched.data.token, switched.data.user, switched.data.refreshToken);
          setToken(switched.data.token);
          setUser(switched.data.user);
          return true;
        }
      }

      const nextUser = { ...currentUser, businessId, businessRole };
      await setAuth(currentToken, nextUser);
      setUser(nextUser);
      return Boolean(businessId);
    } catch {
      // Keep the existing session; membership can sync on the next successful request.
      return Boolean(currentUser.businessId);
    }
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
      switchBusiness,
      changePassword,
      updateProfile,
      refreshBusinessMembership,
      logout,
    }),
    [
      user,
      token,
      isHydrating,
      login,
      register,
      createBusiness,
      acceptInvitation,
      switchBusiness,
      changePassword,
      updateProfile,
      refreshBusinessMembership,
      logout,
    ],
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
