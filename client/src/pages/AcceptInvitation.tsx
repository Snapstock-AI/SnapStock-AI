import { useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, LogIn } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/context/AuthContext'

export default function AcceptInvitation() {
  const navigate = useNavigate()
  const { acceptInvitation, isAuthenticated } = useAuth()
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const hasSubmitted = useRef(false)

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

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-7 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            <LogIn className="h-6 w-6" />
          </div>
          <h1 className="mt-5 font-serif text-2xl font-semibold">Sign in to accept your invitation</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Sign in with the email address that received the invitation, then open this invitation link again.</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Go to sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-7 text-center shadow-sm">
        {accepted ? (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h1 className="mt-5 font-serif text-2xl font-semibold">Invitation accepted</h1>
            <p className="mt-2 text-sm text-muted">You are now part of the business team.</p>
            <button type="button" onClick={() => navigate('/dashboard')} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <h1 className="font-serif text-2xl font-semibold">Accept employee invitation</h1>
            <p className="mt-2 text-sm text-muted">{loading ? 'Adding you to the business team...' : error || 'This invitation could not be accepted.'}</p>
            {error && <Link to="/dashboard" className="mt-6 inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-muted">Back to dashboard</Link>}
          </>
        )}
      </div>
    </main>
  )
}