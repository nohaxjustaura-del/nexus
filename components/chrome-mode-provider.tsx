'use client'

import React, { createContext, useContext, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'
import { isInvestorAccountAreaPath } from '@/lib/investor-account-path'

const LEGACY_STORAGE_KEY = 'nexus_chrome_preference_v1'

export type ChromeMode = 'founder' | 'investor' | 'mentor' | 'guest'

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

function neutralChromeFromUserType(userType: string | undefined): 'founder' | 'investor' | 'mentor' {
  const t = userType?.toLowerCase()
  if (t === 'vc' || t === 'investor') return 'investor'
  if (t === 'mentor') return 'mentor'
  return 'founder'
}

export function ChromeModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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
    if (isInvestorAccountAreaPath(pathname)) return 'investor'
    if (pathname.startsWith('/mentor')) return 'mentor'
    if (pathname.startsWith('/founder')) return 'founder'
    if (loading && !user?.userType) return 'founder'
    return neutralChromeFromUserType(user?.userType)
  }, [authenticated, loading, pathname, user?.userType])

  const value = useMemo(() => ({ chrome }), [chrome])

  return <ChromeModeContext.Provider value={value}>{children}</ChromeModeContext.Provider>
}
