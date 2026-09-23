import { Link } from 'react-router'
import { AlertTriangle, Bell, Package } from 'lucide-react'
import { useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getAlerts, type AlertsData, type DashboardAlert } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const typeStyles: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/10',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20',
  info: '',
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

export default function AlertsPage() {
  const { user } = useAuth()
  const businessId = user?.businessId

  const loader = useCallback(async () => {
    if (!businessId) throw new Error('No business')
    const res = await getAlerts(businessId)
    if (!res.data) throw new Error(res.message || 'Unable to load alerts')
    return res.data
  }, [businessId])

  const { data, loading, error } = usePollingData<AlertsData>(
    loader,
    Boolean(businessId),
    businessId ? `alerts:${businessId}` : undefined,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Spoilage warnings and low-stock notifications from recent scans"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading alerts...</p>
      ) : !data?.alerts.length ? (
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
          {data.alerts.map((alert) => {
            const Icon = alertIcon(alert.severity)
            return (
              <Card key={alert.id} className={typeStyles[alert.severity]}>
                <CardContent className="flex gap-4 p-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">{alert.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelative(alert.createdAt)}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
