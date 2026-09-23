import { useEffect, useRef, useState } from 'react'

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
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              width?: number | string
              logo_alignment?: 'left' | 'center'
              locale?: string
            },
          ) => void
          prompt: () => void
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

const GIS_SRC = 'https://accounts.google.com/gsi/client'

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In')))
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

export default function GoogleContinueButton({
  onCredential,
  label = 'continue_with',
  disabled = false,
  onError,
}: GoogleContinueButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  useEffect(() => {
    if (!clientId || disabled) return

    let cancelled = false

    ;(async () => {
      try {
        await loadGisScript()
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              await onCredential(response.credential)
            } catch (err: any) {
              onError?.(err?.message || 'Google sign-in failed')
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          locale: 'en',
        })

        buttonRef.current.innerHTML = ''
        buttonRef.current.setAttribute('lang', 'en')
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          text: label,
          shape: 'rectangular',
          width: buttonRef.current.offsetWidth || 384,
          logo_alignment: 'left',
          locale: 'en',
        })
        setReady(true)
      } catch (err: any) {
        onError?.(err?.message || 'Google Sign-In unavailable')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [clientId, disabled, label, onCredential, onError])

  if (!clientId) return null

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : undefined}>
      <div ref={buttonRef} className="flex min-h-11 w-full justify-center overflow-hidden rounded-md" />
      {!ready && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Loading Google…</p>
      )}
    </div>
  )
}
