import { useId, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { BlurWords, Container, Reveal, SectionTag } from '@/components/landing/primitives'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'What is SnapStock-AI?',
    a: 'SnapStock-AI is an AI-powered inventory and freshness monitoring system for small-scale retailers. Photograph a shelf and it counts your stock, grades produce freshness and alerts you before items spoil.',
  },
  {
    q: 'Which products can it grade?',
    a: 'The freshness model is trained on fresh produce such as apples, bananas, oranges, lemons and common vegetables, and grades each item as Fresh, Ripe or Spoiled.',
  },
  {
    q: 'Do I need special hardware?',
    a: 'No. Any smartphone or laptop camera works. You can scan live with the camera or upload a photo of the shelf.',
  },
  {
    q: 'Can my staff use it too?',
    a: 'Yes. Owners can invite employees to their store. Staff can scan and manage stock, while owner-only areas such as analytics and team management stay protected.',
  },
  {
    q: 'Is my store data private?',
    a: 'Your shelf images and inventory data belong to your business and are only used to run your SnapStock-AI workspace.',
  },
  {
    q: 'How do I get started?',
    a: 'Create a free account, set up your business and shelves, then run your first scan. It only takes a few minutes.',
  },
]

export default function Faq() {
  const [open, setOpen] = useState(0)
  const baseId = useId()

  return (
    <section id="faq" className="bg-white px-5 py-[60px] md:px-[30px] md:py-20 xl:py-[120px]">
      <Container className="flex flex-col items-center gap-10 md:gap-[46px] xl:gap-[52px]">
        <div className="flex flex-col items-center gap-4 text-center md:gap-5">
          <Reveal>
            <SectionTag>FAQs</SectionTag>
          </Reveal>
          <BlurWords
            text="Got questions? We've got answers"
            className="max-w-[480px] text-[36px] leading-[1.2] font-bold text-ink xl:text-[44px] 2xl:text-[52px]"
          />
        </div>

        <Reveal className="flex w-full flex-col gap-8 xl:flex-row xl:items-stretch xl:justify-center xl:gap-6">
          <div className="flex w-full flex-col gap-2 xl:max-w-[648px] xl:flex-1">
            {faqs.map((item, i) => {
              const isOpen = open === i
              const panelId = `${baseId}-panel-${i}`
              const buttonId = `${baseId}-button-${i}`
              return (
                <div
                  key={item.q}
                  className={cn(
                    'rounded-xl border border-ink/10 transition-colors',
                    isOpen ? 'bg-cream' : 'bg-white',
                  )}
                >
                  <h3 className="text-xl font-semibold">
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      className="flex w-full items-start gap-6 px-5 py-5 text-left leading-[1.6] tracking-[-0.02em] text-ink md:px-8 md:py-6"
                    >
                      <span className="flex-1">{item.q}</span>
                      <ChevronUp
                        aria-hidden="true"
                        className={cn('mt-1.5 h-5 w-5 shrink-0 transition-transform duration-300', !isOpen && 'rotate-180')}
                      />
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!isOpen}
                    className="mx-5 border-t border-ink/15 pt-5 pb-6 md:mx-8"
                  >
                    <p className="text-base leading-relaxed text-ink">{item.a}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <img
            src="/images/landing/faq.webp"
            alt="Assortment of fresh fruit"
            loading="lazy"
            className="aspect-square w-full rounded-[20px] object-cover xl:aspect-auto xl:max-w-[648px] xl:flex-1"
          />
        </Reveal>
      </Container>
    </section>
  )
}
