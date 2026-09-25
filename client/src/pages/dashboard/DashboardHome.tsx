import { Link } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Globe2,
  Package,
  UserPlus,
} from 'lucide-react'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import {
  getDashboard,
  type DashboardData,
  type FreshnessSegment,
} from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/EmptyState'
import { cn } from '@/lib/utils'
import { useCallback, useEffect, useState } from 'react'

const RANGE_OPTIONS = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
] as const

function DonutChart({ segments }: { segments: FreshnessSegment[] }) {
  const radius = 54
  const stroke = 18
  const c = 2 * Math.PI * radius
  let offset = 0
  const data =
    segments.length > 0
      ? segments
      : [{ label: 'Empty', value: 100, count: 0, color: '#edf2f9' }]

  return (
    <div className="relative mx-auto h-[200px] w-[200px]">
      <svg viewBox="0 0 140 140" className="-rotate-90 h-full w-full">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#edf2f9" strokeWidth={stroke} />
        {data.map((seg) => {
          const len = (seg.value / 100) * c
          const el = (
            <circle
              key={seg.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs text-fd-muted">Mix</p>
        <p className="text-lg font-medium text-fd-ink">Freshness</p>
      </div>
    </div>
  )
}

function BarChart({
  points,
  windowDays,
}: {
  points: Array<{ label: string; value: number }>
  windowDays: number
}) {
  const max = Math.max(1, ...points.map((d) => d.value))
  if (points.length === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-fd-muted">
        No scans in the last {windowDays} days
      </p>
    )
  }
  return (
    <div className="flex h-[220px] items-end justify-between gap-3 px-2 pt-4">
      {points.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-[180px] w-full items-end justify-center border-b border-dashed border-border">
            <div
              className="w-8 rounded-t-sm bg-primary transition-all duration-300 hover:opacity-90"
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-fd-muted">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

const shelfTones = ['bg-primary', 'bg-[#ff4f70]', 'bg-[#01caf1]', 'bg-[#f4c430]', 'bg-[#7dcf8a]']

export default function DashboardHome() {
  const { token, user } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [businessError, setBusinessError] = useState('')
  const [windowDays, setWindowDays] = useState(7)
  const businessId = user?.businessId

  const loadDashboard = useCallback(async () => {
    if (!businessId) throw new Error('No business')
    const res = await getDashboard(businessId, windowDays)
    if (!res.data) throw new Error(res.message || 'Unable to load dashboard')
    return res.data
  }, [businessId, windowDays])

  const { data, loading, error } = usePollingData<DashboardData>(
    loadDashboard,
    Boolean(token && businessId),
    businessId ? `dashboard:${businessId}:${windowDays}` : undefined,
  )

  useEffect(() => {
    setBusinessError('')
    if (!token || !businessId) {
      setBusiness(null)
      return
    }
    let active = true
    apiRequest<Business[]>('/businesses/mine', {}, true)
      .then((response) => {
        const current = response.data?.find((item) => item.id === businessId)
        if (active) setBusiness(current || null)
      })
      .catch((err: unknown) => {
        if (active) {
          setBusinessError(err instanceof Error ? err.message : 'Unable to load business details.')
        }
      })
    return () => {
      active = false
    }
  }, [token, businessId])

  if (!user?.businessId) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Card>
          <CardContent>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="mt-6 text-xs font-medium uppercase tracking-widest text-primary">
              Welcome to SnapStock-AI
            </p>
            <h1 className="mt-3 text-[30px] font-medium text-fd-ink">Create your business workspace</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-fd-body">
              You are signed in, but your account is not connected to a business yet. Create one to
              manage inventory, shelves, and freshness scans.
            </p>
            <Button asChild className="mt-7">
              <Link to="/onboarding/business">
                Create a business
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (businessError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{businessError}</AlertDescription>
      </Alert>
    )
  }

  if (loading && !data) {
    return <div className="text-sm text-fd-muted">Loading your dashboard...</div>
  }

  // Prefer live dashboard payload; business profile can catch up without blanking the page.
  if (!data) {
    return <div className="text-sm text-fd-muted">Loading your dashboard...</div>
  }

  const displayName = business?.business_name || 'Your business'

  const firstName = user.full_name.split(' ')[0]
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.days === windowDays)?.label ?? `Last ${windowDays} days`
  const kpis = data?.kpis
  const stats = [
    {
      label: 'Total SKUs',
      value: String(kpis?.totalSkus ?? 0),
      icon: Package,
    },
    {
      label: 'Avg Freshness',
      value: kpis?.avgFreshness != null ? `${kpis.avgFreshness}%` : '—',
      icon: UserPlus,
    },
    {
      label: 'Active Alerts',
      value: String(kpis?.activeAlerts ?? 0),
      icon: FileText,
    },
    {
      label: 'Scans Today',
      value: String(kpis?.scansToday ?? 0),
      icon: Globe2,
    },
  ]

  return (
    <div className="space-y-[30px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] font-medium text-fd-ink md:text-[30px]">
            {greeting} {firstName}!
          </h1>
          <p className="mt-1 text-sm text-fd-cap">
            Dashboard <span className="mx-1">/</span> {displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-[42px] items-center gap-2 rounded-[60px] border border-border bg-white px-4 text-sm text-fd-ink shadow-sm transition hover:border-primary/40 hover:shadow-md dark:bg-card"
              >
                <CalendarDays className="h-4 w-4 text-primary" />
                {rangeLabel}
                <ChevronDown className="h-4 w-4 text-fd-muted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.days}
                  className="flex items-center justify-between"
                  onClick={() => setWindowDays(option.days)}
                >
                  {option.label}
                  {windowDays === option.days ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="h-[42px] rounded-[60px]" asChild>
            <Link to="/dashboard/scans">
              <Camera className="h-4 w-4" />
              New scan
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }, index) => (
            <div
              key={label}
              className={cn(
                'p-[25px]',
                index < stats.length - 1 && 'lg:border-r lg:border-border',
                index % 2 === 0 && 'sm:border-r sm:border-border lg:border-r',
                index < 2 && 'border-b border-border lg:border-b-0',
              )}
            >
              <div className="flex items-center">
                <div className="min-w-0">
                  <h2 className="mb-1 text-[30px] font-medium leading-none text-fd-ink">{value}</h2>
                  <h6 className="truncate text-sm font-normal text-fd-muted">{label}</h6>
                </div>
                <div className="ms-auto opacity-70">
                  <Icon className="h-6 w-6 text-fd-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {data?.topAlert ? (
        <Alert className="border-0 bg-white fd-shadow dark:bg-card">
          <AlertTriangle className="h-5 w-5 text-[#fdc16a]" />
          <AlertDescription>
            <p className="font-medium text-fd-ink">{data.topAlert.title}</p>
            <p className="mt-1 text-sm text-fd-body">{data.topAlert.message}</p>
            <Button variant="link" className="mt-1 h-auto p-0" asChild>
              <Link to="/dashboard/alerts">View all alerts</Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!data?.hasData ? (
        <EmptyState
          title="No scan data yet"
          description="Run a shelf scan to populate freshness mix, inventory, and alerts."
          action={
            <Button asChild>
              <Link to="/dashboard/scans">Start scanning</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-[30px] lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Freshness mix</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <DonutChart segments={data.freshnessMix} />
              <ul className="mt-4 space-y-3">
                {data.freshnessMix.map((seg) => (
                  <li key={seg.label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-fd-muted">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: seg.color }}
                      />
                      {seg.label}
                    </span>
                    <span className="font-medium text-fd-ink">
                      {seg.count} ({seg.value}%)
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scan volume</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <BarChart points={data.scanVolume} windowDays={windowDays} />
              <p className="mt-3 text-center text-sm italic text-fd-muted">
                Completed scans over the last {windowDays} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shelf health</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="mb-5 flex h-[140px] items-center justify-center rounded-xl border border-border bg-muted/40">
                <div className="text-center">
                  <p className="text-[30px] font-medium text-primary">
                    {data.avgShelfScore != null ? data.avgShelfScore : '—'}
                  </p>
                  <p className="text-xs text-fd-muted">avg shelf score</p>
                </div>
              </div>
              <div className="space-y-4">
                {data.shelfHealth.length === 0 ? (
                  <p className="text-sm text-fd-muted">No shelves scanned yet.</p>
                ) : (
                  data.shelfHealth.map((shelf, i) => (
                    <div key={shelf.shelfId} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-sm text-fd-muted">
                        {shelf.name}
                      </span>
                      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#edf2f9] dark:bg-muted">
                        <div
                          className={cn('h-full rounded-full', shelfTones[i % shelfTones.length])}
                          style={{ width: `${shelf.pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-medium text-fd-ink">
                        {shelf.pct}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
