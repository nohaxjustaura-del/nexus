'use client'

import type { ReactNode } from 'react'
import { AuthSessionProvider } from '@/components/auth-session-provider'
import { AccountCapabilitiesProvider } from '@/components/account-capabilities-provider'
import { ChromeModeProvider } from '@/components/chrome-mode-provider'

/** Single client boundary for session, capabilities, and chrome; avoids duplicate auth context modules in dev chunks. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthSessionProvider>
      <AccountCapabilitiesProvider>
        <ChromeModeProvider>{children}</ChromeModeProvider>
      </AccountCapabilitiesProvider>
    </AuthSessionProvider>
  )
}
