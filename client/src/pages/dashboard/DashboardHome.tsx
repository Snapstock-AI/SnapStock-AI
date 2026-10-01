import { Link } from 'react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  Leaf,
  Package,
  ScanLine,
} from 'lucide-react'
import { Cell, Label, Pie, PieChart } from 'recharts'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { getDashboard, type DashboardData, type FreshnessSegment } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { EmptyState } from '@/components/EmptyState'
import SectionCards, { type SectionStat } from '@/components/dashboard/SectionCards'
import ChartAreaInteractive from '@/components/dashboard/ChartAreaInteractive'

/** Map API freshness segments onto theme tokens so the donut follows light/dark mode. */
function segmentColor(seg: FreshnessSegment) {
  const label = seg.label.toLowerCase()
  if (label.includes('fresh')) return 'var(--chart-1)'
  if (label.includes('spoil') || label.includes('rotten')) return 'var(--spoiled)'
  if (label.includes('ripe') || label.includes('medium')) return 'var(--ripe)'
  return seg.color
}

function FreshnessDonut({ segments }: { segments: FreshnessSegment[] }) {
  const total = segments.reduce((sum, seg) => sum + seg.count, 0)
  const data = segments.map((seg) => ({ name: seg.label, value: seg.count, fill: segmentColor(seg) }))
  const config: ChartConfig = Object.fromEntries(
    segments.map((seg) => [seg.label, { label: seg.label, color: segmentColor(seg) }]),
  )

  if (total === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No graded items yet
      </p>
    )
  }

  return (
    <ChartContainer config={config} className="mx-auto aspect-square h-[220px]">
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} strokeWidth={4}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} stroke="var(--card)" />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                      {total.toLocaleString()}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-muted-foreground text-xs">
                      items graded
                    </tspan>
                  </text>
                )
              }
              return null
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}

const shelfTone = (pct: number) => (pct >= 70 ? 'bg-chart-1' : pct >= 40 ? 'bg-ripe' : 'bg-spoiled')

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
    return <div className="text-sm text-muted-foreground">Loading your dashboard...</div>
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return (
      <EmptyState
        title="Dashboard unavailable"
        description="No dashboard data was returned for this workspace. Try switching workspace or refreshing."
      />
    )
  }

  const displayName = business?.business_name || 'Your business'

  const firstName = user.full_name.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const kpis = data.kpis
  const activeAlerts = kpis?.activeAlerts ?? 0
  const avgFreshness = kpis?.avgFreshness ?? null
  const stats: SectionStat[] = [
    {
      label: 'Total SKUs',
      value: String(kpis?.totalSkus ?? 0),
      icon: Package,
      badge: { text: `${windowDays}d`, tone: 'neutral' },
      headline: 'Products tracked',
      detail: `Seen on shelves in the last ${windowDays} days`,
    },
    {
      label: 'Avg Freshness',
      value: avgFreshness != null ? `${avgFreshness}%` : '—',
      icon: Leaf,
      badge:
        avgFreshness == null
          ? undefined
          : avgFreshness >= 70
            ? { text: 'Healthy', tone: 'good' }
            : { text: 'At risk', tone: 'warn' },
      headline:
        avgFreshness == null
          ? 'No graded items yet'
          : avgFreshness >= 70
            ? 'Shelves look fresh'
            : 'Freshness dropping',
      detail: 'Weighted across fresh, ripe and spoiled',
    },
    {
      label: 'Active Alerts',
      value: String(activeAlerts),
      icon: Bell,
      badge: activeAlerts > 0 ? { text: 'Needs action', tone: 'warn' } : { text: 'All clear', tone: 'good' },
      headline: activeAlerts > 0 ? 'Review open alerts' : 'Nothing needs attention',
      detail: 'Low stock, spoilage and stale shelves',
    },
    {
      label: 'Scans Today',
      value: String(kpis?.scansToday ?? 0),
      icon: ScanLine,
      badge: { text: 'Today', tone: 'neutral' },
      headline: 'Shelf scans completed',
      detail: 'Each scan updates stock and freshness',
    },
  ]

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {greeting}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening at {displayName}.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/dashboard/scans">
            <Camera className="h-4 w-4" />
            New scan
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SectionCards stats={stats} />

      {data.topAlert ? (
        <Alert className="border-ripe/40 bg-ripe/10">
          <AlertTriangle className="h-5 w-5 text-ripe-foreground dark:text-ripe" />
          <AlertDescription>
            <p className="font-medium text-foreground">{data.topAlert.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{data.topAlert.message}</p>
            <Button variant="link" className="mt-1 h-auto p-0" asChild>
              <Link to="/dashboard/alerts">
                View all alerts
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!data.hasData ? (
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
        <>
          <ChartAreaInteractive points={data.scanVolume} windowDays={windowDays} onWindowChange={setWindowDays} />

          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Freshness mix</CardTitle>
                <CardDescription>Graded items in the last {windowDays} days</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
                <FreshnessDonut segments={data.freshnessMix} />
                <ul className="w-full max-w-[240px] space-y-3">
                  {data.freshnessMix.map((seg) => (
                    <li key={seg.label} className="flex items-center justify-between gap-4 text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ background: segmentColor(seg) }}
                        />
                        {seg.label}
                      </span>
                      <span className="font-medium tabular-nums text-foreground">
                        {seg.count} ({seg.value}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between">
                <div className="flex flex-col gap-1.5">
                  <CardTitle className="text-lg">Shelf health</CardTitle>
                  <CardDescription>Freshness score per shelf</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-semibold tabular-nums text-primary">
                    {data.avgShelfScore != null ? data.avgShelfScore : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">avg shelf score</p>
                </div>
              </CardHeader>
              <CardContent>
                {data.shelfHealth.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shelves scanned yet.</p>
                ) : (
                  <ul className="space-y-4">
                    {data.shelfHealth.map((shelf) => (
                      <li key={shelf.shelfId} className="flex items-center gap-3">
                        <span className="w-28 shrink-0 truncate text-sm text-muted-foreground">{shelf.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${shelfTone(shelf.pct)}`}
                            style={{ width: `${shelf.pct}%` }}
                          />
                        </div>
                        <span className="w-11 text-right text-sm font-medium tabular-nums text-foreground">
                          {shelf.pct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
