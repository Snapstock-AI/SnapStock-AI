import { Layers, Timer } from 'lucide-react'
import { BlurWords, Container, Reveal, SectionTag } from '@/components/landing/primitives'

const highlights = [
  {
    icon: Layers,
    value: '3 tiers',
    text: 'Freshness grading that flags produce as it ripens, so you can discount or rotate stock before it spoils.',
  },
  {
    icon: Timer,
    value: '< 2s',
    text: 'Scan a whole shelf faster than counting it by hand, and keep stock levels accurate every day.',
  },
]

export default function Features() {
  return (
    <section id="features" className="bg-cream px-5 pt-[30px] pb-[60px] md:px-[30px] md:py-20 xl:py-[120px]">
      <Container className="flex flex-col gap-10 md:gap-[46px] xl:flex-row xl:items-start xl:gap-12">
        <div className="flex w-full flex-col gap-10 md:gap-[46px] xl:max-w-[599px] xl:gap-[60px]">
          <div className="flex flex-col gap-4 md:gap-5">
            <Reveal>
              <SectionTag>Features</SectionTag>
            </Reveal>
            <BlurWords
              text="Reduce waste, protect your margins"
              className="text-[36px] leading-[1.2] font-bold text-ink md:max-w-[550px] xl:text-[44px] 2xl:text-[52px]"
            />
            <Reveal as="p" className="text-lg leading-relaxed text-ink-body md:max-w-[550px]">
              SnapStock-AI helps shop owners adopt smart, data-driven habits that keep produce fresher,
              shelves fuller and money out of the bin.
            </Reveal>
          </div>

          <Reveal className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {highlights.map(({ icon: Icon, value, text }) => (
              <div key={value} className="flex flex-col items-start gap-5">
                <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-lime text-ink">
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-4">
                  <p className="font-display text-[26px] leading-[1.2] font-bold tracking-[-0.06em] text-ink md:text-[32px]">
                    {value}
                  </p>
                  <p className="text-base leading-relaxed text-ink-body">{text}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>

        <Reveal className="w-full xl:flex-1 xl:self-stretch">
          <img
            src="/images/landing/feature.webp"
            alt="Fresh vegetables displayed in baskets at a grocery store"
            loading="lazy"
            className="aspect-[1.25] h-full w-full rounded-[20px] object-cover md:aspect-auto md:h-[520px] xl:h-full xl:min-h-[520px]"
          />
        </Reveal>
      </Container>
    </section>
  )
}
