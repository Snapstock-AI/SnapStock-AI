import { Container, PillLink } from '@/components/landing/primitives'

export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] items-center overflow-hidden px-5 pt-[120px] pb-[60px] md:px-[30px] md:pt-[140px] xl:h-screen xl:pt-[184px]"
    >
      <div className="landing-hero-zoom absolute inset-0 z-0">
        <img
          src="/images/landing/hero-aisle.webp"
          alt=""
          className="h-full w-full object-cover"
          fetchPriority="high"
        />
      </div>
      <div className="absolute inset-0 z-0 bg-black/[0.73]" aria-hidden="true" />

      <Container className="relative z-10 flex flex-col gap-20 xl:gap-32">
        <div className="flex flex-col items-start gap-3">
          <p
            className="landing-appear landing-glass rounded-full border border-white/15 px-3 py-[5px] text-sm font-medium text-cream"
          >
            AI-powered inventory &amp; freshness
          </p>
          <h1
            className="landing-appear max-w-[630px] text-[38px] leading-[1.15] font-bold text-white [text-wrap:balance] md:text-5xl xl:text-[62px]"
            style={{ animationDelay: '100ms' }}
          >
            Smarter Stock for Fresher Shelves
          </h1>
        </div>

        <div className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div
            className="landing-appear landing-glass w-full rounded-2xl border border-white/15 bg-white/10 p-2.5 md:max-w-[238px]"
            style={{ animationDelay: '200ms' }}
          >
            <img
              src="/images/landing/scan-card.webp"
              alt="Produce shelves ready for a freshness scan"
              className="h-[130px] w-full rounded-[14px] object-cover"
            />
            <div className="mt-2.5 flex flex-col gap-1.5">
              <p className="text-lg font-semibold text-white">Shelf scan in action</p>
              <p className="text-sm text-cream">Real-time freshness grading in under 2 seconds.</p>
            </div>
          </div>

          <div
            className="landing-appear flex w-full max-w-[350px] flex-col items-start gap-6"
            style={{ animationDelay: '300ms' }}
          >
            <p className="text-lg leading-relaxed text-paper">
              SnapStock-AI counts your stock and grades produce freshness from a single phone photo, so
              small retailers waste less and never miss a spoiling shelf.
            </p>
            <PillLink to="/signup">Get started</PillLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
