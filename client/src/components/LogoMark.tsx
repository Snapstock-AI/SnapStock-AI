import { cn } from '@/lib/utils'

type LogoMarkProps = {
  className?: string
}

/** SnapStock mark: a fresh leaf framed by camera viewfinder corners, on a lime disc. */
export default function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={cn('h-9 w-9 shrink-0', className)}
    >
      <rect width="44" height="44" rx="22" fill="#E7F352" />
      <path
        d="M11.5 16.5v-3a2 2 0 0 1 2-2h3M27.5 11.5h3a2 2 0 0 1 2 2v3M32.5 27.5v3a2 2 0 0 1-2 2h-3M16.5 32.5h-3a2 2 0 0 1-2-2v-3"
        stroke="#04303B"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28.6 15.2c-7.4-.4-12.9 3.8-13.1 10.4-.05 1.5.25 2.9.8 4.1 1.1-4.4 4.1-7.8 8.5-9.8-3.5 2.6-5.8 6.2-6.6 10.4 1.1.5 2.3.7 3.6.7 6.6-.1 9.8-6.2 6.8-15.8Z"
        fill="#04303B"
      />
    </svg>
  )
}
