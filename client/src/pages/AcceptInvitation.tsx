import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { acceptEmployeeInvitation } from '@/lib/invitation'

type Status = 'loading' | 'accepted' | 'error'

/**
 * Landing page for the link in the employee invitation email.
 * The employee's account already exists (created by the owner), so opening this
 * link just adds them to the business — they sign in afterwards with the
 * temporary password from the email.
 */
export default function AcceptInvitation() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '')
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error')
  const [error, setError] = useState(token ? '' : 'This invitation link is missing its token.')
  const [email, setEmail] = useState('')
  const hasSubmitted = useRef(false)

  useEffect(() => {
    if (!token || hasSubmitted.current) return
    hasSubmitted.current = true

    acceptEmployeeInvitation(token)
      .then((result) => {
        setEmail(result.email)
        setStatus('accepted')
      })
      .catch((acceptError: unknown) => {
        setError(acceptError instanceof Error ? acceptError.message : 'Unable to accept invitation.')
        setStatus('error')
      })
  }, [token])

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-7 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Joining the team...</h1>
              <p className="mt-2 text-sm text-muted-foreground">Adding you to the business.</p>
            </>
          )}

          {status === 'accepted' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Invitation accepted</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You are now part of the business team. Sign in
                {email ? <> as <strong className="text-foreground">{email}</strong></> : null} with the
                temporary password from your invitation email, then choose a new password.
              </p>
              <Button asChild className="mt-6">
                <Link to="/login">
                  Go to sign in <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <XCircle className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">Invitation could not be accepted</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{error}</p>
              <Button variant="outline" asChild className="mt-6">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
