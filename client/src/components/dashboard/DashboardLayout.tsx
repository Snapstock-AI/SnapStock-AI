import { NavLink, useLocation, useNavigate } from 'react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Camera,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingBasket,
  Users,
} from 'lucide-react'
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
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { ALERTS_CHANGED_EVENT, getAlertsCount } from '@/lib/dashboard'
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
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import AppSidebar from '@/components/dashboard/AppSidebar'
import { homeNav, isNavActive, manageNav } from '@/components/dashboard/nav'

const workspacePromptPaths = [
  '/dashboard',
  '/dashboard/inventory',
  '/dashboard/scans',
  '/dashboard/scans/history',
  '/dashboard/alerts',
  '/dashboard/analytics',
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user, changePassword, switchBusiness } = useAuth()
  const isOwner = user?.businessRole === 'OWNER'
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [workspaces, setWorkspaces] = useState<Business[]>([])
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false)
  const businessId = user?.businessId

  useEffect(() => {
    let cancelled = false
    async function loadWorkspaces() {
      try {
        const result = await apiRequest<Business[]>('/businesses/mine', {}, true)
        if (!cancelled) setWorkspaces(result.data ?? [])
      } catch {
        if (!cancelled) setWorkspaces([])
      }
    }
    if (user?.id) void loadWorkspaces()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.businessId])

  const activeWorkspace = useMemo(
    () => workspaces.find((item) => item.id === businessId) ?? null,
    [workspaces, businessId],
  )

  async function handleSwitchWorkspace(nextBusinessId: string) {
    if (!nextBusinessId || nextBusinessId === businessId || switchingWorkspace) return
    setSwitchingWorkspace(true)
    try {
      await switchBusiness(nextBusinessId)
      navigate('/dashboard', { replace: true })
    } catch {
      // Keep current workspace if switch fails.
    } finally {
      setSwitchingWorkspace(false)
    }
  }

  const searchableLinks = useMemo(
    () =>
      [...homeNav, ...manageNav]
        .filter((link) => isOwner || !link.ownerOnly)
        .map((link) => ({
          to: link.to,
          label: link.label,
          keywords:
            link.to === '/dashboard' ? 'home overview' : link.to === '/dashboard/invitations' ? 'invite employees' : '',
        })),
    [isOwner],
  )

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

  const { data: alertCount, refresh: refreshAlertCount } = usePollingData<number>(
    loadAlertCount,
    Boolean(businessId),
    businessId ? `alerts-count:${businessId}` : undefined,
  )

  useEffect(() => {
    const onAlertsChanged = () => void refreshAlertCount(true)
    window.addEventListener(ALERTS_CHANGED_EVENT, onAlertsChanged)
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, onAlertsChanged)
  }, [refreshAlertCount])

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

  const pageTitle = useMemo(
    () =>
      [...homeNav, ...manageNav]
        .sort((x, y) => y.to.length - x.to.length)
        .find((link) => isNavActive(location.pathname, link))?.label ?? 'Dashboard',
    [location.pathname],
  )

  const badge = alertCount ?? 0

  return (
    <SidebarProvider
      style={{ '--sidebar-width': '16rem', '--header-height': '3.5rem' } as React.CSSProperties}
    >
      <AppSidebar isOwner={isOwner} alertCount={badge} user={user} onLogout={handleLogout} />

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background/90 backdrop-blur safe-top md:rounded-t-xl">
          <div className="flex w-full min-w-0 items-center gap-1 px-3 sm:gap-2 lg:px-6">
            <SidebarTrigger className="-ml-1 size-9" aria-label="Toggle sidebar" />
            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />
            <span className="truncate text-base font-medium text-foreground">{pageTitle}</span>

            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={switchingWorkspace}
                    className="hidden h-9 max-w-[220px] items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm shadow-xs transition hover:bg-muted disabled:opacity-60 md:flex"
                  >
                    <span className="min-w-0 truncate font-medium text-foreground">
                      {activeWorkspace?.business_name || 'Workspace'}
                    </span>
                    <span className="hidden truncate text-xs text-muted-foreground xl:inline">
                      {activeWorkspace?.role || user?.businessRole || 'Member'}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[260px]">
                  <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {workspaces.length === 0 ? (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                      No workspaces yet
                    </DropdownMenuItem>
                  ) : (
                    workspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => handleSwitchWorkspace(workspace.id)}
                        className={cn(workspace.id === businessId && 'bg-muted font-medium')}
                      >
                        <div className="min-w-0">
                          <p className="truncate">{workspace.business_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{workspace.role}</p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/onboarding/business')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create new business
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div ref={searchRef} className="relative hidden w-56 lg:block xl:w-64">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                  className="h-9 w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-sm text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                {searchOpen && query.trim() && (
                  <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                    {searchResults.length === 0 ? (
                      <p className="px-3 py-2.5 text-sm text-muted-foreground">No matching pages</p>
                    ) : (
                      <ul className="p-1">
                        {searchResults.map((result) => (
                          <li key={result.to}>
                            <button
                              type="button"
                              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-popover-foreground transition hover:bg-muted"
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

              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg" asChild>
                <NavLink to="/dashboard/alerts" viewTransition aria-label="Notifications">
                  <Bell className="h-[18px] w-[18px]" />
                  {badge > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  ) : null}
                </NavLink>
              </Button>
              <ThemeToggle className="h-9 w-9 rounded-lg border-0 bg-transparent shadow-none" />

              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-testid="user-menu"
                    aria-label="Account menu"
                    className="ml-1 rounded-full ring-offset-2 ring-offset-background transition hover:ring-2 hover:ring-primary/40"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                        {(user?.full_name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[260px]">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="truncate">{user?.full_name}</span>
                      <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
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

        <div className="@container/main flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
            {!user?.businessId && workspacePromptPaths.includes(location.pathname) ? (
              <NoBusinessWorkspace />
            ) : (
              <PageTransition />
            )}
          </div>
        </div>
      </SidebarInset>

      <nav
        aria-label="Quick navigation"
        className="fixed right-0 bottom-0 left-0 z-40 flex border-t border-border bg-background/95 backdrop-blur safe-bottom md:hidden"
      >
        {(
          [
            { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
            { to: '/dashboard/inventory', label: 'Inventory', icon: Package, end: false },
            { to: '/dashboard/scans', label: 'Scans', icon: Camera, end: false },
            { to: '/dashboard/shelves', label: 'Shelves', icon: ShoppingBasket, end: false },
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
                'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
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
    </SidebarProvider>
  )
}
