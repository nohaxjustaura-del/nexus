'use client'

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuthSession } from '@/components/auth-session-provider'

export type AccountCapabilities = {
  hasFounderProfile?: boolean
  hasInvestorProfile?: boolean
  userType?: string
  investorVerified?: boolean
  canAccessFounderNetwork?: boolean
} | null

type AccountCapabilitiesContextValue = {
  loading: boolean
  capabilities: AccountCapabilities
}

const AccountCapabilitiesContext = createContext<AccountCapabilitiesContextValue | null>(null)

export function useAccountCapabilities(): AccountCapabilitiesContextValue {
  const ctx = useContext(AccountCapabilitiesContext)
  if (!ctx) {
    throw new Error('useAccountCapabilities must be used within AccountCapabilitiesProvider')
  }
  return ctx
}

export function AccountCapabilitiesProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuthSession()
  const [loading, setLoading] = useState(false)
  const [capabilities, setCapabilities] = useState<AccountCapabilities>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!authenticated) {
      fetchedRef.current = false
      setLoading(false)
      setCapabilities(null)
      return
    }
    if (fetchedRef.current) return

    fetchedRef.current = true
    const controller = new AbortController()
    setLoading(true)
    fetch('/api/account/capabilities', {
      credentials: 'include',
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-store' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.authenticated) {
          setCapabilities(null)
          return
        }
        setCapabilities({
          hasFounderProfile: Boolean(data.hasFounderProfile),
          hasInvestorProfile: Boolean(data.hasInvestorProfile),
          userType: typeof data.userType === 'string' ? data.userType : undefined,
          investorVerified: Boolean(data.investorVerified),
          canAccessFounderNetwork: Boolean(data.canAccessFounderNetwork),
        })
      })
      .catch(() => {
        setCapabilities(null)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      controller.abort()
    }
  }, [authenticated])

  const value = useMemo(() => ({ loading, capabilities }), [loading, capabilities])
  return <AccountCapabilitiesContext.Provider value={value}>{children}</AccountCapabilitiesContext.Provider>
}
