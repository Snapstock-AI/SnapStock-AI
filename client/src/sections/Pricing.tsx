import { Link } from 'react-router'
import { Check } from 'lucide-react'

const perks = [
  'Unlimited scans on one storefront',
  'Freshness & inventory dashboard',
  'Low-stock and spoilage alerts',
  'Weekly waste reports',
]

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-border bg-surface-muted/50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">Get started</p>
        <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold md:text-4xl">
          Cut spoilage this week — not next quarter.
        </h2>
        <p className="mt-4 max-w-lg text-muted">
          Free for one storefront, forever. Upgrade when you&apos;re ready to add more stalls,
          staff, or analytics.
        </p>

        <div className="mt-10 max-w-lg rounded-3xl border border-border bg-surface-elevated p-8 shadow-sm">
          <p className="text-sm font-medium text-brand-500">Starter</p>
          <p className="mt-2 font-serif text-4xl font-semibold">
            Free
            <span className="text-base font-normal text-muted"> / forever</span>
          </p>

          <ul className="mt-8 space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="rounded-full bg-brand-500 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Create free account
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-border px-6 py-3 text-center text-sm font-semibold transition hover:bg-surface-muted"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
