import { AlertTriangle, Bell, Package } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/card'

const alerts = [
  {
    id: 1,
    type: 'critical',
    title: 'Bananas nearing spoilage',
    detail: '6 units on Shelf A — freshness score dropped to 71',
    time: '2h ago',
    icon: AlertTriangle,
  },
  {
    id: 2,
    type: 'warning',
    title: 'Low stock: Strawberries',
    detail: '18 units remaining — below reorder threshold of 25',
    time: '5h ago',
    icon: Package,
  },
  {
    id: 3,
    type: 'info',
    title: 'Apples inspection due',
    detail: 'Shelf C not scanned in 48 hours',
    time: '1d ago',
    icon: Bell,
  },
]

const typeStyles: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/10',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20',
  info: '',
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Spoilage warnings and low-stock notifications"
      />

      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card key={alert.id} className={typeStyles[alert.type]}>
            <CardContent className="flex gap-4 p-4">
              <alert.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="font-medium">{alert.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{alert.detail}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{alert.time}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
