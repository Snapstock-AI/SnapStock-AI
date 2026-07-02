import { BarChart3, Bell, Camera, Leaf, Shield, Store } from 'lucide-react'

const features = [
  {
    icon: Camera,
    title: 'Scan with any phone',
    description:
      'Point your camera at a shelf. Our vision model counts stock and reads freshness — no scanners, no scales, no barcodes.',
  },
  {
    icon: Leaf,
    title: 'Freshness scoring',
    description:
      'A CNN trained on 138k+ produce images grades each item as Fresh, Medium or Spoiled with confidence intervals.',
  },
  {
    icon: Bell,
    title: 'Real-time alerts',
    description:
      'Get pinged the moment a batch is nearing spoilage or a bin drops below your reorder threshold.',
  },
  {
    icon: BarChart3,
    title: 'Waste analytics',
    description:
      'See which SKUs spoil fastest, when demand spikes, and where your shelf life is quietly eating margin.',
  },
  {
    icon: Store,
    title: 'Multi-tenant catalog',
    description:
      'Manage multiple stalls, staff, and product catalogs from one dashboard with role-based access.',
  },
  {
    icon: Shield,
    title: 'Private by default',
    description:
      'Images are processed securely and never used to train third-party models. Your shelves stay yours.',
  },
]

export default function Features() {
  return (
    <section id="features" className="border-t border-border bg-surface-muted/50 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-500">Features</p>
        <h2 className="mt-3 max-w-2xl font-serif text-3xl font-semibold md:text-4xl">
          Enterprise-grade produce intelligence, sized for the corner shop.
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface-elevated p-6 transition hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
