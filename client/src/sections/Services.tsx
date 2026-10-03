import { useEffect, useRef, useState } from 'react'
import { BlurWords, Reveal, SectionTag } from '@/components/landing/primitives'
import { cn } from '@/lib/utils'

const services = [
  {
    title: 'Inventory tracking',
    description: 'Live stock levels for every shelf and product, updated automatically after each scan.',
    background: '/images/landing/service-1.webp',
    image: '/images/landing/gallery-4.webp',
    alt: 'Stocked supermarket shelves with fresh fruit',
  },
  {
    title: 'AI freshness detection',
    description: 'A vision model trained on 138k+ produce images grades items as Fresh, Ripe or Spoiled.',
    background: '/images/landing/service-2.webp',
    image: '/images/landing/gallery-2.webp',
    alt: 'Fresh tropical fruit cut open',
  },
  {
    title: 'Spoilage & low-stock alerts',
    description: 'Get notified the moment a batch is nearing spoilage or a shelf drops below its threshold.',
    background: '/images/landing/service-3.webp',
    image: '/images/landing/gallery-1.webp',
    alt: 'Market stall full of fruit and vegetables',
  },
  {
    title: 'Analytics & insights',
    description: 'See which products spoil fastest, freshness trends over time and where waste eats your margin.',
    background: '/images/landing/service-4.webp',
    image: '/images/landing/feature.webp',
    alt: 'Vegetables displayed in baskets at a grocery store',
  },
  {
    title: 'Team & multi-store',
    description: 'Invite staff with role-based access and manage several stores from one dashboard.',
    background: '/images/landing/service-5.webp',
    image: '/images/landing/solution-alerts.webp',
    alt: 'Shop owner serving a customer at the counter',
  },
]

const pad = (n: number) => String(n).padStart(2, '0')

function ServiceCard({ service }: { service: (typeof services)[number] }) {
  return (
    <div className="flex w-full flex-col gap-6 rounded-[20px] bg-cream p-3 pb-6">
      <img
        src={service.image}
        alt={service.alt}
        loading="lazy"
        className="aspect-[1.7] w-full rounded-[14px] object-cover md:aspect-auto md:h-[clamp(180px,32vh,330px)]"
      />
      <div className="flex flex-col items-center gap-4 px-3 text-center">
        <h3 className="text-[26px] leading-[1.2] font-bold text-ink md:text-[30px] xl:text-[32px]">{service.title}</h3>
        <p className="max-w-[460px] text-lg leading-relaxed text-ink-body">{service.description}</p>
      </div>
    </div>
  )
}

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = sectionRef.current
      if (!el) return
      const progress = -el.getBoundingClientRect().top / window.innerHeight
      setActive(Math.min(services.length - 1, Math.max(0, Math.round(progress))))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <section id="services" ref={sectionRef} className="relative bg-cream">
      {/* Phone: simple stacked list */}
      <div className="flex flex-col gap-8 px-5 py-[60px] md:hidden">
        <div className="flex flex-col items-center gap-4 text-center">
          <SectionTag>Our services</SectionTag>
          <BlurWords
            text="Everything you need to run a fresher store"
            className="text-[36px] leading-[1.2] font-bold text-ink"
          />
        </div>
        {services.map((service) => (
          <Reveal key={service.title}>
            <ServiceCard service={service} />
          </Reveal>
        ))}
      </div>

      {/* Tablet & desktop: sticky scroll-driven slides */}
      <div className="hidden md:block">
        <div className="sticky top-0 z-10 h-screen overflow-hidden">
          {services.map((service, i) => (
            <div
              key={service.title}
              aria-hidden={i !== active}
              className={cn(
                'absolute inset-0 flex items-center justify-center px-[30px] py-16 transition-opacity duration-700',
                i === active ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <img src={service.background} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/70" aria-hidden="true" />

              <div className="relative flex h-full w-full max-w-[655px] flex-col items-center justify-center gap-10 xl:gap-[52px]">
                <div className="flex flex-col items-center gap-2.5 text-center">
                  <SectionTag tone="light">Our services</SectionTag>
                  <h2 className="max-w-[625px] text-[36px] leading-[1.2] font-bold text-white xl:text-[44px] 2xl:text-[52px]">
                    Everything you need to run a fresher store
                  </h2>
                </div>
                <div
                  className={cn(
                    'w-full transition-all duration-700',
                    i === active ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0',
                  )}
                >
                  <ServiceCard service={service} />
                </div>

                <div className="flex flex-col items-center gap-2 text-lg font-semibold text-white xl:absolute xl:right-[-178px] xl:bottom-16 xl:items-start">
                  <p>
                    {pad(i + 1)}/<span className="opacity-70">{pad(services.length)}</span>
                  </p>
                  <p>[ Keep scrolling ]</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Scroll triggers: one viewport per extra slide */}
        {services.slice(1).map((service) => (
          <div key={service.title} className="h-screen" aria-hidden="true" />
        ))}
      </div>
    </section>
  )
}
