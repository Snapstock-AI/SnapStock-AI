import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Welcome back</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Sign in to SnapStock-AI</h1>
        <p className="mt-3 text-sm text-muted">
          Continue scanning shelves and tracking freshness across your stores.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-500 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
              {error.toLowerCase().includes('verify') && (
                <>
                  {' '}
                  <Link to="/resend-verification" className="font-medium underline">
                    Resend verification email
                  </Link>
                </>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-full bg-brand-500 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          New to SnapStock-AI?{' '}
          <Link to="/signup" className="font-medium text-brand-500 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
