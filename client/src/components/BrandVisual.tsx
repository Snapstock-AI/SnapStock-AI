import { cn } from '@/lib/utils'

type BrandVisualProps = {
  className?: string
  quote?: boolean
}

const detections = [
  {
    label: 'Apple',
    status: 'Fresh',
    conf: '94%',
    tone: 'border-[#7dcf8a] bg-[#7dcf8a]/15',
    // Basket of red apples — lower left
    style: { left: '4%', top: '48%', width: '46%', height: '46%' },
    delay: '0.4s',
  },
  {
    label: 'Lettuce',
    status: 'Fresh',
    conf: '91%',
    tone: 'border-[#7dcf8a] bg-[#7dcf8a]/15',
    // Leafy greens — mid/upper right shelf
    style: { left: '48%', top: '12%', width: '48%', height: '42%' },
    delay: '1.0s',
  },
  {
    label: 'Banana',
    status: 'Ripe',
    conf: '88%',
    tone: 'border-[#f4c430] bg-[#f4c430]/15',
    // Banana bunch — lower right
    style: { left: '52%', top: '56%', width: '44%', height: '40%' },
    delay: '1.6s',
  },
]

/** Compact animated live-scan camera feed */
export default function BrandVisual({ className }: BrandVisualProps) {
  const feedSrc = `${import.meta.env.BASE_URL}images/snapstock-hero-shelf.png`

  return (
    <div className={cn('relative flex h-full w-full items-center justify-center', className)}>
      {/* Soft ambient shapes */}
      <div className="pointer-events-none absolute -right-10 top-1/4 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl brand-float dark:bg-brand-500/25" />
      <div className="pointer-events-none absolute -left-8 bottom-1/4 h-44 w-44 rounded-full bg-accent-orange/15 blur-3xl brand-float-delayed" />
      <div className="pointer-events-none absolute right-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-brand-400/70 brand-pulse" />
      <div className="pointer-events-none absolute bottom-[22%] left-[18%] h-2 w-2 rounded-full bg-accent-orange/70 brand-pulse-delayed" />

      {/* Scan window */}
      <div className="brand-device-float relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-border/60 bg-brand-950 shadow-xl shadow-brand-500/20 ring-1 ring-black/5 dark:border-white/10 dark:shadow-brand-900/40">
        <div className="relative aspect-[5/4] overflow-hidden">
          {/* Feed + boxes share the same transform so detections stay locked to produce */}
          <div className="brand-feed-drift absolute inset-0">
            <img
              src={feedSrc}
              alt="Live shelf camera feed"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />

            {detections.map((box) => (
              <div
                key={box.label}
                className={cn(
                  'brand-detect absolute rounded-md border-2 shadow-lg backdrop-blur-[1px]',
                  box.tone,
                )}
                style={{ ...box.style, animationDelay: box.delay }}
              >
                <div className="absolute -top-6 left-0 z-10 flex max-w-[160%] items-center gap-1 truncate rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                  <span>{box.label}</span>
                  <span className="opacity-70">·</span>
                  <span>{box.status}</span>
                  <span className="opacity-80">{box.conf}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

          {/* Viewfinder corners */}
          <span className="absolute left-3 top-3 z-20 h-5 w-5 border-l-2 border-t-2 border-white/90" />
          <span className="absolute right-3 top-3 z-20 h-5 w-5 border-r-2 border-t-2 border-white/90" />
          <span className="absolute bottom-3 left-3 z-20 h-5 w-5 border-b-2 border-l-2 border-white/90" />
          <span className="absolute bottom-3 right-3 z-20 h-5 w-5 border-b-2 border-r-2 border-white/90" />

          {/* Live pill — inset past the corner bracket */}
          <div className="absolute left-10 top-3.5 z-20 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-400" />
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/90">Live</span>
          </div>

          {/* Scan sweep */}
          <div className="brand-scan-line absolute inset-x-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_14px_rgba(255,255,255,0.85)]" />
          <div className="brand-scan-glow pointer-events-none absolute inset-x-0 z-[9] h-16 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </div>
    </div>
  )
}
