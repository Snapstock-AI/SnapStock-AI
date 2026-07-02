import { BrowserRouter, Routes, Route, useLocation } from 'react-router'
import { ThemeProvider } from '@/context/ThemeContext'
import Navigation from '@/components/Navigation'
import DashboardLayout from '@/components/dashboard/DashboardLayout'
import LandingPage from '@/pages/LandingPage'
import Login from '@/pages/Login'
import Signup from '@/pages/Signup'
import DashboardHome from '@/pages/dashboard/DashboardHome'
import InventoryPage from '@/pages/dashboard/InventoryPage'
import ScansPage from '@/pages/dashboard/ScansPage'
import AlertsPage from '@/pages/dashboard/AlertsPage'
import AnalyticsPage from '@/pages/dashboard/AnalyticsPage'
import SettingsPage from '@/pages/dashboard/SettingsPage'

function AppRoutes() {
  const location = useLocation()
  const isMarketing = ['/', '/login', '/signup'].includes(location.pathname)
  const isDashboard = location.pathname.startsWith('/dashboard')

  return (
    <>
      {isMarketing && !['/login', '/signup'].includes(location.pathname) && <Navigation />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="scans" element={<ScansPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      {!isDashboard && location.pathname === '/' && null}
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ThemeProvider>
  )
}
