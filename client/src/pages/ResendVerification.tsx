import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest } from '@/lib/api'

export default function ResendVerification() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const result = await apiRequest<{ message: string }>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(result.data?.message || 'Verification email sent.')
    } catch (err: any) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Email verification</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Resend verification</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter your email to receive a new verification link.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert variant="success">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Resend email'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ready to sign in?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
