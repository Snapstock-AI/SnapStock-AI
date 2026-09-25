import { useCallback, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import GoogleContinueButton from '@/components/GoogleContinueButton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register, loginWithGoogle } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const queryFrom = new URLSearchParams(location.search).get('from')
  const redirectAfterAuth =
    queryFrom && queryFrom.startsWith('/') && !queryFrom.startsWith('/login')
      ? queryFrom
      : '/dashboard'
  const loginPath =
    redirectAfterAuth === '/dashboard'
      ? '/login'
      : `/login?from=${encodeURIComponent(redirectAfterAuth)}`

  const handleGoogle = useCallback(
    async (credential: string) => {
      setError('')
      setMessage('')
      setLoading(true)
      try {
        await loginWithGoogle(credential)
        navigate(redirectAfterAuth)
      } catch (err: any) {
        setError(err.message || 'Google sign-in failed')
      } finally {
        setLoading(false)
      }
    },
    [loginWithGoogle, navigate, redirectAfterAuth],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const successMessage = await register(fullName, email, password)
      setMessage(successMessage)
      setTimeout(() => navigate(loginPath), 2000)
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Get started</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Create your account</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Start monitoring inventory and freshness for your storefront in minutes.
        </p>

        <div className="mt-8 space-y-4">
          <GoogleContinueButton
            label="signup_with"
            disabled={loading}
            onCredential={handleGoogle}
            onError={setError}
          />

          <div className="relative py-1 text-center text-xs uppercase tracking-widest text-muted-foreground">
            <span className="relative z-10 bg-background px-3">or</span>
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
          </div>
        </div>

        <form className="mt-4 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Priya Rajan"
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
            {loading ? 'Creating account...' : 'Create free account'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={loginPath} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
