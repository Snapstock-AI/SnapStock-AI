import { Fragment } from 'react'
import { BlurWords, Container, Reveal, SectionTag } from '@/components/landing/primitives'

const stats = [
  { value: '138k+', label: 'Training images' },
  { value: '3-tier', label: 'Freshness scoring' },
  { value: '< 2s', label: 'Per shelf scan' },
  { value: '24/7', label: 'Spoilage alerts' },
]

export default function About() {
  return (
    <section id="about" className="bg-cream px-5 py-[60px] md:px-[30px] md:py-20 xl:py-[120px]">
      <Container className="flex flex-col gap-10 md:gap-[46px] xl:gap-20">
        <Reveal className="flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-start xl:justify-between">
          <SectionTag>About us</SectionTag>
          <BlurWords
            text="Helping small retailers cut waste and keep every shelf fresh with AI they can run from a phone"
            className="max-w-[636px] text-[36px] leading-[1.2] font-bold text-ink xl:text-[44px] 2xl:text-[52px]"
          />
        </Reveal>

        <Reveal className="flex flex-wrap items-center justify-start gap-x-8 gap-y-5 md:justify-between">
          {stats.map((stat, i) => (
            <Fragment key={stat.label}>
              <div className="flex min-w-[130px] flex-col gap-2">
                <p className="font-display text-[28px] leading-[1.2] font-bold tracking-[-0.06em] text-ink md:text-[34px] xl:text-[42px]">
                  {stat.value}
                </p>
                <p className="text-base text-ink">{stat.label}</p>
              </div>
              {i < stats.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden h-[86px] w-px bg-gradient-to-b from-ink/10 via-ink to-ink/10 md:block"
                />
              )}
            </Fragment>
          ))}
        </Reveal>
      </Container>
    </section>
  )
}
