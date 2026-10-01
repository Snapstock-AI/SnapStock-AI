import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import LogoMark from '@/components/LogoMark'

type LogoProps = {
  className?: string
  showText?: boolean
  /** default = theme foreground, light = white (dark photos), ink = landing ink */
  variant?: 'default' | 'light' | 'ink'
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
      <LogoMark />
      {showText && (
        <span
          className={cn(
            'flex items-center gap-1.5 font-display text-xl font-bold tracking-[-0.04em]',
            variant === 'light' ? 'text-white' : variant === 'ink' ? 'text-ink' : 'text-fd-ink',
          )}
        >
          SnapStock
          <span className="rounded-md bg-lime px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-normal text-ink">
            AI
          </span>
        </span>
      )}
    </>
  )

  if (className?.includes('no-link')) {
    return <div className={cn('flex items-center gap-2.5', className)}>{content}</div>
  }

  return (
    <Link
      to={href}
      viewTransition
      aria-label="SnapStock-AI home"
      className={cn('flex items-center gap-2.5', className)}
    >
      {content}
    </Link>
  )
}
