import { Leaf } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

type LogoProps = {
  className?: string
  showText?: boolean
  variant?: 'default' | 'light'
  /** Override destination. Defaults to dashboard when signed in, else landing. */
  to?: string
}

export default function Logo({
  className,
  showText = true,
  variant = 'default',
  to,
}: LogoProps) {
  const { isAuthenticated } = useAuth()
  const href = to ?? (isAuthenticated ? '/dashboard' : '/')

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
            variant === 'light' ? 'text-white' : 'text-fd-ink',
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
    <Link to={href} viewTransition className={cn('flex items-center gap-2.5', className)}>
      {content}
    </Link>
  )
}
