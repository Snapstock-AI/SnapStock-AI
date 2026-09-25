import { useEffect, useRef, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, user, syncBusinessMembership } = useAuth()
  const location = useLocation()
  const [membershipChecked, setMembershipChecked] = useState(false)
  const syncedForUser = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    if (!isAuthenticated) {
      setMembershipChecked(false)
      syncedForUser.current = null
      return () => {
        active = false
      }
    }

    if (location.pathname === '/onboarding/business') {
      setMembershipChecked(true)
      return () => {
        active = false
      }
    }

    const userKey = user?.id ?? 'anon'
    // Only sync once per signed-in user — not on every tab click.
    if (syncedForUser.current === userKey) {
      setMembershipChecked(true)
      return () => {
        active = false
      }
    }

    setMembershipChecked(false)
    syncBusinessMembership()
      .catch(() => undefined)
      .finally(() => {
        if (!active) return
        syncedForUser.current = userKey
        setMembershipChecked(true)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, location.pathname, syncBusinessMembership, user?.id])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!membershipChecked) {
    return <div className="min-h-dvh bg-background" />
  }

  const isBusinessOnboarding = location.pathname === '/onboarding/business'
  const isSettings = location.pathname === '/dashboard/settings'
  const isEmployee = user?.businessRole === 'EMPLOYEE'
  const hasBusiness = Boolean(user?.businessId)

  if (!hasBusiness && !isEmployee && !isBusinessOnboarding && !isSettings) {
    return <Navigate to="/onboarding/business" replace />
  }

  if (isEmployee && isBusinessOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  if (hasBusiness && isBusinessOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
