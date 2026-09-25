import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, LogIn, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

export default function AcceptInvitation() {
  const navigate = useNavigate()
  const { acceptInvitation, isAuthenticated } = useAuth()
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const hasSubmitted = useRef(false)

  const returnPath = token
    ? `/accept-invitation?token=${encodeURIComponent(token)}`
    : '/accept-invitation'

  useEffect(() => {
    if (!isAuthenticated || !token || hasSubmitted.current) return

    hasSubmitted.current = true
    setLoading(true)
    acceptInvitation(token)
      .then(() => setAccepted(true))
      .catch((acceptError: unknown) => {
        setError(acceptError instanceof Error ? acceptError.message : 'Unable to accept invitation.')
      })
      .finally(() => setLoading(false))
  }, [acceptInvitation, isAuthenticated, token])

  if (!token) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-7 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Invalid invitation</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This invitation link is missing a token. Ask the owner to resend the invite.
            </p>
            <Button variant="outline" asChild className="mt-6">
              <Link to="/login">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <LogIn className="h-6 w-6" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to accept your invitation</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the email address that received this invitation. If you do not have an account yet,
              create one with that email, then return here.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to={`/login?from=${encodeURIComponent(returnPath)}`}>
                  Sign in <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/signup?from=${encodeURIComponent(returnPath)}`}>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-7 text-center">
          {accepted ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Invitation accepted</h1>
              <p className="mt-2 text-sm text-muted-foreground">You are now part of the business team.</p>
              <Button type="button" onClick={() => navigate('/dashboard')} className="mt-6">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">Accept employee invitation</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {loading
                  ? 'Adding you to the business team...'
                  : error || 'This invitation could not be accepted.'}
              </p>
              {error && (
                <Button variant="outline" asChild className="mt-6">
                  <Link to="/dashboard">Back to dashboard</Link>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
