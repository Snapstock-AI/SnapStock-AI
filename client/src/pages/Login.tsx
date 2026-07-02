import { Link } from 'react-router'
import AuthLayout from '@/components/AuthLayout'

export default function Login() {
  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Welcome back</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Sign in to FreshTrack</h1>
        <p className="mt-3 text-sm text-muted">
          Continue scanning shelves and tracking freshness across your stores.
        </p>

        <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@shop.com"
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <a href="#" className="text-xs text-brand-500 hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" defaultChecked className="rounded border-border text-brand-500" />
            Remember me for 30 days
          </label>

          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center rounded-full bg-brand-500 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Sign In
          </Link>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <p className="relative mx-auto w-fit bg-surface px-4 text-xs text-muted">or continue with</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-xl border border-border py-3 text-sm font-medium transition hover:bg-surface-muted"
          >
            Google
          </button>
          <button
            type="button"
            className="rounded-xl border border-border py-3 text-sm font-medium transition hover:bg-surface-muted"
          >
            Apple
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          New to FreshTrack?{' '}
          <Link to="/signup" className="font-medium text-brand-500 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
