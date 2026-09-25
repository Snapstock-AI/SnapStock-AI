import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import AuthLayout from '@/components/AuthLayout'
import GoogleContinueButton from '@/components/GoogleContinueButton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const queryFrom = new URLSearchParams(location.search).get('from')
  const stateFrom = (location.state as { from?: string } | null)?.from
  const candidate = queryFrom || stateFrom || '/dashboard'
  const redirectTo =
    candidate.startsWith('/') && !candidate.startsWith('/login')
      ? candidate
      : '/dashboard'

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  const handleGoogle = useCallback(
    async (credential: string) => {
      setError('')
      setLoading(true)
      try {
        await loginWithGoogle(credential)
        navigate(redirectTo, { replace: true })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed')
      } finally {
        setLoading(false)
      }
    },
    [loginWithGoogle, navigate, redirectTo],
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Sign in to SnapStock-AI</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Continue scanning shelves and tracking freshness across your stores.
        </p>

        <div className="mt-8 space-y-4">
          <GoogleContinueButton
            label="continue_with"
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error}
                {error.toLowerCase().includes('verify') && (
                  <>
                    {' '}
                    <Link to="/resend-verification" className="font-medium underline">
                      Resend verification email
                    </Link>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          New to SnapStock-AI?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
