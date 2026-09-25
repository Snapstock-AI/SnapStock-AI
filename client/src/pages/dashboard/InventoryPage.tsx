import { Link } from 'react-router'
import { useCallback, useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getInventory, type InventoryData } from '@/lib/dashboard'
import { usePollingData } from '@/hooks/usePollingData'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const statusVariant: Record<string, 'success' | 'ripe' | 'destructive' | 'secondary'> = {
  Fresh: 'success',
  Ripe: 'ripe',
  Spoiled: 'destructive',
  Unknown: 'secondary',
}

const RANGE_OPTIONS = [
  { days: 7, label: 'Last 7 days' },
  { days: 14, label: 'Last 14 days' },
  { days: 30, label: 'Last 30 days' },
] as const

export default function InventoryPage() {
  const { user } = useAuth()
  const businessId = user?.businessId
  const [windowDays, setWindowDays] = useState(7)

  const loader = useCallback(async () => {
    if (!businessId) throw new Error('No business')
    const res = await getInventory(businessId, windowDays)
    if (!res.data) throw new Error(res.message || 'Unable to load inventory')
    return res.data
  }, [businessId, windowDays])

  const { data, loading, error } = usePollingData<InventoryData>(
    loader,
    Boolean(businessId),
    businessId ? `inventory:${businessId}:${windowDays}` : undefined,
  )

  const rangeLabel =
    RANGE_OPTIONS.find((option) => option.days === windowDays)?.label ?? `Last ${windowDays} days`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description={`Counts and freshness from detections in the ${rangeLabel.toLowerCase()}`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-full">
                <CalendarDays className="h-4 w-4 text-primary" />
                {rangeLabel}
                <ChevronDown className="h-4 w-4 text-fd-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {RANGE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.days}
                  className="flex items-center justify-between"
                  onClick={() => setWindowDays(option.days)}
                >
                  {option.label}
                  {windowDays === option.days ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !data ? (
        <p className="text-sm text-fd-muted">Loading inventory...</p>
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
                      <TableCell className="font-medium text-fd-ink">
                        {item.product}
                        {item.lowStock ? (
                          <span className="ml-2 text-xs text-amber-600">Low</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{item.stock}</TableCell>
                      <TableCell className="text-fd-muted">
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
                      <p className="font-medium text-fd-ink">{item.product}</p>
                      <p className="text-xs text-fd-muted">
                        Fresh {item.fresh} · Ripe {item.ripe} · Spoiled {item.spoiled}
                      </p>
                    </div>
                    <Badge variant={statusVariant[item.status] ?? 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-fd-muted">
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
