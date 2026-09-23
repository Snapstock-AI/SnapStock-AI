import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/15 text-destructive dark:bg-destructive/25',
        outline: 'border-border bg-transparent text-foreground',
        success: 'border-transparent bg-primary/12 text-primary dark:bg-primary/20',
        warning: 'border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300',
        info: 'border-transparent bg-sky-500/15 text-sky-800 dark:text-sky-300',
        ripe: 'border-transparent bg-ripe/15 text-ripe-foreground dark:text-ripe',
        spoiled: 'border-transparent bg-spoiled/15 text-spoiled',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
