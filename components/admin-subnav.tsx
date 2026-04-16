'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRightLeft, LayoutDashboard, UserCheck, Building2, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Founders', icon: UserCheck },
  { href: '/admin/vcs', label: 'VCs', icon: Building2 },
] as const

/** Human-readable current admin screen for the subnav context line. */
function getAdminPageTitle(pathname: string | null | undefined): string {
  if (!pathname?.startsWith('/admin')) return ''
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return 'Admin home'

  const section = segments[1]
  const bySection: Record<string, string> = {
    dashboard: 'Overview',
    approvals: 'Founder approvals',
    founders: 'Founder directory',
    vcs: 'VC directory',
    'pending-requests': 'Pending requests',
    'training-data': 'Training data',
    worker: 'Worker',
    waitlist: 'Waitlist',
    'yc-insider-requests': 'Partner founder requests',
  }

  if (section === 'founders' && segments.length >= 3) {
    const raw = decodeURIComponent(segments[2] ?? '')
    const short = raw.length > 28 ? `${raw.slice(0, 25)}…` : raw
    return short ? `Founder · ${short}` : 'Founder profile'
  }

  return bySection[section] ?? section.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function AdminSubnav() {
  const pathname = usePathname()
  const pageTitle = getAdminPageTitle(pathname)

  return (
    <div
      className="relative z-30 border-b border-amber-500/20 bg-background/95 shadow-[0_1px_0_0_hsl(var(--border)/0.2)] backdrop-blur-md dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
      role="navigation"
      aria-label="Admin"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400"
              title="You are in the admin workspace"
            >
              <Shield className="h-3 w-3 opacity-90" aria-hidden />
              Admin
            </span>
            <span className="hidden text-muted-foreground sm:inline" aria-hidden>
              ·
            </span>
            <p className="min-w-0 truncate text-sm font-medium text-foreground" title={pageTitle}>
              <span className="sr-only">Current page: </span>
              {pageTitle}
            </p>
          </div>
          <div className="-mx-1 flex items-center gap-0.5 overflow-x-auto [scrollbar-width:thin] sm:justify-end sm:pb-0">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/15 text-foreground ring-1 ring-primary/25'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                  {label}
                </Link>
              )
            })}
            <Link
              href="/founder/dashboard"
              className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Switch to Founder
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
