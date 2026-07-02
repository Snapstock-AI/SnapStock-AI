import { Link } from 'react-router'
import AuthLayout from '@/components/AuthLayout'

export default function Signup() {
  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Get started</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Create your account</h1>
        <p className="mt-3 text-sm text-muted">
          Start monitoring inventory and freshness for your storefront in minutes.
        </p>

        <form className="mt-8 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="shop" className="mb-1.5 block text-sm font-medium">
              Shop name
            </label>
            <input
              id="shop"
              type="text"
              placeholder="Priya's Fresh Mart"
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
            />
          </div>

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
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
            />
          </div>

          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center rounded-full bg-brand-500 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Create free account
          </Link>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-500 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
