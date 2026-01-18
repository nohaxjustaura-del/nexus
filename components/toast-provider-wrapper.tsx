'use client'

import React from 'react'

// Temporarily simplified - just render children to avoid webpack issues
// Toast functionality will be restored once webpack issues are resolved
export function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  // For now, just render children without toast provider to fix webpack errors
  // This will be restored once the module loading issue is resolved
  return <>{children}</>
}
