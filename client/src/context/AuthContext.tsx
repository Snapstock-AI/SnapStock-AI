import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from '@/lib/api'
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
    []
  )

  const createBusiness = useCallback(async (data: CreateBusinessInput) => {
    const result = await apiRequest<{
      business: Business
      token: string
      refreshToken: string
      user: AuthUser
    }>('/businesses', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true)

    if (!result.data?.business || !result.data.token || !result.data.user) {
      throw new Error('Business creation failed')
    }

    setAuth(result.data.token, result.data.user, result.data.refreshToken)
    setToken(result.data.token)
    setUser(result.data.user)

    return result.data.business
  }, [])

  const changePassword = useCallback(async (password: string) => {
    const result = await apiRequest<{ message: string }>('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }, true)

    if (!result.data) throw new Error('Password update failed')

    setUser((currentUser) => {
      if (!currentUser) return currentUser
      const nextUser = { ...currentUser, must_change_password: false }
      setAuth(token || '', nextUser)
      return nextUser
    })
  }, [token])

  const updateProfile = useCallback(async (full_name: string) => {
    const result = await apiRequest<AuthUser>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ full_name }),
    }, true)

    if (!result.data) throw new Error('Profile update failed')

    const nextUser = { ...result.data, businessId: user?.businessId || null, businessRole: user?.businessRole || null }
    setAuth(token || '', nextUser)
    setUser(nextUser)
  }, [token, user?.businessId, user?.businessRole])

  const syncBusinessMembership = useCallback(async () => {
    if (!user || !token) return false

    const result = await apiRequest<{ id: string; role: 'OWNER' | 'EMPLOYEE' }[]>('/businesses/mine', {}, true)
    const membership = result.data?.[0] ?? null
    const businessId = membership?.id || null
    const businessRole = membership?.role || null

    if (businessId === user.businessId && businessRole === user.businessRole) {
      return Boolean(businessId)
    }

    const nextUser = { ...user, businessId, businessRole }
    setAuth(token, nextUser)
    setUser(nextUser)
    return Boolean(businessId)
  }, [token, user])

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
      isAuthenticated: Boolean(token),
      login,
      loginWithGoogle,
      register,
      createBusiness,
      changePassword,
      updateProfile,
      syncBusinessMembership,
      logout,
    }),
    [user, token, login, loginWithGoogle, register, createBusiness, changePassword, updateProfile, syncBusinessMembership, logout]
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
