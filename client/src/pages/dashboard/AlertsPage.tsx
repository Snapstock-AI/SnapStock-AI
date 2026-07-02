import { AlertTriangle, Bell, Package } from 'lucide-react'

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
  critical: 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20',
  info: 'border-border bg-surface-elevated',
}

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Alerts</h1>
        <p className="mt-1 text-sm text-muted">Spoilage warnings and low-stock notifications</p>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex gap-4 rounded-2xl border p-4 ${typeStyles[alert.type]}`}
          >
            <alert.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
            <div className="flex-1">
              <p className="font-medium">{alert.title}</p>
              <p className="mt-1 text-sm text-muted">{alert.detail}</p>
            </div>
            <span className="shrink-0 text-xs text-muted">{alert.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
