import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest, AUTH_SESSION_EVENT, type AuthSessionDetail } from '@/lib/api'
import {
  clearAuth,
  getStoredUser,
  getToken,
  setAuth,
  type AuthUser,
} from '@/lib/auth'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  register: (full_name: string, email: string, password: string) => Promise<string>
  createBusiness: (data: CreateBusinessInput) => Promise<Business>
  acceptInvitation: (token: string) => Promise<void>
  changePassword: (password: string) => Promise<void>
  updateProfile: (full_name: string) => Promise<void>
  syncBusinessMembership: () => Promise<boolean>
  logout: () => Promise<void>
}

export type CreateBusinessInput = {
  business_name: string
  business_email: string
  address: string
  contact_number: string
}

export type Business = CreateBusinessInput & {
  id: string
  role: 'OWNER' | 'EMPLOYEE'
  freshness_alert_threshold?: number
  low_stock_threshold?: number
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [token, setToken] = useState<string | null>(() => getToken())

  // Keep React state in sync when api layer refreshes or expires the session.
  useEffect(() => {
    function onSession(event: Event) {
      const detail = (event as CustomEvent<AuthSessionDetail>).detail
      if (!detail) return
      if (detail.type === 'refreshed') {
        setToken(detail.token)
        setUser(detail.user)
        return
      }
      setToken(null)
      setUser(null)
    }

    window.addEventListener(AUTH_SESSION_EVENT, onSession)
    return () => window.removeEventListener(AUTH_SESSION_EVENT, onSession)
  }, [])

  // Re-hydrate if another tab updates storage.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (
        event.key !== 'snapstock_token' &&
        event.key !== 'snapstock_user' &&
        event.key !== 'snapstock_refresh'
      ) {
        return
      }
      setToken(getToken())
      setUser(getStoredUser())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<{
      message: string
      token: string
      refreshToken: string
      user: AuthUser
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (!result.data?.token || !result.data.user) {
      throw new Error('Login failed')
    }

    setAuth(result.data.token, result.data.user, result.data.refreshToken)
    setToken(result.data.token)
    setUser(result.data.user)
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    const result = await apiRequest<{
      message: string
      token: string
      refreshToken: string
      user: AuthUser
    }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })

    if (!result.data?.token || !result.data.user) {
      throw new Error('Google sign-in failed')
    }

    setAuth(result.data.token, result.data.user, result.data.refreshToken)
    setToken(result.data.token)
    setUser(result.data.user)
  }, [])

  const register = useCallback(
    async (full_name: string, email: string, password: string) => {
      const result = await apiRequest<{ message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, password }),
      })

      return result.data?.message || 'Registered successfully. Please verify your email.'
    },
    [],
  )

  const createBusiness = useCallback(async (data: CreateBusinessInput) => {
    const result = await apiRequest<{
      business: Business
      token: string
      refreshToken: string
      user: AuthUser
    }>(
      '/businesses',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
    )

    if (!result.data?.business || !result.data.token || !result.data.user) {
      throw new Error('Business creation failed')
    }

    setAuth(result.data.token, result.data.user, result.data.refreshToken)
    setToken(result.data.token)
    setUser(result.data.user)

    return result.data.business
  }, [])

  const acceptInvitation = useCallback(async (invitationToken: string) => {
    const result = await apiRequest<{
      token: string
      refreshToken: string
      user: AuthUser
    }>(
      '/businesses/invitations/accept',
      {
        method: 'POST',
        body: JSON.stringify({ token: invitationToken }),
      },
      true,
    )

    if (!result.data?.token || !result.data.user) {
      throw new Error('Invitation acceptance failed')
    }

    setAuth(result.data.token, result.data.user, result.data.refreshToken)
    setToken(result.data.token)
    setUser(result.data.user)
  }, [])

  const changePassword = useCallback(
    async (password: string) => {
      const result = await apiRequest<{ message: string }>(
        '/auth/password',
        {
          method: 'PATCH',
          body: JSON.stringify({ password }),
        },
        true,
      )

      if (!result.data) throw new Error('Password update failed')

      setUser((currentUser) => {
        if (!currentUser) return currentUser
        const nextUser = { ...currentUser, must_change_password: false }
        const currentToken = getToken()
        if (currentToken) setAuth(currentToken, nextUser)
        return nextUser
      })
    },
    [],
  )

  const updateProfile = useCallback(
    async (full_name: string) => {
      const result = await apiRequest<AuthUser>(
        '/auth/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({ full_name }),
        },
        true,
      )

      if (!result.data) throw new Error('Profile update failed')

      const currentToken = getToken()
      const previous = getStoredUser()
      const nextUser: AuthUser = {
        ...result.data,
        businessId: previous?.businessId ?? user?.businessId ?? null,
        businessRole: previous?.businessRole ?? user?.businessRole ?? null,
      }
      if (currentToken) setAuth(currentToken, nextUser)
      setUser(nextUser)
    },
    [user?.businessId, user?.businessRole],
  )

  const syncBusinessMembership = useCallback(async () => {
    const currentToken = getToken()
    const currentUser = getStoredUser()
    if (!currentUser || !currentToken) return false

    try {
      const result = await apiRequest<{ id: string; role: 'OWNER' | 'EMPLOYEE' }[]>(
        '/businesses/mine',
        {},
        true,
      )
      const membership = result.data?.[0] ?? null
      const businessId = membership?.id || null
      const businessRole = membership?.role || null

      if (
        businessId === currentUser.businessId &&
        businessRole === currentUser.businessRole
      ) {
        return Boolean(businessId)
      }

      const nextUser = { ...currentUser, businessId, businessRole }
      setAuth(currentToken, nextUser)
      setUser(nextUser)
      return Boolean(businessId)
    } catch {
      // Keep the existing session; membership can sync on the next successful request.
      return Boolean(currentUser.businessId)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' }, true)
    } catch {
      // Client logout still proceeds if API is unreachable
    }
    clearAuth()
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      loginWithGoogle,
      register,
      createBusiness,
      acceptInvitation,
      changePassword,
      updateProfile,
      syncBusinessMembership,
      logout,
    }),
    [
      user,
      token,
      login,
      loginWithGoogle,
      register,
      createBusiness,
      acceptInvitation,
      changePassword,
      updateProfile,
      syncBusinessMembership,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
