import { API_URL } from '../config';
import { clearAuth, getRefreshToken, getStoredUser, getToken, setAuth, type AuthUser } from './auth';

// Mirrors client/src/lib/api.ts's request/refresh contract against the same Express backend.
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

/** Single-flight refresh so parallel 401s don't revoke each other's tokens. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearAuth();
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const body = (await response.json().catch(() => ({}))) as ApiResponse<{
        token: string;
        refreshToken: string;
        user: AuthUser;
      }>;

      if (!response.ok || !body.data?.token || !body.data.user) {
        await clearAuth();
        return null;
      }

      const previous = await getStoredUser();
      const user: AuthUser = { ...previous, ...body.data.user };
      await setAuth(body.data.token, user, body.data.refreshToken);
      return body.data.token;
    } catch {
      // Network blip — keep existing session; caller can retry later.
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
  didRefresh = false,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.');
  }

  if (response.status === 401 && auth && !didRefresh) {
    const nextToken = await refreshAccessToken();
    if (nextToken) {
      return apiRequest(path, options, auth, true);
    }
    throw new Error('Session expired. Please sign in again.');
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed');
  }

  return body;
}
