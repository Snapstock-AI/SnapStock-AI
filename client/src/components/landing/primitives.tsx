import type { ElementType, ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInView } from '@/hooks/useInView'

type RevealProps = {
  children: ReactNode
  className?: string
  /** "tilt" reproduces the template's rotateX card entrance. */
  variant?: 'up' | 'tilt'
  delay?: number
  as?: ElementType
}

export function Reveal({ children, className, variant = 'up', delay = 0, as: Tag = 'div' }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <Tag
      ref={ref}
      data-inview={inView}
      className={cn(variant === 'tilt' ? 'reveal-tilt' : 'reveal', className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}

type BlurWordsProps = {
  text: string
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

/** Heading whose words blur in one after another as it scrolls into view. */
export function BlurWords({ text, as: Tag = 'h2', className }: BlurWordsProps) {
  const { ref, inView } = useInView<HTMLHeadingElement>()
  const words = text.split(' ')
  return (
    <Tag ref={ref} data-inview={inView} className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className="blur-word"
          style={{ transitionDelay: `${i * 70}ms` }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}

type SectionTagProps = {
  children: ReactNode
  tone?: 'dark' | 'light'
  className?: string
}

/** Small "• About us" style eyebrow used above section headings. */
export function SectionTag({ children, tone = 'dark', className }: SectionTagProps) {
  return (
    <p
      className={cn(
        'flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]',
        tone === 'light' ? 'text-white' : 'text-ink',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-2 w-2 rounded-full', tone === 'light' ? 'bg-lime' : 'bg-ink')}
      />
      {children}
    </p>
  )
}

type PillLinkProps = {
  to: string
  children: ReactNode
  className?: string
  onClick?: () => void
}

/** Lime pill CTA with the template's sliding arrow on hover. */
export function PillLink({ to, children, className, onClick }: PillLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'group inline-flex min-h-11 items-center gap-2.5 rounded-full bg-lime px-5 py-2.5 text-base font-semibold text-ink transition-colors hover:bg-[#d9e63e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2',
        className,
      )}
    >
      {children}
      <span className="relative flex h-4 w-4 overflow-hidden" aria-hidden="true">
        <ArrowRight className="absolute h-4 w-4 transition-transform duration-300 group-hover:translate-x-5" />
        <ArrowRight className="absolute h-4 w-4 -translate-x-5 transition-transform duration-300 group-hover:translate-x-0" />
      </span>
    </Link>
  )
}

/** Shared section container (max width 1320 like the template). */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1320px]', className)}>{children}</div>
}
