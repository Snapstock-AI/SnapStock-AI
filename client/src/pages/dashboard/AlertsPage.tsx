import { Link } from 'react-router'
import { AlertTriangle, Bell, Check, CheckCheck, Package } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getAlerts, resolveAlert, type AlertsData, type DashboardAlert } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type AlertFilter = 'all' | 'active' | 'resolved'

const typeStyles: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/10',
  warning: 'border-ripe/40 bg-ripe/10',
  info: '',
}

const severityBadge = {
  critical: 'destructive',
  warning: 'warning',
  info: 'info',
} as const

const typeLabels: Record<DashboardAlert['type'], string> = {
  LOW_STOCK: 'Low stock',
  SPOILAGE: 'Spoilage',
  FRESHNESS_RISK: 'Freshness risk',
  STALE_SHELF: 'Shelf needs a scan',
}

const typeHelp: Record<DashboardAlert['type'], string> = {
  LOW_STOCK: 'Raised when a scan counts fewer items than your low-stock threshold. Restock the shelf, then resolve.',
  SPOILAGE: 'Raised when a scan in the last 7 days detected spoiled items. Remove them and rescan the shelf to clear it.',
  FRESHNESS_RISK: 'Raised when the share of ripe or spoiled items passes your freshness threshold. Consider discounting or rotating stock.',
  STALE_SHELF: 'Raised when a shelf has no completed scan in the last 48 hours. Scanning the shelf clears it.',
}

function alertIcon(severity: DashboardAlert['severity']) {
  if (severity === 'critical') return AlertTriangle
  if (severity === 'warning') return Package
  return Bell
}

function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  )
}

