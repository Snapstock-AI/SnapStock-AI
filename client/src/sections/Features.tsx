import { BarChart3, Bell, Camera, Leaf, Shield, Store } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
    <section id="features" className="border-t border-border bg-muted/35 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Features</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Enterprise-grade produce intelligence, sized for the corner shop.
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="hover:shadow-md">
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
