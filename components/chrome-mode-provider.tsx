'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { usePathname } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'

const STORAGE_KEY = 'nexus_chrome_preference_v1'

export type ChromeMode = 'founder' | 'investor' | 'guest'

type ChromeModeContextValue = {
  chrome: ChromeMode
  /** User-chosen mode on neutral routes (/account, /, /pricing, etc.) */
  setPreferredChrome: (mode: 'founder' | 'investor') => void
  preference: 'founder' | 'investor' | null
}

const ChromeModeContext = createContext<ChromeModeContextValue | null>(null)

export function useChromeMode(): ChromeModeContextValue {
  const ctx = useContext(ChromeModeContext)
  if (!ctx) {
    throw new Error('useChromeMode must be used within ChromeModeProvider')
  }
  return ctx
}

export function ChromeModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const { authenticated, user, loading } = useAuthSession()
  const [preference, setPreference] = useState<'founder' | 'investor' | null>(null)
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw === 'founder' || raw === 'investor') {
        setPreference(raw)
      }
    } catch {
      /* ignore */
    }
    setStorageReady(true)
  }, [])

  const setPreferredChrome = useCallback((mode: 'founder' | 'investor') => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
    setPreference(mode)
  }, [])

  const chrome = useMemo((): ChromeMode => {
    if (!authenticated) return 'guest'
    if (pathname.startsWith('/vc')) return 'investor'
    if (pathname.startsWith('/founder')) return 'founder'

    if (preference) return preference

    if (!storageReady || loading) {
      const t = user?.userType
      return t === 'vc' || t === 'investor' ? 'investor' : 'founder'
    }

    const t = user?.userType
    return t === 'vc' || t === 'investor' ? 'investor' : 'founder'
  }, [authenticated, pathname, preference, storageReady, loading, user?.userType])

  const value = useMemo(
    () => ({ chrome, setPreferredChrome, preference }),
    [chrome, setPreferredChrome, preference]
  )

  return <ChromeModeContext.Provider value={value}>{children}</ChromeModeContext.Provider>
}
