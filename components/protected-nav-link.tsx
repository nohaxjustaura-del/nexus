'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ProtectedNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  publicRoute?: boolean // If true, doesn't require auth
}

export function ProtectedNavLink({ href, children, className, publicRoute = false }: ProtectedNavLinkProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  // Start with the original href to match server render
  const [linkHref, setLinkHref] = useState(href)

  useEffect(() => {
    setMounted(true)
    if (!publicRoute) {
      // Check auth status
      fetch('/api/auth/check', { 
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      })
        .then(res => res.json().catch(() => ({})))
        .then(data => {
          const auth = data?.authenticated && data?.verified
          setIsAuthenticated(auth)
          // Update href based on auth status
          if (!auth) {
            setLinkHref(`/signup?next=${encodeURIComponent(href)}`)
          } else {
            setLinkHref(href)
          }
        })
        .catch(() => {
          setIsAuthenticated(false)
          setLinkHref(`/signup?next=${encodeURIComponent(href)}`)
        })
    } else {
      setIsAuthenticated(true) // Public routes are always "authenticated" for link purposes
      setLinkHref(href)
    }
  }, [publicRoute, href])

  // During SSR and initial render, always use the original href to prevent hydration mismatch
  // Only update after mount
  const finalHref = mounted ? linkHref : href

  const pathMatches =
    pathname === href || (href.length > 1 && pathname != null && pathname.startsWith(`${href}/`))
  const showActive =
    pathMatches && (publicRoute || isAuthenticated === true) && mounted

  return (
    <Link
      href={finalHref}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        showActive
          ? 'bg-primary/15 text-foreground ring-1 ring-primary/25'
          : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground',
        className
      )}
      prefetch={publicRoute || isAuthenticated === true}
    >
      {children}
    </Link>
  )
}

