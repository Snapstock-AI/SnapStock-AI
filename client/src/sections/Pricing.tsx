import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { BlurWords, Container, PillLink, Reveal, SectionTag } from '@/components/landing/primitives'

const perks = [
  'Unlimited scans on one storefront',
  'Freshness & inventory dashboard',
  'Low-stock and spoilage alerts',
  'Staff invitations with role-based access',
]

export default function Pricing() {
  return (
    <section id="pricing" className="bg-paper px-5 pt-[60px] pb-[60px] md:px-[30px] md:pt-20 md:pb-[120px] xl:pt-[120px] xl:pb-[160px]">
      <Container className="flex flex-col gap-10 md:gap-[46px] xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-4 md:gap-5 xl:max-w-[529px]">
          <Reveal>
            <SectionTag>Pricing</SectionTag>
          </Reveal>
          <BlurWords
            text="Cut spoilage this week, not next quarter"
            className="text-[36px] leading-[1.2] font-bold text-ink xl:text-[44px] 2xl:text-[52px]"
          />
          <Reveal as="p" className="max-w-[465px] text-lg leading-relaxed text-ink-body">
            Free for one storefront, forever. Upgrade when you&apos;re ready to add more stores, staff or
            analytics.
          </Reveal>
        </div>

        <Reveal variant="tilt" className="w-full xl:max-w-[648px]">
          <div className="flex flex-col gap-8 rounded-[20px] bg-white p-6 md:flex-row md:p-8">
            <div className="flex flex-col gap-2 md:w-[40%]">
              <p className="text-lg font-semibold text-ink">Starter</p>
              <p className="font-display text-5xl font-bold tracking-[-0.06em] text-ink">
                Free
                <span className="ml-1 text-base font-normal tracking-normal text-ink-body">/ forever</span>
              </p>
              <p className="mt-2 text-sm text-ink-body">No credit card required.</p>
            </div>
            <div className="flex flex-1 flex-col gap-6">
              <ul className="flex flex-col gap-3">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-base text-ink">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lime">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-4">
                <PillLink to="/signup">Create free account</PillLink>
                <Link to="/login" className="text-base font-semibold text-ink underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}
