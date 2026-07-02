import { useTheme } from '@/hooks/use-theme'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your storefront and preferences</p>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <h2 className="font-medium">Store profile</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-muted">Shop name</label>
              <input
                defaultValue="Priya's Fresh Mart"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Email</label>
              <input
                defaultValue="priya@freshmart.com"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <h2 className="font-medium">Appearance</h2>
          <div className="mt-4 flex gap-3">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition ${
                  theme === t
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'border-border hover:bg-surface-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <h2 className="font-medium">Alert thresholds</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-muted">Low stock threshold</label>
              <input
                type="number"
                defaultValue={25}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Freshness alert below</label>
              <input
                type="number"
                defaultValue={65}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
