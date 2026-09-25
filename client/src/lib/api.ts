import { clearAuth, getRefreshToken, getStoredUser, getToken, setAuth, type AuthUser } from './auth'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const AUTH_SESSION_EVENT = 'snapstock:auth-session'

export type AuthSessionDetail =
  | { type: 'refreshed'; token: string; user: AuthUser }
  | { type: 'expired' }

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

function emitAuthSession(detail: AuthSessionDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail }))
}

function mergeAuthUser(next: AuthUser, previous: AuthUser | null): AuthUser {
  return {
    ...previous,
    ...next,
    businessId:
      next.businessId !== undefined && next.businessId !== null
        ? next.businessId
        : (previous?.businessId ?? null),
    businessRole:
      next.businessRole !== undefined && next.businessRole !== null
        ? next.businessRole
        : (previous?.businessRole ?? null),
  }
}

/** Single-flight refresh so parallel 401s don't revoke each other's tokens. */
let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      clearAuth()
      emitAuthSession({ type: 'expired' })
      return null
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      const body = (await response.json().catch(() => ({}))) as ApiResponse<{
        token: string
        refreshToken: string
        user: AuthUser
      }>

      if (!response.ok || !body.data?.token || !body.data.user) {
        clearAuth()
        emitAuthSession({ type: 'expired' })
        return null
      }

      const user = mergeAuthUser(body.data.user, getStoredUser())
      setAuth(body.data.token, user, body.data.refreshToken)
      emitAuthSession({ type: 'refreshed', token: body.data.token, user })
      return body.data.token
    } catch {
      // Network blip — keep existing session; caller can retry later.
      return null
    }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
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
  }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.')
  }

  if (response.status === 401 && auth && !didRefresh) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      return apiRequest(path, options, auth, true)
    }
    throw new Error('Session expired. Please sign in again.')
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>

  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed')
  }

  return body
}
