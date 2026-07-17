import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  AlertTriangle,
  BarChart3,
  Camera,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
} from 'lucide-react'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

const sidebarLinks = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard/scans', label: 'Scans', icon: Camera },
  { to: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface-elevated md:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {sidebarLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface-elevated/95 px-4 backdrop-blur-md safe-top md:hidden">
        <Logo showText={false} />
        <span className="font-serif text-lg font-semibold">FreshTrack</span>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <div className="md:pl-64">
        <header className="hidden h-16 items-center justify-between border-b border-border bg-surface-elevated px-6 md:flex">
          <p className="text-sm text-muted">SnapStock-AI · PID 5</p>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {(user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — app-like */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface-elevated/95 backdrop-blur-md safe-bottom md:hidden">
        {sidebarLinks.slice(0, 5).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition',
                isActive ? 'text-brand-500' : 'text-muted'
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
