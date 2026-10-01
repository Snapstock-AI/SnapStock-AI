import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SectionStat = {
  label: string
  value: string
  icon: LucideIcon
  /** Short pill shown top-right, e.g. "Live" or "Needs action". */
  badge?: { text: string; tone?: 'good' | 'warn' | 'neutral' }
  headline: string
  detail: string
}

const badgeTone = {
  good: 'border-primary/30 text-primary',
  warn: 'border-spoiled/40 text-spoiled',
  neutral: 'border-border text-muted-foreground',
}

/** KPI row in the style of the shadcn dashboard-01 block. */
export default function SectionCards({ stats }: { stats: SectionStat[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, badge, headline, detail }) => (
        <Card
          key={label}
          className="@container/card flex flex-col gap-6 bg-gradient-to-t from-primary/5 to-card p-6 dark:bg-card dark:from-transparent"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="truncate text-sm text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-card-foreground @[250px]/card:text-3xl md:text-3xl">
                {value}
              </p>
            </div>
            {badge ? (
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
                  badgeTone[badge.tone ?? 'neutral'],
                )}
              >
                {badge.text}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p className="flex items-center gap-2 font-medium text-card-foreground">
              {headline}
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </p>
            <p className="text-muted-foreground">{detail}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}
