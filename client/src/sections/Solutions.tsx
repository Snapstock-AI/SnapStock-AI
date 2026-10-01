import { BlurWords, Container, PillLink, Reveal, SectionTag } from '@/components/landing/primitives'
import { cn } from '@/lib/utils'

const solutions = [
  {
    title: 'Shelf scanning',
    description: 'Snap a shelf with any phone camera and get item counts back in seconds, with no barcodes or scales.',
    tags: ['Camera AI', 'Auto counts'],
    image: '/images/landing/solution-scan.webp',
    alt: 'Grocery shelves stocked with vegetables',
    height: 'xl:min-h-[380px]',
  },
  {
    title: 'Freshness grading',
    description: 'Every item is graded Fresh, Ripe or Spoiled so you can act before produce goes to waste.',
    tags: ['3-tier scoring', 'Expiry risk'],
    image: '/images/landing/solution-fresh.webp',
    alt: 'Colourful fresh fruit and vegetables',
    height: 'xl:min-h-[430px]',
  },
  {
    title: 'Smart alerts',
    description: 'Low-stock and spoilage alerts reach the right person on your team the moment they matter.',
    tags: ['Low stock', 'Spoilage'],
    image: '/images/landing/solution-alerts.webp',
    alt: 'Shop owner serving a customer at the counter',
    height: 'xl:min-h-[720px]',
  },
]

export default function Solutions() {
  return (
    <section id="solutions" className="bg-paper px-5 py-[60px] md:px-[30px] md:py-20 xl:py-[120px]">
      <Container className="relative flex flex-col gap-10 md:gap-[46px] xl:gap-20">
        <div className="z-10 flex w-full flex-col items-start gap-6 xl:absolute xl:top-0 xl:left-0 xl:w-[47%] xl:gap-[30px]">
          <div className="flex flex-col gap-4 md:gap-5">
            <Reveal>
              <SectionTag>Our solutions</SectionTag>
            </Reveal>
            <BlurWords
              text="One platform, complete inventory control"
              className="max-w-[485px] text-[36px] leading-[1.2] font-bold text-ink xl:text-[44px] 2xl:text-[52px]"
            />
          </div>
          <Reveal>
            <PillLink to="/signup">Create free account</PillLink>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:flex xl:items-end">
          {solutions.map((item, i) => (
            <Reveal key={item.title} variant="tilt" delay={i * 120} className="xl:flex-1">
              <article
                className={cn(
                  'relative flex min-h-[340px] flex-col overflow-hidden rounded-[20px] bg-paper p-5 md:min-h-[400px] md:p-6',
                  item.height,
                )}
              >
                <img src={item.image} alt={item.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(180deg,#000_17%,rgba(4,48,59,0)_100%)]"
                />
                <div className="relative flex flex-col gap-5">
                  <h3 className="text-[26px] leading-[1.2] font-bold text-white md:text-[30px] xl:text-[32px]">
                    {item.title}
                  </h3>
                  <p className="text-base leading-relaxed text-cream">{item.description}</p>
                  <ul className="flex flex-wrap gap-x-[13px] gap-y-2.5">
                    {item.tags.map((tag) => (
                      <li key={tag} className="rounded-[20px] bg-cream px-4 py-1 text-xs font-semibold text-ink">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
