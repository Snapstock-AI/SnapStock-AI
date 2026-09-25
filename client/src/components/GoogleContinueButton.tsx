import { useCallback, useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            locale?: string
            itp_support?: boolean
            use_fedcm_for_prompt?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number | undefined>,
          ) => void
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean
            isSkippedMoment: () => boolean
            isDismissedMoment: () => boolean
          }) => void) => void
          cancel: () => void
        }
      }
    }
  }
}

type GoogleContinueButtonProps = {
  onCredential: (credential: string) => Promise<void> | void
  label?: 'continue_with' | 'signin_with' | 'signup_with'
  disabled?: boolean
  onError?: (message: string) => void
}

const GIS_SRC = 'https://accounts.google.com/gsi/client?hl=en'

const LABEL_TEXT: Record<NonNullable<GoogleContinueButtonProps['label']>, string> = {
  continue_with: 'Continue with Google',
  signin_with: 'Sign in with Google',
  signup_with: 'Sign up with Google',
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(
    'script[src*="accounts.google.com/gsi/client"]',
  )
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google Sign-In')),
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.head.appendChild(script)
  })
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export default function GoogleContinueButton({
  onCredential,
  label = 'continue_with',
  disabled = false,
  onError,
}: GoogleContinueButtonProps) {
  const hiddenRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const errorRef = useRef(onError)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  callbackRef.current = onCredential
  errorRef.current = onError

  useEffect(() => {
    if (!clientId || disabled) return

    let cancelled = false
    document.documentElement.setAttribute('lang', 'en')

    ;(async () => {
      try {
        await loadGisScript()
        if (cancelled || !hiddenRef.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            setBusy(true)
            try {
              await callbackRef.current(response.credential)
            } catch (err: unknown) {
              errorRef.current?.(
                err instanceof Error ? err.message : 'Google sign-in failed',
              )
            } finally {
              setBusy(false)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          locale: 'en_US',
          itp_support: true,
        })

        // Keep a locale-forced GIS button off-screen as a reliable click target.
        hiddenRef.current.innerHTML = ''
        hiddenRef.current.setAttribute('lang', 'en')
        window.google.accounts.id.renderButton(hiddenRef.current, {
          theme: 'outline',
          size: 'large',
          text: label,
          shape: 'rectangular',
          width: 320,
          logo_alignment: 'left',
          locale: 'en_US',
        })
        setReady(true)
      } catch (err: unknown) {
        errorRef.current?.(
          err instanceof Error ? err.message : 'Google Sign-In unavailable',
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientId, disabled, label])

  const handleClick = useCallback(() => {
    if (!ready || disabled || busy) return

    const host = hiddenRef.current
    const gisButton = host?.querySelector<HTMLElement>('div[role="button"]')
    if (gisButton) {
      gisButton.click()
      return
    }

    // Fallback: One Tap / FedCM prompt when the hidden button is unavailable.
    window.google?.accounts.id.prompt()
  }, [busy, disabled, ready])

  if (!clientId) return null

  return (
    <div className={disabled || busy ? 'pointer-events-none opacity-60' : undefined}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || busy || !ready}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-white px-4 text-sm font-medium text-fd-ink shadow-sm transition hover:bg-muted/40 dark:bg-card"
        aria-label={LABEL_TEXT[label]}
        lang="en"
      >
        <GoogleMark className="h-5 w-5 shrink-0" />
        <span>{busy ? 'Connecting…' : LABEL_TEXT[label]}</span>
      </button>
      <div
        ref={hiddenRef}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
      />
      {!ready && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Loading Google…</p>
      )}
    </div>
  )
}
