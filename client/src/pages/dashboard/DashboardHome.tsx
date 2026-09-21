import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, ArrowRight, Building2, Camera, Package, TrendingDown } from 'lucide-react'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'

const stats = [
  { label: 'Total SKUs', value: '48', change: '+3 this week', icon: Package },
  { label: 'Avg freshness', value: '82%', change: '+2.4%', icon: TrendingDown },
  { label: 'Active alerts', value: '4', change: '2 critical', icon: AlertTriangle },
  { label: 'Scans today', value: '12', change: 'Last 2h ago', icon: Camera },
]

const recentScans = [
  { shelf: 'Shelf A · Bananas', score: 71, fresh: 28, ripe: 9, spoiled: 4, status: 'Ripe' },
  { shelf: 'Shelf B · Tomatoes', score: 84, fresh: 42, ripe: 11, spoiled: 3, status: 'Fresh' },
  { shelf: 'Shelf C · Apples', score: 62, fresh: 18, ripe: 6, spoiled: 7, status: 'Alert' },
]

const statusColor: Record<string, string> = {
  Fresh: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
  Ripe: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Alert: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
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

        if (active) {
          setBusiness(currentBusiness || null)
        }
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
        <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800 dark:bg-brand-900/20 md:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            <Building2 className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">Welcome to SnapStock-AI</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Create your business workspace</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            You are signed in, but your account is not connected to a business yet. Create one to manage inventory, shelves, and freshness scans.
          </p>
          <Link
            to="/onboarding/business"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Create a business
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  if (businessError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        {businessError}
      </div>
    )
  }

  if (!business) {
    return <div className="text-sm text-muted">Loading your business details...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold md:text-3xl">Good morning, {user.full_name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-muted">{business.business_name}</p>
        </div>
        <Link
          to="/dashboard/scans"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <Camera className="h-4 w-4" />
          New shelf scan
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, change, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface-elevated p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{label}</p>
              <Icon className="h-4 w-4 text-brand-500" />
            </div>
            <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted">{change}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium">Bananas nearing spoilage — 6 units</p>
            <p className="mt-1 text-sm text-muted">
              Shelf A freshness dropped to 71. Consider markdown or removal within 24h.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Recent scans</h2>
          <Link to="/dashboard/scans" className="flex items-center gap-1 text-sm text-brand-500 hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentScans.map((scan) => (
            <div
              key={scan.shelf}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{scan.shelf}</p>
                <p className="mt-1 font-serif text-xl font-semibold">
                  Score: <span className="text-brand-500">{scan.score}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${statusColor[scan.status]}`}>
                  {scan.status}
                </span>
                <span className="text-xs text-muted">
                  Fresh {scan.fresh} · Ripe {scan.ripe} · Spoiled {scan.spoiled}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
