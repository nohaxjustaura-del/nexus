'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthSession } from '@/components/auth-session-provider'
import { useChromeMode } from '@/components/chrome-mode-provider'

interface ProtectedNavLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  publicRoute?: boolean
}

export function ProtectedNavLink({ href, children, className, publicRoute = false }: ProtectedNavLinkProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { loading, authenticated, verified } = useAuthSession()
  const { chrome } = useChromeMode()
  const [linkHref, setLinkHref] = useState(href)

  const authed = authenticated && verified
  const prefetchFounderWorkspace =
    authenticated &&
    (pathname?.startsWith('/founder') || chrome === 'founder')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (publicRoute) {
      setLinkHref(href)
      return
    }
    if (loading) return
    setLinkHref(authed ? href : `/signup?next=${encodeURIComponent(href)}`)
  }, [mounted, publicRoute, href, loading, authed])

  const finalHref = mounted ? linkHref : href

  const pathMatches =
    pathname === href || (href.length > 1 && pathname != null && pathname.startsWith(`${href}/`))
  const showActive =
    pathMatches && mounted && (publicRoute ? true : !loading && authed)

  return (
    <Link
      href={finalHref}
      className={cn(
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        showActive
          ? 'bg-primary/15 text-foreground shadow-sm ring-1 ring-primary/20'
          : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground',
        className
      )}
      prefetch={publicRoute || authed || prefetchFounderWorkspace}
    >
      {children}
    </Link>
  )
}
