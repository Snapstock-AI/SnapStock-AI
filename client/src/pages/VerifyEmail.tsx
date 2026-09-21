import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Email verification</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Verify email</h1>
        <Alert
          variant={status === 'success' ? 'success' : status === 'error' ? 'destructive' : 'default'}
          className="mt-8"
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        <div className="mt-6 space-y-3">
          {status === 'success' && (
            <Button asChild>
              <Link to="/login">Continue to sign in</Link>
            </Button>
          )}
          {status === 'error' && (
            <Button variant="outline" asChild>
              <Link to="/resend-verification">Resend verification email</Link>
            </Button>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
