import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import { apiRequest } from '@/lib/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }

    apiRequest<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((result) => {
        setStatus('success')
        setMessage(result.data?.message || 'Email verified successfully')
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err.message || 'Verification failed')
      })
  }, [token])

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">Email verification</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Verify email</h1>
        <p
          className={`mt-8 rounded-xl border px-3 py-2 text-sm ${
            status === 'success'
              ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300'
              : status === 'error'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
                : 'border-border bg-surface-elevated text-muted'
          }`}
        >
          {message}
        </p>

        <div className="mt-6 space-y-3 text-sm">
          {status === 'success' && (
            <Link to="/login" className="font-medium text-brand-500 hover:underline">
              Continue to sign in
            </Link>
          )}
          {status === 'error' && (
            <Link to="/resend-verification" className="font-medium text-brand-500 hover:underline">
              Resend verification email
            </Link>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
