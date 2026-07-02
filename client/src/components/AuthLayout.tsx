import type { ReactNode } from 'react'
import { Link } from 'react-router'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="flex h-16 items-center justify-between px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="hidden text-sm font-medium text-muted sm:inline hover:text-foreground">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl lg:grid-cols-2">
        <div className="flex items-center justify-center px-4 py-8 md:px-8">{children}</div>

        <div className="relative hidden overflow-hidden p-6 lg:block">
          <div className="relative h-full overflow-hidden rounded-3xl">
            <img
              src="https://images.unsplash.com/photo-1610832958506-aa56368156cf?w=900&q=80&auto=format&fit=crop"
              alt="Fresh fruits and vegetables"
              className="h-full w-full object-cover"
            />
            <div className="absolute left-6 top-6">
              <Logo variant="light" />
            </div>
            <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <p className="font-serif text-lg leading-relaxed text-white">
                &ldquo;We cut fruit waste by nearly a third in the first month. My phone does the
                audits now — I run the shop.&rdquo;
              </p>
              <p className="mt-3 text-sm text-white/80">— Priya R., grocer in Pune</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
