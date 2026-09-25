import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('border-2 border-dashed border-border/80 bg-card', className)}>
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
        <h3 className="text-base font-semibold text-fd-ink">{title}</h3>
        {description ? <p className="mt-1 max-w-sm text-sm text-fd-body">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
