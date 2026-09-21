import { Link } from 'react-router'
import { useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getAnalytics, type AnalyticsData } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const businessId = user?.businessId

  const loader = useCallback(async () => {
    if (!businessId) throw new Error('No business')
    const res = await getAnalytics(businessId, 7)
    if (!res.data) throw new Error(res.message || 'Unable to load analytics')
    return res.data
  }, [businessId])

  const { data, loading, error } = usePollingData<AnalyticsData>(
    loader,
    Boolean(businessId),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Waste patterns and inventory trends from the last 7 days of scans"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      ) : !data?.hasData ? (
        <EmptyState
          title="No analytics yet"
          description="Complete shelf scans to see waste rates and product trends."
          action={
            <Button asChild>
              <Link to="/dashboard/scans">Run a scan</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Weekly waste',
                value: `${data.wastePct}%`,
                sub: 'Spoiled share of detections',
              },
              {
                label: 'Items graded fresh',
                value: String(data.itemsSaved),
                sub: 'Fresh detections this week',
              },
              {
                label: 'Avg confidence',
                value: data.avgConfidence != null ? `${data.avgConfidence}%` : '—',
                sub: `${data.scanCount} completed scan(s)`,
              },
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
              {data.wasteByProduct.length === 0 ? (
                <p className="text-sm text-muted-foreground">No product detections yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.wasteByProduct.map((item) => (
                    <div key={item.product}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span>{item.product}</span>
                        <span className="text-muted-foreground">
                          {item.wastePct}%{' '}
                          <span className="text-primary">
                            ({item.spoiled}/{item.total})
                          </span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, item.wastePct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
