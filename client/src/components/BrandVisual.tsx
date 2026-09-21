import { cn } from '@/lib/utils'

type BrandVisualProps = {
  className?: string
  quote?: boolean
}

const detections = [
  {
    label: 'Tomato',
    status: 'Fresh',
    conf: '94%',
    tone: 'border-[#7dcf8a] bg-[#7dcf8a]/15 text-[#d8ffe0]',
    style: { left: '8%', top: '18%', width: '28%', height: '42%' },
  },
  {
    label: 'Banana',
    status: 'Ripe',
    conf: '88%',
    tone: 'border-[#f4c430] bg-[#f4c430]/15 text-[#fff3c4]',
    style: { left: '42%', top: '28%', width: '24%', height: '38%' },
  },
  {
    label: 'Apple',
    status: 'Spoiled',
    conf: '81%',
    tone: 'border-[#e85d4c] bg-[#e85d4c]/15 text-[#ffd0cb]',
    style: { left: '68%', top: '14%', width: '24%', height: '48%' },
  },
]

/** Creative brand panel with a realistic live-scan camera feed */
export default function BrandVisual({ className, quote = false }: BrandVisualProps) {
  const feedSrc = `${import.meta.env.BASE_URL}images/snapstock-hero-shelf.png`

  return (
    <div
      className={cn(
        'relative isolate h-full min-h-[420px] overflow-hidden rounded-[2rem] border border-primary/10 bg-gradient-to-br from-brand-700 via-brand-500 to-brand-400',
        className,
      )}
    >
      <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl brand-float" />
      <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-brand-900/30 blur-3xl brand-float-delayed" />

      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
        <defs>
          <pattern id="brand-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#brand-grid)" />
      </svg>

      {/* Live camera / scan device */}
      <div className="absolute inset-x-6 top-[12%] mx-auto max-w-md md:inset-x-10">
        <div className="rounded-[1.35rem] border border-white/30 bg-brand-950/40 p-2.5 shadow-2xl backdrop-blur-md">
          {/* Device chrome */}
          <div className="mb-2 flex items-center justify-between px-1.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#e85d4c]" />
              <span className="h-2 w-2 rounded-full bg-[#f4c430]" />
              <span className="h-2 w-2 rounded-full bg-[#7dcf8a]" />
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
              </span>
              Live
            </div>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white">
              YOLO · CNN
            </span>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-white/25">
            <img
              src={feedSrc}
              alt="Live shelf camera feed"
              className="h-full w-full scale-105 object-cover"
            />
            {/* Subtle vignette + contrast so overlays read clearly */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />

            {/* Viewfinder corners */}
            <span className="absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-white/90" />
            <span className="absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-white/90" />
            <span className="absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-white/90" />
            <span className="absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-white/90" />

            {/* Realistic detection boxes */}
            {detections.map((box) => (
              <div
                key={box.label}
                className={cn('absolute rounded-md border-2 shadow-lg backdrop-blur-[1px]', box.tone)}
                style={box.style}
              >
                <div className="absolute -top-6 left-0 flex max-w-[140%] items-center gap-1 truncate rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                  <span>{box.label}</span>
                  <span className="opacity-70">·</span>
                  <span>{box.status}</span>
                  <span className="opacity-80">{box.conf}</span>
                </div>
              </div>
            ))}

            {/* Scan sweep */}
            <div className="brand-scan-line absolute inset-x-0 z-10 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,0.8)]" />

            {/* HUD footer */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8 text-[10px] text-white/85">
              <span>Shelf B · Produce aisle</span>
              <span className="font-semibold tabular-nums">24 fps · 1.8s</span>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2 px-0.5">
            <span className="rounded-full bg-[#7dcf8a]/25 px-2.5 py-1 text-xs font-medium text-white">
              Fresh · 42
            </span>
            <span className="rounded-full bg-[#f4c430]/25 px-2.5 py-1 text-xs font-medium text-white">
              Ripe · 11
            </span>
            <span className="rounded-full bg-[#e85d4c]/25 px-2.5 py-1 text-xs font-medium text-white">
              Spoiled · 3
            </span>
          </div>
        </div>
      </div>

      {quote ? (
        <div className="absolute inset-x-8 bottom-8 rounded-2xl border border-white/20 bg-brand-900/40 p-5 backdrop-blur-md md:inset-x-12">
          <p className="text-sm leading-relaxed text-white/95 md:text-base">
            &ldquo;We cut fruit waste by nearly a third in the first month. My phone does the
            audits now — I run the shop.&rdquo;
          </p>
          <p className="mt-2 text-xs text-white/70">— Priya R., grocer in Pune</p>
        </div>
      ) : (
        <div className="absolute inset-x-8 bottom-8 flex items-center gap-3 rounded-2xl border border-white/20 bg-brand-900/35 px-4 py-3 backdrop-blur-md md:inset-x-12">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white">
            84
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Shelf B · Tomatoes</p>
            <p className="text-xs text-white/70">Freshness score updated in &lt; 2s</p>
          </div>
        </div>
      )}
    </div>
  )
}
