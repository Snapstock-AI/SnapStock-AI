import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, user, syncBusinessMembership } = useAuth()
  const location = useLocation()
  const [membershipChecked, setMembershipChecked] = useState(false)

  useEffect(() => {
    let active = true

    if (!isAuthenticated || location.pathname === '/onboarding/business') {
      setMembershipChecked(true)
      return () => {
        active = false
      }
    }

    setMembershipChecked(false)
    syncBusinessMembership()
      .catch(() => undefined)
      .finally(() => {
        if (active) setMembershipChecked(true)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, location.pathname, syncBusinessMembership])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!membershipChecked) {
    return <div className="min-h-dvh bg-background" />
  }

  const isBusinessOnboarding = location.pathname === '/onboarding/business'
  const isSettings = location.pathname === '/dashboard/settings'
  const isEmployee = user?.businessRole === 'EMPLOYEE'
  const hasBusiness = Boolean(user?.businessId)

  // Employees are always associated with the owner's business — never redirect them to create one
  if (!hasBusiness && !isEmployee && !isBusinessOnboarding && !isSettings) {
    return <Navigate to="/onboarding/business" replace />
  }

  // Employees trying to access business onboarding should go to dashboard
  if (isEmployee && isBusinessOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  if (hasBusiness && isBusinessOnboarding) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
