import { BrowserRouter, Routes, Route, useLocation } from 'react-router'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import Navigation from '@/components/Navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import VerifyEmail from '@/pages/VerifyEmail'
import ResendVerification from '@/pages/ResendVerification'
import DashboardHome from '@/pages/dashboard/DashboardHome'
import InventoryPage from '@/pages/dashboard/InventoryPage'
import ScansPage from '@/pages/dashboard/ScansPage'
import AlertsPage from '@/pages/dashboard/AlertsPage'
import AnalyticsPage from '@/pages/dashboard/AnalyticsPage'
import SettingsPage from '@/pages/dashboard/SettingsPage'
import ShelvesPage from '@/pages/dashboard/ShelvesPage'

const authPaths = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/resend-verification',
]
// CI/CD frontend deployment test
function AppRoutes() {
  const location = useLocation()
  const isAuthPage = authPaths.includes(location.pathname)
  const isMarketing = location.pathname === '/' || isAuthPage
  const isDashboard = location.pathname.startsWith('/dashboard')

  return (
    <>
      {isMarketing && !isAuthPage && <Navigation />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/resend-verification" element={<ResendVerification />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="scans" element={<ScansPage />} />
            <Route path="shelves" element={<ShelvesPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
      {!isDashboard && location.pathname === '/' && null}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
