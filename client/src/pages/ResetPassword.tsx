import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import { apiRequest } from '@/lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const result = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      setMessage(result.data?.message || 'Password reset successfully')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: any) {
      setError(err.message || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Account recovery</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Reset password</h1>
        <p className="mt-3 text-sm text-muted">Choose a new password for your account.</p>

        {!token ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Missing reset token. Request a new link from{' '}
            <Link to="/forgot-password" className="underline">
              forgot password
            </Link>
            .
          </p>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            {message && (
              <p className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-full bg-brand-500 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
