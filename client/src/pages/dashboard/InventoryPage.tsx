const inventory = [
  { name: 'Tomatoes', category: 'Vegetables', stock: 56, freshness: 84, status: 'Fresh' },
  { name: 'Bananas', category: 'Fruits', stock: 41, freshness: 71, status: 'Ripe' },
  { name: 'Apples', category: 'Fruits', stock: 31, freshness: 62, status: 'Alert' },
  { name: 'Bell Peppers', category: 'Vegetables', stock: 28, freshness: 88, status: 'Fresh' },
  { name: 'Strawberries', category: 'Fruits', stock: 18, freshness: 55, status: 'Alert' },
  { name: 'Carrots', category: 'Vegetables', stock: 44, freshness: 91, status: 'Fresh' },
]

const statusStyles: Record<string, string> = {
  Fresh: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
  Ripe: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Alert: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-muted">Real-time stock levels and freshness scores</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Freshness</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.name} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 font-medium">{item.name}</td>
                  <td className="px-5 py-4 text-muted">{item.category}</td>
                  <td className="px-5 py-4">{item.stock} units</td>
                  <td className="px-5 py-4">{item.freshness}%</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-border md:hidden">
          {inventory.map((item) => (
            <div key={item.name} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{item.category}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[item.status]}`}>
                  {item.status}
                </span>
              </div>
              <div className="mt-3 flex gap-4 text-sm text-muted">
                <span>{item.stock} units</span>
                <span>{item.freshness}% fresh</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
