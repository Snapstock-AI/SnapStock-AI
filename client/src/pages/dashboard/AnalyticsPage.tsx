const wasteData = [
  { product: 'Bananas', waste: '12%', trend: '↓ 3%' },
  { product: 'Tomatoes', waste: '8%', trend: '↓ 1%' },
  { product: 'Strawberries', waste: '18%', trend: '↑ 2%' },
  { product: 'Apples', waste: '15%', trend: '→ 0%' },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-muted">Waste patterns and inventory trends</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Weekly waste', value: '11.2%', sub: '↓ 2.1% vs last week' },
          { label: 'Items saved', value: '34', sub: 'Through early alerts' },
          { label: 'Scan accuracy', value: '94%', sub: 'vs manual counts' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-surface-elevated p-5">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-2 font-serif text-3xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-xs text-brand-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface-elevated p-5">
        <h2 className="font-serif text-lg font-semibold">Waste by product</h2>
        <div className="mt-4 space-y-4">
          {wasteData.map((item) => (
            <div key={item.product}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>{item.product}</span>
                <span className="text-muted">
                  {item.waste} <span className="text-brand-500">{item.trend}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: item.waste }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
