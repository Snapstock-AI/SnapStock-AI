import { Camera, Upload } from 'lucide-react'

const scanHistory = [
  { id: 1, shelf: 'Shelf A · Bananas', time: 'Today, 9:14 AM', score: 71, items: 41 },
  { id: 2, shelf: 'Shelf B · Tomatoes', time: 'Today, 8:02 AM', score: 84, items: 56 },
  { id: 3, shelf: 'Shelf C · Apples', time: 'Yesterday, 5:45 PM', score: 62, items: 31 },
]

export default function ScansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Shelf scans</h1>
        <p className="mt-1 text-sm text-muted">Capture and review AI-powered produce inspections</p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-8 text-center dark:border-brand-800 dark:bg-brand-900/20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
          <Camera className="h-8 w-8 text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="mt-4 font-serif text-xl font-semibold">Scan a shelf</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          Use your phone camera to capture produce. Our AI will count items and grade freshness.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Camera className="h-4 w-4" />
            Open camera
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:bg-surface-muted"
          >
            <Upload className="h-4 w-4" />
            Upload photo
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-serif text-lg font-semibold">Scan history</h2>
        <div className="space-y-3">
          {scanHistory.map((scan) => (
            <div
              key={scan.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface-elevated p-4"
            >
              <div>
                <p className="font-medium">{scan.shelf}</p>
                <p className="text-xs text-muted">{scan.time}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-lg font-semibold text-brand-500">{scan.score}</p>
                <p className="text-xs text-muted">{scan.items} items</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
