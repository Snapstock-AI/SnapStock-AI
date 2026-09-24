import { NavLink, useLocation, useNavigate } from 'react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import NoBusinessWorkspace from '@/components/dashboard/NoBusinessWorkspace'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { getAlertsCount } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import PageTransition from '@/components/dashboard/PageTransition'
import { cn } from '@/lib/utils'

type BusinessMembership = {
  id: string
  role: 'OWNER' | 'EMPLOYEE'
}

const applications = [
  { to: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard/scans', label: 'Scans', icon: Camera },
  { to: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle },
]

const components = [
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/shelves', label: 'Shelves', icon: Package },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const workspacePromptPaths = [
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/scans',
  '/dashboard/scans/history',
  '/dashboard/alerts',
  '/dashboard/analytics',
]

function SidebarLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={end}
        viewTransition
        className={({ isActive }) =>
          cn(
            'mr-[17px] flex items-center gap-2 py-3 pl-[30px] pr-[30px] text-base leading-[27px] text-sidebar-foreground transition-all duration-200',
            isActive && 'fd-nav-active rounded-r-[60px] !text-white',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-sidebar-foreground')} />
            <span className="truncate">{label}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [query, setQuery] = useState('')
  const businessId = user?.businessId

  const loadAlertCount = useCallback(async () => {
    if (!businessId) return 0
    const res = await getAlertsCount(businessId)
    return res.data?.count ?? 0
  }, [businessId])

  const { data: alertCount } = usePollingData<number>(
    loadAlertCount,
    Boolean(businessId),
    businessId ? `alerts-count:${businessId}` : undefined,
  )

  useEffect(() => {
    if (!user?.businessId) {
      setIsOwner(false)
      return
    }

    let active = true
    apiRequest<BusinessMembership[]>('/businesses/mine', {}, true)
      .then((response) => {
        if (active) {
          setIsOwner(
            response.data?.some(
              (business) => business.id === user.businessId && business.role === 'OWNER',
            ) || false,
          )
        }
      })
      .catch(() => {
        if (active) setIsOwner(false)
      })

    return () => {
      active = false
    }
  }, [user?.businessId])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const pageTitle = useMemo(() => {
    const all = [
      { to: '/dashboard', label: 'Dashboard', end: true },
      ...applications,
      ...components,
      { to: '/dashboard/invitations', label: 'Team' },
    ]
    return (
      all.find((link) =>
        'end' in link && link.end
          ? location.pathname === link.to
          : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`),
      )?.label ?? 'Dashboard'
    )
  }, [location.pathname])

  const badge = alertCount ?? 0

  return (
    <div className="min-h-dvh bg-background">
      <header className="fixed inset-x-0 top-0 z-40 hidden h-20 bg-background md:block">
        <div className="flex h-full items-stretch border-b border-border">
          <div className="flex w-[260px] shrink-0 items-center bg-white px-[30px] dark:bg-sidebar">
            <Logo />
          </div>

          <div className="flex flex-1 items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="relative h-10 w-10 text-[#b8c3d5]" asChild>
                <NavLink to="/dashboard/alerts" viewTransition aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {badge > 0 ? (
                    <span className="absolute right-1 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </NavLink>
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-[#b8c3d5]" asChild>
                <NavLink to="/dashboard/settings" viewTransition aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </NavLink>
              </Button>
              <ThemeToggle className="h-10 w-10 rounded-full border-0 bg-transparent shadow-none" />
            </div>

            <div className="relative hidden max-w-md flex-1 md:block lg:max-w-lg">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#b8c3d5]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-[46px] w-full rounded-[60px] border-0 bg-white px-7 pr-11 text-sm text-fd-ink outline-none placeholder:text-[#b8c3d5] fd-shadow-input dark:bg-card"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-testid="user-menu"
                  className="flex items-center gap-3 rounded-[60px] py-1.5 pl-1.5 pr-3 transition hover:bg-white dark:hover:bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-sm font-medium text-white">
                      {(user?.full_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-base lg:inline">
                    <span className="text-fd-body">Hello, </span>
                    <span className="text-fd-ink">{user?.full_name || 'User'}</span>
                  </span>
                  <ChevronDown className="hidden h-4 w-4 text-fd-muted lg:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[280px] border-0 fd-shadow">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-fd-ink">{user?.full_name}</span>
                    <span className="text-xs font-normal text-fd-muted">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                  <Settings className="h-4 w-4" />
                  Account Setting
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem onClick={() => navigate('/dashboard/invitations')}>
                    <Users className="h-4 w-4" />
                    Invite team
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-20 z-30 hidden w-[260px] bg-white fd-shadow dark:bg-sidebar md:block">
        <nav className="h-full overflow-y-auto pb-8 pt-[30px]">
          <ul>
            <SidebarLink to="/dashboard" label="Dashboard" icon={LayoutDashboard} end />
          </ul>

          <div className="mx-[30px] my-5 h-px bg-sidebar-foreground/10" />

          <p className="mb-2 px-[30px] text-xs font-medium uppercase text-fd-cap">Applications</p>
          <ul>
            {applications.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
            {isOwner && <SidebarLink to="/dashboard/invitations" label="Team" icon={Users} />}
          </ul>

          <div className="mx-[30px] my-5 h-px bg-sidebar-foreground/10" />

          <p className="mb-2 px-[30px] text-xs font-medium uppercase text-fd-cap">Components</p>
          <ul>
            {components.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
          </ul>
        </nav>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white px-4 dark:bg-sidebar safe-top md:hidden">
        <Logo showText={false} />
        <span className="text-sm font-medium text-fd-ink">{pageTitle}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="relative h-9 w-9" asChild>
            <NavLink to="/dashboard/alerts" viewTransition aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {badge > 0 ? (
                <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-medium text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </NavLink>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <div className="md:ml-[260px] md:pt-20">
        <div className="mx-auto max-w-[1300px] px-4 py-6 pb-24 md:px-[35px] md:py-[30px] md:pb-10">
          {location.pathname !== '/dashboard' && (
            <div className="mb-6 hidden md:block">
              <h1 className="text-[21px] font-medium text-fd-ink">{pageTitle}</h1>
              <p className="mt-1 text-sm text-fd-cap">
                Dashboard <span className="mx-1">/</span> {pageTitle}
              </p>
            </div>
          )}

          {!user?.businessId && workspacePromptPaths.includes(location.pathname) ? (
            <NoBusinessWorkspace />
          ) : (
            <PageTransition />
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-white dark:bg-sidebar safe-bottom md:hidden">
        {(
          [
            { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
            { to: '/dashboard/inventory', label: 'Inventory', icon: Package, end: false },
            { to: '/dashboard/scans', label: 'Scans', icon: Camera, end: false },
            { to: '/dashboard/alerts', label: 'Alerts', icon: AlertTriangle, end: false },
          ] as const
        ).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            viewTransition
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors duration-200',
                isActive ? 'text-primary' : 'text-fd-muted',
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
