'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

export type AuthUser = {
  id: string
  email: string
  userType?: string
}

export type AuthSessionContextValue = {
  loading: boolean
  authenticated: boolean
  verified: boolean
  email?: string
  isAdmin: boolean
  user?: AuthUser
  /** Re-fetch session and show loading where the UI depends on it */
  refresh: () => Promise<void>
  /** Re-fetch in the background (no loading flash) */
  refreshSilent: () => Promise<void>
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null)

export function useAuthSession(): AuthSessionContextValue {
  const ctx = useContext(AuthSessionContext)
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider')
  }
  return ctx
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [verified, setVerified] = useState(false)
  const [email, setEmail] = useState<string | undefined>(undefined)
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<AuthUser | undefined>(undefined)
  const inFlightRef = useRef<Promise<void> | null>(null)

  const parseJson = useCallback(async (res: Response) => {
    const data = await res.json().catch(() => ({}))
    setAuthenticated(Boolean(data?.authenticated))
    setVerified(Boolean(data?.verified))
    setIsAdmin(Boolean(data?.isAdmin))
    const u = data?.user
    if (u?.email) {
      setUser({ id: String(u.id ?? ''), email: String(u.email), userType: u.userType })
      setEmail(String(u.email))
    } else if (data?.email) {
      setEmail(String(data.email))
      setUser(undefined)
    } else {
      setEmail(undefined)
      setUser(undefined)
    }
  }, [])

  const fetchSession = useCallback(
    async (silent: boolean) => {
      if (inFlightRef.current) {
        await inFlightRef.current
        // A concurrent silent refresh skips `setLoading(false)` in its `finally`. Callers that
        // awaited the in-flight work (e.g. initial `refresh()`) must still clear loading.
        if (!silent) setLoading(false)
        return
      }
      const run = (async () => {
        if (!silent) setLoading(true)
        try {
          const res = await fetch('/api/auth/check', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Cache-Control': 'no-store' },
          })
          await parseJson(res)
        } catch {
          setAuthenticated(false)
          setVerified(false)
          setIsAdmin(false)
          setEmail(undefined)
          setUser(undefined)
        } finally {
          if (!silent) setLoading(false)
        }
      })()
      inFlightRef.current = run.finally(() => {
        inFlightRef.current = null
      })
      await inFlightRef.current
    },
    [parseJson]
  )

  const refresh = useCallback(() => fetchSession(false), [fetchSession])
  const refreshSilent = useCallback(() => fetchSession(true), [fetchSession])

  useEffect(() => {
    void fetchSession(false)
  }, [fetchSession])

  useEffect(() => {
    const onStorage = () => {
      void fetchSession(true)
    }
    window.addEventListener('storage', onStorage)
    const id = window.setInterval(() => {
      void fetchSession(true)
    }, 5 * 60 * 1000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.clearInterval(id)
    }
  }, [fetchSession])

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      loading,
      authenticated,
      verified,
      email,
      isAdmin,
      user,
      refresh,
      refreshSilent,
    }),
    [loading, authenticated, verified, email, isAdmin, user, refresh, refreshSilent]
  )

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
}
