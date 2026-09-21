import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const inventory = [
  { name: 'Tomatoes', category: 'Vegetables', stock: 56, freshness: 84, status: 'Fresh' },
  { name: 'Bananas', category: 'Fruits', stock: 41, freshness: 71, status: 'Ripe' },
  { name: 'Apples', category: 'Fruits', stock: 31, freshness: 62, status: 'Alert' },
  { name: 'Bell Peppers', category: 'Vegetables', stock: 28, freshness: 88, status: 'Fresh' },
  { name: 'Strawberries', category: 'Fruits', stock: 18, freshness: 55, status: 'Alert' },
  { name: 'Carrots', category: 'Vegetables', stock: 44, freshness: 91, status: 'Fresh' },
]

const statusVariant: Record<string, 'success' | 'ripe' | 'destructive'> = {
  Fresh: 'success',
  Ripe: 'ripe',
  Alert: 'destructive',
}

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Real-time stock levels and freshness scores"
      />

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Freshness</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell>{item.stock} units</TableCell>
                    <TableCell>{item.freshness}%</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {inventory.map((item) => (
              <div key={item.name} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                  <span>{item.stock} units</span>
                  <span>{item.freshness}% fresh</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
