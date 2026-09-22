import { Link } from 'react-router'
import { useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getInventory, type InventoryData } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusVariant: Record<string, 'success' | 'ripe' | 'destructive' | 'secondary'> = {
  Fresh: 'success',
  Ripe: 'ripe',
  Spoiled: 'destructive',
  Unknown: 'secondary',
}

export default function InventoryPage() {
  const { user } = useAuth()
  const businessId = user?.businessId

  const loader = useCallback(async () => {
    if (!businessId) throw new Error('No business')
    const res = await getInventory(businessId, 7)
    if (!res.data) throw new Error(res.message || 'Unable to load inventory')
    return res.data
  }, [businessId])

  const { data, loading, error } = usePollingData<InventoryData>(
    loader,
    Boolean(businessId),
    businessId ? `inventory:${businessId}` : undefined,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Counts and freshness from detections in the last 7 days"
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading inventory...</p>
      ) : !data?.hasData ? (
        <EmptyState
          title="No inventory yet"
          description="Scan shelves to build a live product inventory from AI detections."
          action={
            <Button asChild>
              <Link to="/dashboard/scans">Scan shelves</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Fresh / Ripe / Spoiled</TableHead>
                    <TableHead>Freshness</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.product}>
                      <TableCell className="font-medium">
                        {item.product}
                        {item.lowStock ? (
                          <span className="ml-2 text-xs text-amber-600">Low</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.fresh} / {item.ripe} / {item.spoiled}
                      </TableCell>
                      <TableCell>{item.freshnessPct}%</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[item.status] ?? 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y divide-border md:hidden">
              {data.items.map((item) => (
                <div key={item.product} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.product}</p>
                      <p className="text-xs text-muted-foreground">
                        Fresh {item.fresh} · Ripe {item.ripe} · Spoiled {item.spoiled}
                      </p>
                    </div>
                    <Badge variant={statusVariant[item.status] ?? 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                    <span>{item.stock} counted</span>
                    <span>{item.freshnessPct}% score</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
