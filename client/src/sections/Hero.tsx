import { Link } from 'react-router'
import { ArrowRight, Bell, Sparkles } from 'lucide-react'

export default function Hero() {
  return (
    <section id="overview" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-2 md:items-center md:gap-12 md:px-6 md:py-20 lg:py-28">
        <div>
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-600 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            Built for small-scale retailers
          </span>

          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight md:text-5xl lg:text-[3.5rem]">
            Every shelf,{' '}
            <em className="not-italic text-brand-500">counted.</em>
            <br />
            Every fruit,{' '}
            <em className="not-italic text-accent-orange">graded.</em>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted md:text-lg">
            FreshTrack turns a smartphone camera into a real-time inventory and freshness
            auditor. No hardware. No barcodes. Just point, scan, and stop losing produce to
            spoilage.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-border px-7 py-3.5 text-sm font-semibold transition hover:bg-surface-muted"
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-8">
            {[
              { value: '138k+', label: 'training images' },
              { value: '3-tier', label: 'freshness scoring' },
              { value: '< 2s', label: 'per shelf scan' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-serif text-xl font-semibold md:text-2xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted md:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none">
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80&auto=format&fit=crop"
              alt="Fresh produce on a shelf"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>

          <div className="absolute bottom-16 left-4 right-4 rounded-2xl border border-white/20 bg-surface-elevated/95 p-4 shadow-xl backdrop-blur-md dark:bg-surface-elevated/90">
            <div className="mb-2 flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                Shelf B · Tomatoes
              </p>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                Fresh
              </span>
            </div>
            <p className="font-serif text-2xl font-semibold">
              Freshness score: <span className="text-brand-500">84</span>
            </p>
            <div className="mt-3 flex gap-2">
              {[
                { label: 'Fresh · 42', color: 'bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300' },
                { label: 'Ripe · 11', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
                { label: 'Spoiled · 3', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
              ].map((chip) => (
                <span key={chip.label} className={`rounded-lg px-2 py-1 text-[10px] font-medium ${chip.color}`}>
                  {chip.label}
                </span>
              ))}
            </div>
          </div>

          <div className="absolute -bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2.5 text-xs shadow-lg md:-bottom-6">
            <Bell className="h-3.5 w-3.5 text-accent-orange" />
            <span>Bananas nearing spoilage — 6 units</span>
          </div>
        </div>
      </div>
    </section>
  )
}
