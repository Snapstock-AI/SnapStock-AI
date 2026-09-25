import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_MS = 20_000
const CACHE_TTL_MS = 120_000

type CacheEntry = { data: unknown; at: number }

const dataCache = new Map<string, CacheEntry>()

function readCache<T>(key: string | undefined): T | null {
  if (!key) return null
  const hit = dataCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    dataCache.delete(key)
    return null
  }
  return hit.data as T
}

function writeCache<T>(key: string | undefined, data: T) {
  if (!key) return
  dataCache.set(key, { data, at: Date.now() })
}

/**
 * Poll `loader` every 20s while the tab is visible; also refresh on focus.
 * Optional `cacheKey` keeps the last successful payload so tab switches
 * remount instantly without a loading flash.
 */
export function usePollingData<T>(
  loader: () => Promise<T>,
  enabled: boolean,
  cacheKey?: string,
) {
  const [data, setData] = useState<T | null>(() => readCache<T>(cacheKey))
  const [loading, setLoading] = useState(() => enabled && !readCache<T>(cacheKey))
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const hasDataRef = useRef(Boolean(readCache<T>(cacheKey)))

  const refresh = useCallback(
    async (silent = false) => {
      if (!enabled) {
        setData(null)
        setLoading(false)
        hasDataRef.current = false
        return
      }
      // Keep previous content visible when we already have cached/live data.
      if (!silent && !hasDataRef.current) setLoading(true)
      setError('')
      try {
        const next = await loaderRef.current()
        setData(next)
        writeCache(cacheKey, next)
        hasDataRef.current = true
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to load data.')
      } finally {
        setLoading(false)
      }
    },
    [enabled, cacheKey],
  )

  useEffect(() => {
    if (!enabled) {
      setData(null)
      setLoading(false)
      return
    }

    const warm = readCache<T>(cacheKey)
    if (warm) {
      setData(warm)
      setLoading(false)
      hasDataRef.current = true
    }

    let active = true
    let timer: ReturnType<typeof setInterval> | undefined

    async function tick(silent: boolean) {
      if (!active) return
      await refresh(silent)
    }

    tick(Boolean(warm))
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
  }, [enabled, refresh, cacheKey])

  return { data, loading, error, refresh }
}
