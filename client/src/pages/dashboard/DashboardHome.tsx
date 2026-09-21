import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Camera,
  ChevronDown,
  FileText,
  Globe2,
  Package,
  UserPlus,
} from 'lucide-react'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Dashboard home patterned after client/UI-theme/src/html/index.html */

const stats = [
  { label: 'Total SKUs', value: '48', delta: '+6.25%', up: true, icon: Package },
  { label: 'Avg Freshness', value: '82%', delta: '+2.40%', up: true, icon: UserPlus },
  { label: 'Active Alerts', value: '4', delta: '-18.33%', up: false, icon: FileText },
  { label: 'Scans Today', value: '12', delta: '+9.10%', up: true, icon: Globe2 },
]

const freshnessSegments = [
  { label: 'Fresh stock', value: 62, amount: '1,248', color: '#1d6b45' },
  { label: 'Ripe soon', value: 24, amount: '482', color: '#3da866' },
  { label: 'Spoiled', value: 14, amount: '281', color: '#edf2f9' },
]

const weeklyScans = [
  { label: 'Jan', value: 42 },
  { label: 'Feb', value: 58 },
  { label: 'Mar', value: 51 },
  { label: 'Apr', value: 73 },
  { label: 'May', value: 64 },
  { label: 'Jun', value: 81 },
]

const shelfHealth = [
  { name: 'Bananas', pct: 71, tone: 'bg-primary' },
  { name: 'Tomatoes', pct: 84, tone: 'bg-[#ff4f70]' },
  { name: 'Apples', pct: 62, tone: 'bg-[#01caf1]' },
]

function DonutChart() {
  const radius = 54
  const stroke = 18
  const c = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="relative mx-auto h-[200px] w-[200px]">
      <svg viewBox="0 0 140 140" className="-rotate-90 h-full w-full">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#edf2f9" strokeWidth={stroke} />
        {freshnessSegments.map((seg) => {
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

function BarChart() {
  const max = Math.max(...weeklyScans.map((d) => d.value))
  return (
    <div className="flex h-[220px] items-end justify-between gap-3 px-2 pt-4">
      {weeklyScans.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-[180px] w-full items-end justify-center border-b border-dashed border-border">
            <div
              className="w-8 rounded-t-sm bg-primary"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-fd-muted">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardHome() {
  const { token, user } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [businessError, setBusinessError] = useState('')

  useEffect(() => {
    const businessId = user?.businessId
    setBusinessError('')

    if (!token || !businessId) {
      setBusiness(null)
      return
    }

    let active = true

    async function loadBusiness() {
      try {
        const response = await apiRequest<Business[]>('/businesses/mine', {}, true)
        const currentBusiness = response.data?.find((item) => item.id === businessId)
        if (active) setBusiness(currentBusiness || null)
      } catch (error: unknown) {
        if (active) {
          setBusinessError(error instanceof Error ? error.message : 'Unable to load business details.')
        }
      }
    }

    loadBusiness()
    return () => {
      active = false
    }
  }, [token, user?.businessId])

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

  if (!business) {
    return <div className="text-sm text-fd-muted">Loading your business details...</div>
  }

  const firstName = user.full_name.split(' ')[0]
  const today = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  return (
    <div className="space-y-[30px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[21px] font-medium text-fd-ink md:text-[30px]">
            Good Morning {firstName}!
          </h1>
          <p className="mt-1 text-sm text-fd-cap">
            Dashboard <span className="mx-1">/</span> {business.business_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-[42px] items-center gap-2 rounded-[60px] border-0 bg-white px-4 text-sm text-fd-ink fd-shadow-input dark:bg-card"
          >
            <CalendarDays className="h-4 w-4 text-primary" />
            {today}
            <ChevronDown className="h-4 w-4 text-fd-muted" />
          </button>
          <Button className="h-[42px] rounded-[60px]" asChild>
            <Link to="/dashboard/scans">
              <Camera className="h-4 w-4" />
              New scan
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, delta, up, icon: Icon }, index) => (
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
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-[30px] font-medium leading-none text-fd-ink">{value}</h2>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium text-white',
                        up ? 'bg-primary' : 'bg-destructive',
                      )}
                    >
                      {delta}
                    </span>
                  </div>
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

      <Alert className="border-0 bg-white fd-shadow dark:bg-card">
        <AlertTriangle className="h-5 w-5 text-[#fdc16a]" />
        <AlertDescription>
          <p className="font-medium text-fd-ink">Bananas nearing spoilage — 6 units</p>
          <p className="mt-1 text-sm text-fd-body">
            Shelf A freshness dropped to 71. Consider markdown or removal within 24h.
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-[30px] lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Sales</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DonutChart />
            <ul className="mt-4 space-y-3">
              {freshnessSegments.slice(0, 2).map((seg) => (
                <li key={seg.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-fd-muted">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                    {seg.label}
                  </span>
                  <span className="font-medium text-fd-ink">{seg.amount}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Net Income</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <BarChart />
            <p className="mt-3 text-center text-sm italic text-fd-muted">
              Weekly scan volume across the last 6 months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Earning by Location</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="mb-5 flex h-[140px] items-center justify-center rounded bg-[#f9fbfd] dark:bg-muted">
              <div className="text-center">
                <p className="text-[30px] font-medium text-primary">72</p>
                <p className="text-xs text-fd-muted">avg shelf score</p>
              </div>
            </div>
            <div className="space-y-4">
              {shelfHealth.map((shelf) => (
                <div key={shelf.name} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm text-fd-muted">{shelf.name}</span>
                  <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#edf2f9] dark:bg-muted">
                    <div className={cn('h-full rounded-full', shelf.tone)} style={{ width: `${shelf.pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-medium text-fd-ink">{shelf.pct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
