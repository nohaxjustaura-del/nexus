'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'

const LEGACY_STORAGE_KEY = 'nexus_chrome_preference_v1'

export type ChromeMode = 'founder' | 'investor' | 'guest'

type ChromeModeContextValue = {
  chrome: ChromeMode
}

const ChromeModeContext = createContext<ChromeModeContextValue | null>(null)

export function useChromeMode(): ChromeModeContextValue {
  const ctx = useContext(ChromeModeContext)
  if (!ctx) {
    throw new Error('useChromeMode must be used within ChromeModeProvider')
  }
  return ctx
}

function neutralChromeFromUserType(userType: string | undefined): 'founder' | 'investor' {
  const t = userType?.toLowerCase()
  if (t === 'vc' || t === 'investor') return 'investor'
  return 'founder'
}

export function ChromeModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const { authenticated, user, loading } = useAuthSession()

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const chrome = useMemo((): ChromeMode => {
    if (!authenticated) return 'guest'
    if (pathname.startsWith('/vc') || pathname.startsWith('/investor')) return 'investor'
    if (pathname.startsWith('/founder')) return 'founder'
    if (loading && !user?.userType) return 'founder'
    return neutralChromeFromUserType(user?.userType)
  }, [authenticated, pathname, loading, user?.userType])

  const value = useMemo(() => ({ chrome }), [chrome])

  return <ChromeModeContext.Provider value={value}>{children}</ChromeModeContext.Provider>
}
