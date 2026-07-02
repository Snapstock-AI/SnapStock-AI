import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Overview', href: '/#overview' },
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Pricing', href: '/#pricing' },
]

export default function Navigation() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const handleNav = (href: string) => {
    setOpen(false)
    if (location.pathname !== '/') {
      return
    }
    const id = href.replace('/#', '')
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/90 backdrop-blur-md safe-top">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault()
                  handleNav(link.href)
                }
              }}
              className="text-sm text-muted transition hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Link to="/login" className="text-sm font-medium text-muted transition hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Get started
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,320px)] flex-col bg-surface-elevated p-6 shadow-xl">
            <div className="mb-8 flex items-center justify-between">
              <Logo />
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    if (location.pathname === '/') {
                      e.preventDefault()
                      handleNav(link.href)
                    } else {
                      setOpen(false)
                    }
                  }}
                  className="text-lg font-medium"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className={cn('mt-auto flex flex-col gap-3 pt-8')}>
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-border py-3 text-center font-medium"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                onClick={() => setOpen(false)}
                className="rounded-full bg-brand-500 py-3 text-center font-medium text-white"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
