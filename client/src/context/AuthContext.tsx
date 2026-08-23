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
  register: (full_name: string, email: string, password: string) => Promise<string>
  logout: () => Promise<void>
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
      register,
      logout,
    }),
    [user, token, login, register, logout]
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
