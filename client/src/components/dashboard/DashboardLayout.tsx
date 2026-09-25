import { NavLink, useLocation, useNavigate } from 'react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Camera,
  ChevronDown,
  History,
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
import { getAlertsCount } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import PageTransition from '@/components/dashboard/PageTransition'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const applications = [
  { to: '/dashboard/inventory', label: 'Inventory', icon: Package },
  { to: '/dashboard/scans', label: 'Scans', icon: Camera, end: true as const },
  { to: '/dashboard/scans/history', label: 'History', icon: History },
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
            'group mr-[17px] flex items-center gap-2 rounded-r-[60px] py-3 pl-[30px] pr-[30px] text-base leading-[27px] transition-all duration-200',
            isActive
              ? 'fd-nav-active !text-white'
              : 'text-fd-body hover:translate-x-0.5 hover:bg-muted/70 hover:text-fd-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon
              className={cn(
                'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                isActive ? 'text-white' : 'text-fd-muted group-hover:text-primary',
              )}
            />
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
  const { logout, user, changePassword } = useAuth()
  const isOwner = user?.businessRole === 'OWNER'
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const businessId = user?.businessId

  const searchableLinks = useMemo(() => {
    const links = [
      { to: '/dashboard', label: 'Dashboard', keywords: 'home overview' },
      ...applications.map((link) => ({ ...link, keywords: '' })),
      ...components
        .filter((link) => isOwner || link.to !== '/dashboard/analytics')
        .map((link) => ({ ...link, keywords: '' })),
    ]
    if (isOwner) {
      links.push({ to: '/dashboard/invitations', label: 'Team', keywords: 'invite employees' })
    }
    return links
  }, [isOwner])

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return searchableLinks.filter(
      (link) =>
        link.label.toLowerCase().includes(q) ||
        link.to.toLowerCase().includes(q) ||
        link.keywords.includes(q),
    )
  }, [query, searchableLinks])

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

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
    if (isOwner === false && location.pathname === '/dashboard/analytics') {
      navigate('/dashboard')
    }
  }, [isOwner, location.pathname, navigate])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function goToSearchResult(to: string) {
    setQuery('')
    setSearchOpen(false)
    navigate(to, { viewTransition: true })
  }

  const pageTitle = useMemo(() => {
    const all = [
      { to: '/dashboard', label: 'Dashboard', end: true },
      ...applications,
      ...components,
      { to: '/dashboard/invitations', label: 'Team' },
    ]
    return (
      [...all]
        .sort((a, b) => b.to.length - a.to.length)
        .find((link) =>
          'end' in link && link.end
            ? location.pathname === link.to
            : location.pathname === link.to ||
              location.pathname.startsWith(`${link.to}/`),
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
              <Button variant="ghost" size="icon" className="relative h-10 w-10 text-fd-muted" asChild>
                <NavLink to="/dashboard/alerts" viewTransition aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {badge > 0 ? (
                    <span className="absolute right-1 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </NavLink>
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-fd-muted" asChild>
                <NavLink to="/dashboard/settings" viewTransition aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </NavLink>
              </Button>
              <ThemeToggle className="h-10 w-10 rounded-full border-0 bg-transparent shadow-none" />
            </div>

            <div ref={searchRef} className="relative hidden max-w-md flex-1 md:block lg:max-w-lg">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fd-muted" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults[0]) {
                    e.preventDefault()
                    goToSearchResult(searchResults[0].to)
                  }
                  if (e.key === 'Escape') {
                    setSearchOpen(false)
                    setQuery('')
                  }
                }}
                placeholder="Search pages…"
                aria-label="Search dashboard pages"
                className="h-[46px] w-full rounded-[60px] border border-border bg-white px-7 pr-11 text-sm text-fd-ink outline-none placeholder:text-fd-muted fd-shadow-input dark:bg-card"
              />
              {searchOpen && query.trim() && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border bg-white shadow-lg dark:bg-card">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-fd-muted">No matching pages</p>
                  ) : (
                    <ul className="py-1">
                      {searchResults.map((result) => (
                        <li key={result.to}>
                          <button
                            type="button"
                            className="flex w-full items-center px-4 py-2.5 text-left text-sm text-fd-ink transition hover:bg-muted"
                            onClick={() => goToSearchResult(result.to)}
                          >
                            {result.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
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

          <div className="mx-[30px] my-5 h-px bg-border" />

          <p className="mb-2 px-[30px] text-xs font-medium uppercase text-fd-cap">Applications</p>
          <ul>
            {applications.map((link) => (
              <SidebarLink key={link.to} {...link} />
            ))}
            {isOwner && <SidebarLink to="/dashboard/invitations" label="Team" icon={Users} />}
          </ul>

          <div className="mx-[30px] my-5 h-px bg-border" />

          <p className="mb-2 px-[30px] text-xs font-medium uppercase text-fd-cap">Components</p>
          <ul>
            {components
              .filter((link) => isOwner || link.to !== '/dashboard/analytics')
              .map((link) => (
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
            { to: '/dashboard/shelves', label: 'Shelves', icon: Package, end: false },
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
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-all duration-200',
                isActive ? 'text-primary scale-105' : 'text-fd-muted hover:text-fd-ink',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Dialog open={Boolean(user?.must_change_password)}>
        <DialogContent onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Create a new password</DialogTitle>
            <DialogDescription>
              Your account was created with a temporary password. Choose a new password to continue.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setPasswordError('')
              if (newPassword.length < 8) {
                setPasswordError('Password must be at least 8 characters long.')
                return
              }
              if (newPassword !== confirmPassword) {
                setPasswordError('Passwords do not match.')
                return
              }
              setSavingPassword(true)
              try {
                await changePassword(newPassword)
                setNewPassword('')
                setConfirmPassword('')
              } catch (error: unknown) {
                setPasswordError(error instanceof Error ? error.message : 'Unable to update password.')
              } finally {
                setSavingPassword(false)
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={savingPassword}>{savingPassword ? 'Saving...' : 'Save new password'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
