import { Link } from 'react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import BrandVisual from '@/components/BrandVisual'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function Hero() {
  return (
    <section id="overview" className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block">
        <div className="absolute inset-0 bg-gradient-to-l from-brand-50 via-brand-50/70 to-transparent dark:from-brand-900/25 dark:via-brand-900/10 dark:to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:gap-12 md:px-6 md:py-20 lg:grid-cols-2 lg:py-24">
        <div className="relative z-10">
          <Badge variant="success" className="mb-6 w-fit gap-2 px-3.5 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Built for small-scale retailers
          </Badge>

          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-[3.4rem]">
            Every shelf, <span className="text-primary">counted.</span>
            <br />
            Every fruit, <span className="text-accent-orange">graded.</span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
            SnapStock-AI turns a smartphone camera into a real-time inventory and freshness auditor.
            No hardware. No barcodes. Just point, scan, and stop losing produce to spoilage.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link to="/signup">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-border/80 pt-8">
            {[
              { value: '138k+', label: 'training images' },
              { value: '3-tier', label: 'freshness scoring' },
              { value: '< 2s', label: 'per shelf scan' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-xl font-semibold tracking-tight md:text-2xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md lg:max-w-none lg:py-4">
          <BrandVisual className="min-h-[420px]" />
        </div>
      </div>
    </section>
  )
}
