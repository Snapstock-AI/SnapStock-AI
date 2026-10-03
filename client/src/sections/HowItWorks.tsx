import { BlurWords, Container, Reveal, SectionTag } from '@/components/landing/primitives'

const steps = [
  {
    title: 'Create your store account',
    description: 'Sign up free and set up your business profile in just a few minutes.',
  },
  {
    title: 'Add shelves & products',
    description: 'Map your shelves and the produce they hold so every scan lands in the right place.',
  },
  {
    title: 'Scan and get freshness alerts',
    description: 'Photograph a shelf to update stock and freshness, then act on smart alerts.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-paper px-5 py-[60px] md:px-[30px] md:py-20 xl:py-[120px]">
      <Container className="flex flex-col gap-10 md:gap-[46px] xl:gap-[52px]">
        <div className="flex flex-col items-center gap-4 text-center md:gap-5">
          <Reveal>
            <SectionTag>How it works</SectionTag>
          </Reveal>
          <BlurWords
            text="From sign-up to fresher shelves in three steps"
            className="max-w-[625px] text-[36px] leading-[1.2] font-bold text-ink xl:text-[44px] 2xl:text-[52px]"
          />
        </div>

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} as="li" delay={i * 120} className="list-none">
              <div className="flex h-full flex-col gap-[100px] rounded-2xl bg-cream p-5 xl:gap-[179px] xl:rounded-[20px] xl:p-6">
                <p className="font-display text-[28px] leading-[1.2] font-bold tracking-[-0.06em] text-ink md:text-[34px] xl:text-[42px]">
                  Step {String(i + 1).padStart(2, '0')}
                </p>
                <div className="flex flex-col gap-5 rounded-2xl bg-white p-6">
                  <h3 className="text-xl leading-[1.2] font-bold text-ink md:text-[22px] xl:text-2xl">{step.title}</h3>
                  <p className="text-base leading-relaxed text-ink-body">{step.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  )
}
