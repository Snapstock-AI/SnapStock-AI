import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_MS = 20_000

/** Poll `loader` every 20s while the tab is visible; also refresh on focus. */
export function usePollingData<T>(
  loader: () => Promise<T>,
  enabled: boolean,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const refresh = useCallback(async (silent = false) => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError('')
    try {
      const next = await loaderRef.current()
      setData(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load data.')
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }

    let active = true
    let timer: ReturnType<typeof setInterval> | undefined

    async function tick(silent: boolean) {
      if (!active) return
      await refresh(silent)
    }

    tick(false)
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') tick(true)
    }, POLL_MS)

    function onFocus() {
      tick(true)
    }
    window.addEventListener('focus', onFocus)

    return () => {
      active = false
      if (timer) clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh])

  return { data, loading, error, refresh }
}
