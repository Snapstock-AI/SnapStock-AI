import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const wasteData = [
  { product: 'Bananas', waste: '12%', trend: '↓ 3%' },
  { product: 'Tomatoes', waste: '8%', trend: '↓ 1%' },
  { product: 'Strawberries', waste: '18%', trend: '↑ 2%' },
  { product: 'Apples', waste: '15%', trend: '→ 0%' },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Waste patterns and inventory trends"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Weekly waste', value: '11.2%', sub: '↓ 2.1% vs last week' },
          { label: 'Items saved', value: '34', sub: 'Through early alerts' },
          { label: 'Scan accuracy', value: '94%', sub: 'vs manual counts' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-xs text-primary">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Waste by product</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wasteData.map((item) => (
              <div key={item.product}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{item.product}</span>
                  <span className="text-muted-foreground">
                    {item.waste} <span className="text-primary">{item.trend}</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: item.waste }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