export default function AlertsPage() {
  const { user } = useAuth()
  const businessId = user?.businessId
  const isOwner = user?.businessRole === 'OWNER'
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set())
  const [resolveError, setResolveError] = useState('')
  const [filter, setFilter] = useState<AlertFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const loader = useCallback(async () => {
    if (!businessId) throw new Error('No business')
    const res = await getAlerts(businessId)
    if (!res.data) throw new Error(res.message || 'Unable to load alerts')
    return res.data
  }, [businessId])

  const { data, loading, error, refresh } = usePollingData<AlertsData>(
    loader,
    Boolean(businessId),
    businessId ? `alerts:${businessId}` : undefined,
  )

  const handleResolve = async (alertId: string) => {
    if (!businessId) return
    setResolvingId(alertId)
    setResolveError('')
    try {
      await resolveAlert(businessId, alertId)
      // Show it as resolved right away; the refresh below brings the list back in sync.
      setResolvedIds((prev) => new Set(prev).add(alertId))
      await refresh(true)
    } catch (err: unknown) {
      setResolveError(err instanceof Error ? err.message : 'Unable to resolve alert')
    } finally {
      setResolvingId(null)
    }
  }

  const isResolved = (alert: DashboardAlert) =>
    alert.status === 'resolved' || resolvedIds.has(alert.id)

  const allAlerts = data?.alerts ?? []
  const activeCount = allAlerts.filter((alert) => !isResolved(alert)).length
  const resolvedCount = allAlerts.length - activeCount
  const alerts = allAlerts.filter(
    (alert) => filter === 'all' || (filter === 'resolved') === isResolved(alert),
  )
  const selected = allAlerts.find((alert) => alert.id === selectedId) ?? null
  const selectedResolved = selected ? isResolved(selected) : false

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Spoilage warnings and low-stock notifications from recent scans"
      />

      {(error || resolveError) && (
        <Alert variant="destructive">
          <AlertDescription>{resolveError || error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading alerts...</p>
      ) : !allAlerts.length ? (
        <EmptyState
          title="All clear"
          description="No active alerts. Keep scanning shelves to stay ahead of spoilage."
          action={
            <Button asChild>
              <Link to="/dashboard/scans">Scan a shelf</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as AlertFilter)}>
            <TabsList>
              <TabsTrigger value="all">All ({allAlerts.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
            </TabsList>
            <TabsContent value={filter} className="space-y-3">
              {!alerts.length && (
                <p className="text-sm text-muted-foreground">
                  {filter === 'active'
                    ? 'No active alerts.'
                    : 'No alerts resolved in the last 30 days.'}
                </p>
              )}

              {alerts.map((alert) => {
                const Icon = alertIcon(alert.severity)
                const resolving = resolvingId === alert.id
                const resolved = isResolved(alert)
                return (
                  <Card
                    key={alert.id}
                    className={cn(
                      'transition-shadow hover:shadow-md',
                      resolved ? 'bg-muted/40' : typeStyles[alert.severity],
                    )}
                  >
                    <CardContent className="flex gap-4 p-4">
                      <button
                        type="button"
                        aria-label={`View details for ${alert.title}`}
                        onClick={() => setSelectedId(alert.id)}
                        className="flex min-w-0 flex-1 gap-4 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className={resolved ? 'flex-1 opacity-70' : 'flex-1'}>
                          <span className="block font-medium">{alert.title}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">{alert.message}</span>
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className="text-xs text-muted-foreground">
                          {resolved && alert.resolvedAt
                            ? `${alert.resolvedBy === 'auto' ? 'Cleared' : 'Resolved'} ${formatRelative(alert.resolvedAt)}`
                            : formatRelative(alert.createdAt)}
                        </span>
                        {resolved ? (
                          <span className="inline-flex h-9 items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                            <CheckCheck className="mr-1 h-4 w-4" />
                            Resolved
                          </span>
                        ) : (
                          isOwner && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resolving}
                              onClick={() => handleResolve(alert.id)}
                            >
                              <Check className="mr-1 h-4 w-4" />
                              {resolving ? 'Resolving...' : 'Resolve'}
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
        {selected && (
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <div className="flex flex-wrap gap-2 pr-6">
                <Badge variant={severityBadge[selected.severity]}>
                  {selected.severity.toUpperCase()}
                </Badge>
                <Badge variant="outline">{typeLabels[selected.type] ?? selected.type}</Badge>
                <Badge variant={selectedResolved ? 'success' : 'secondary'}>
                  {selectedResolved ? 'Resolved' : 'Active'}
                </Badge>
              </div>
              <DialogTitle className="pt-2 leading-snug">{selected.title}</DialogTitle>
              <DialogDescription>{selected.message}</DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {selected.shelfName && <DetailRow label="Shelf" value={selected.shelfName} />}
              {selected.productLabel && (
                <DetailRow label="Product" value={selected.productLabel} />
              )}
              {selected.raisedAt && (
                <DetailRow label="First raised" value={formatDateTime(selected.raisedAt)} />
              )}
              <DetailRow
                label={selected.type === 'STALE_SHELF' ? 'Last scan' : 'Last detected'}
                value={
                  selected.type === 'STALE_SHELF' && selected.createdAt === selected.raisedAt
                    ? 'Never scanned'
                    : formatDateTime(selected.createdAt)
                }
              />
              {selectedResolved && selected.resolvedAt && (
                <>
                  <DetailRow label="Resolved" value={formatDateTime(selected.resolvedAt)} />
                  <DetailRow
                    label="Resolved by"
                    value={
                      selected.resolvedBy === 'auto'
                        ? 'Cleared automatically'
                        : (selected.resolvedByName ?? 'Owner')
                    }
                  />
                </>
              )}
            </dl>

            <p className="text-sm text-muted-foreground">{typeHelp[selected.type]}</p>

            <DialogFooter className="gap-2 sm:space-x-0">
              <Button variant="outline" onClick={() => setSelectedId(null)}>
                Close
              </Button>
              {!selectedResolved && isOwner && (
                <Button
                  disabled={resolvingId === selected.id}
                  onClick={() => handleResolve(selected.id)}
                >
                  <Check className="mr-1 h-4 w-4" />
                  {resolvingId === selected.id ? 'Resolving...' : 'Resolve'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
