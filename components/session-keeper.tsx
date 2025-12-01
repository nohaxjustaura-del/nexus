'use client'

import { useEffect, useRef } from 'react'

// Component that keeps the session alive by refreshing it periodically
// This ensures users stay logged in even with long periods of inactivity
export function SessionKeeper() {
  const lastRefreshRef = useRef<number>(0)
  const mountedRef = useRef<boolean>(true)

  useEffect(() => {
    mountedRef.current = true

    // Refresh session every 24 hours (keeps it active but reduces API calls)
    const refreshInterval = setInterval(async () => {
      if (!mountedRef.current) return
      
      try {
        await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })
        lastRefreshRef.current = Date.now()
      } catch {
        // Silently fail - session will still work
      }
    }, 24 * 60 * 60 * 1000) // 24 hours

    // Refresh on page visibility change (user comes back to tab)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && mountedRef.current) {
        const now = Date.now()
        // Only refresh if last refresh was more than 1 hour ago
        if (now - lastRefreshRef.current > 60 * 60 * 1000) {
          try {
            await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include',
            })
            lastRefreshRef.current = now
          } catch {
            // Silently fail
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      mountedRef.current = false
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return null // This component doesn't render anything
}

