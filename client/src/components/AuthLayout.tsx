import type { ReactNode } from 'react'
import { Link } from 'react-router'
import BrandVisual from '@/components/BrandVisual'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type AuthLayoutProps = {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* Soft half-page shape field behind auth panel */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block">
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-100/80 via-brand-50/40 to-transparent dark:from-brand-900/40 dark:via-brand-900/10" />
        <div className="absolute -right-32 top-24 h-[420px] w-[420px] rounded-full bg-brand-500/10 blur-2xl" />
        <div className="absolute bottom-20 right-10 h-48 w-48 rounded-[40%] bg-accent-orange/10 blur-xl" />
      </div>

      <header className="relative z-10 flex h-16 items-center justify-between border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl lg:grid-cols-2">
        <div className="flex items-center justify-center px-4 py-10 md:px-8">
          <Card className="w-full max-w-md border-border/70 shadow-md">
            <CardContent className="p-6 md:p-8">{children}</CardContent>
          </Card>
        </div>

        <div className="relative hidden items-center p-6 lg:flex">
          <BrandVisual quote className="w-full min-h-[560px] shadow-xl shadow-brand-500/15" />
        </div>
      </div>
    </div>
  )
}
