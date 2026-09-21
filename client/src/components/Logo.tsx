import { Leaf } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

type LogoProps = {
  className?: string
  showText?: boolean
  variant?: 'default' | 'light'
}

export default function Logo({ className, showText = true, variant = 'default' }: LogoProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          variant === 'light' ? 'bg-white/20 text-white' : 'bg-primary text-primary-foreground',
        )}
      >
        <Leaf className="h-4 w-4" />
      </span>
      {showText && (
        <span
          className={cn(
            'text-xl font-semibold tracking-tight',
            variant === 'light' ? 'text-white' : 'text-foreground',
          )}
        >
          SnapStock-AI
        </span>
      )}
    </>
  )

  if (className?.includes('no-link')) {
    return <div className={cn('flex items-center gap-2.5', className)}>{content}</div>
  }

  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)}>
      {content}
    </Link>
  )
}
