import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const perks = [
  'Unlimited scans on one storefront',
  'Freshness & inventory dashboard',
  'Low-stock and spoilage alerts',
  'Weekly waste reports',
]

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-border bg-muted/35 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Get started</p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
          Cut spoilage this week — not next quarter.
        </h2>
        <p className="mt-4 max-w-lg text-muted-foreground">
          Free for one storefront, forever. Upgrade when you&apos;re ready to add more stalls,
          staff, or analytics.
        </p>

        <Card className="mt-10 max-w-lg border-primary/20 shadow-md">
          <CardContent className="p-8">
            <p className="text-sm font-semibold text-primary">Starter</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              Free
              <span className="text-base font-normal text-muted-foreground"> / forever</span>
            </p>

            <ul className="mt-8 space-y-3">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/signup">Create free account</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
