import { Link } from 'react-router'
import Logo from '@/components/Logo'
import { BlurWords, PillLink, Reveal, SectionTag } from '@/components/landing/primitives'

const linkGroups = [
  {
    title: 'Quick links',
    links: [
      { label: 'Home', href: '/#home' },
      { label: 'About us', href: '/#about' },
      { label: 'Our solutions', href: '/#solutions' },
      { label: 'Our services', href: '/#services' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Gallery', href: '/#gallery' },
      { label: 'FAQs', href: '/#faq' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', to: '/login' },
      { label: 'Create account', to: '/signup' },
      { label: 'Dashboard', to: '/dashboard' },
    ],
  },
]

const linkClass = 'text-lg text-ink-body transition-colors duration-300 hover:text-ink'

/** Closing CTA and footer card over a photo, as in the template. */
export default function Footer() {
  return (
    <div className="relative overflow-hidden pt-[60px] pb-[50px] md:pt-20 md:pb-[60px]">
      <img src="/images/landing/cta-bg.webp" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/75" aria-hidden="true" />

      <section className="relative px-5 pb-[50px] md:px-[30px] md:pb-[60px] xl:pb-20">
        <div className="mx-auto flex max-w-[1380px] flex-col items-center gap-6 text-center">
          <div className="flex flex-col items-center gap-4 md:gap-5">
            <Reveal>
              <SectionTag tone="light">Join us</SectionTag>
            </Reveal>
            <BlurWords
              text="Ready to transform your store with smart inventory?"
              className="max-w-[738px] text-[36px] leading-[1.2] font-bold text-white md:max-w-[550px] xl:max-w-[738px] xl:text-[44px] 2xl:text-[52px]"
            />
          </div>
          <Reveal>
            <PillLink to="/signup">Get started</PillLink>
          </Reveal>
        </div>
      </section>

      <footer className="relative px-5 md:px-[30px]">
        <Reveal className="mx-auto flex max-w-[1380px] flex-col gap-[30px] rounded-xl bg-white px-5 py-6 md:gap-10 md:rounded-[20px] md:p-9 xl:gap-[52px] xl:p-12">
          <div className="flex flex-col gap-8 md:gap-10 xl:flex-row xl:justify-between">
            <div className="flex flex-col gap-4 xl:max-w-[344px]">
              <Logo variant="ink" to="/" />
              <p className="text-lg text-ink">Smart inventory and freshness monitoring for small-scale retailers.</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:flex md:gap-16 xl:max-w-[52%] xl:flex-1 xl:justify-between xl:gap-8">
              {linkGroups.map((group) => (
                <nav key={group.title} aria-label={group.title} className="flex flex-col gap-4">
                  <p className="text-lg font-medium text-ink">{group.title}</p>
                  <ul className="flex flex-col gap-3">
                    {group.links.map((link) => (
                      <li key={link.label}>
                        {'to' in link ? (
                          <Link to={link.to} className={linkClass}>
                            {link.label}
                          </Link>
                        ) : (
                          <a href={link.href} className={linkClass}>
                            {link.label}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="border-t border-ink/60 pt-3 text-center">
            <p className="text-base text-ink-body">© 2026 SnapStock-AI. All rights reserved.</p>
          </div>
        </Reveal>
      </footer>
    </div>
  )
}
