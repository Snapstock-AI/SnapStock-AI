import { clearAuth, getRefreshToken, getToken, setAuth, type AuthUser } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

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
    return null
  }

  setAuth(body.data.token, body.data.user, body.data.refreshToken)
  return body.data.token
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
  didRefresh = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && auth && !didRefresh) {
    const nextToken = await refreshAccessToken()
    if (nextToken) {
      return apiRequest(path, options, auth, true)
    }
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>

  if (!response.ok || body.success === false) {
    throw new Error(body.message || 'Request failed')
  }

  return body
}
