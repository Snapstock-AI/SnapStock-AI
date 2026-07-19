const steps = [
  {
    num: '01',
    title: 'Snap the shelf',
    description: 'Open FreshTrack and capture a photo of your produce section.',
  },
  {
    num: '02',
    title: 'AI does the counting',
    description: 'Our detector identifies items and estimates ripeness for each unit.',
  },
  {
    num: '03',
    title: 'Act on insights',
    description: 'Review counts, mark spoiled items, and let alerts guide your next reorder.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">How it works</p>
        <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold md:text-4xl">
          From shelf to insight in seconds.
        </h2>
        <p className="mt-4 max-w-lg text-muted">
          No IoT, no scales, no barcode reprints. Three steps, one phone.
        </p>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.num} className="relative">
              <span className="font-serif text-5xl font-bold text-brand-200 dark:text-brand-800">
                {step.num}
              </span>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
