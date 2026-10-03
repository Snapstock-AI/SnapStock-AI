import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Menu } from 'lucide-react'
import Logo from '@/components/Logo'
import { PillLink } from '@/components/landing/primitives'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const navLinks = [
  { label: 'Home', href: '/#home' },
  { label: 'About us', href: '/#about' },
  { label: 'Solutions', href: '/#solutions' },
  { label: 'Services', href: '/#services' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'FAQs', href: '/#faq' },
]

export default function Navigation() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const handleNav = (e: React.MouseEvent, href: string) => {
    setOpen(false)
    if (location.pathname !== '/') return
    e.preventDefault()
    document.getElementById(href.replace('/#', ''))?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="landing fixed inset-x-0 top-0 z-50 bg-transparent px-4 pt-4 safe-top md:px-[30px] md:pt-8">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 rounded-[20px] bg-white py-2 pr-2 pl-3 shadow-[0_8px_30px_rgba(4,48,59,0.12)] lg:rounded-[56px]">
        <Logo variant="ink" />

        <nav aria-label="Main" className="hidden items-center lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNav(e, link.href)}
              className="rounded-full px-[18px] py-[11px] text-base font-medium text-ink transition-colors hover:bg-paper"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/signup"
            className="rounded-full px-4 py-2.5 text-base font-medium text-ink transition-colors hover:bg-paper"
          >
            Get started
          </Link>
          <PillLink to="/login">Sign in</PillLink>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-paper lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="landing flex flex-col border-none bg-white text-ink">
            <SheetHeader>
              <SheetTitle>
                <Logo className="no-link" variant="ink" />
              </SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNav(e, link.href)}
                  className="rounded-xl px-3 py-3 text-lg font-medium text-ink hover:bg-paper"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 p-4">
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-full border border-ink/15 text-base font-semibold text-ink"
              >
                Get started
              </Link>
              <PillLink to="/login" onClick={() => setOpen(false)} className="justify-center">
                Sign in
              </PillLink>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
