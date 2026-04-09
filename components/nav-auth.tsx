'use client'

import { useState, useEffect, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { CreditCounter } from '@/components/credit-counter'
import { NotificationBell } from '@/components/notification-bell'
import { User } from 'lucide-react'
import { useAuthSession } from '@/components/auth-session-provider'
import { useChromeMode } from '@/components/chrome-mode-provider'
import { cn } from '@/lib/utils'

export const NavAuth = memo(function NavAuth() {
  const pathname = usePathname()
  const { loading, authenticated, verified, isAdmin } = useAuthSession()
  const { chrome } = useChromeMode()
  const onAdminPage = Boolean(isAdmin && pathname?.startsWith('/admin'))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Authenticated UI must not be hidden behind `loading`: refresh/re-fetch sets loading true while
  // session is still valid, which used to flash guest "Log in / Sign up" (worse under dev Strict Mode).
  if (authenticated) {
    return (
      <div className="flex items-center gap-3" suppressHydrationWarning>
        {verified && (
          <>
            <CreditCounter variant="badge" showClaimButton={true} className="flex shrink-0" />
            <div className="hidden sm:block h-5 w-px bg-border shrink-0" aria-hidden />
          </>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5">
          {verified ? (
            <>
              <NotificationBell />
              {isAdmin ? (
                <>
                  <Link
                    href="/admin/dashboard"
                    aria-current={onAdminPage ? 'page' : undefined}
                    className={cn(
                      buttonVariants({ size: 'sm', variant: onAdminPage ? 'secondary' : 'default' }),
                      'h-8 rounded-full px-3 text-sm font-medium shadow-none',
                      onAdminPage && 'ring-2 ring-amber-500/45 dark:ring-amber-400/40'
                    )}
                  >
                    Admin
                  </Link>
                  <Link
                    href={chrome === 'investor' ? '/vc/profile' : '/founder/dashboard'}
                    className={cn(
                      'hidden sm:inline-flex',
                      buttonVariants({ size: 'sm', variant: 'outline' }),
                      'h-8 rounded-full border-border/80 px-3 text-sm font-medium shadow-none'
                    )}
                  >
                    {chrome === 'investor' ? 'Listing' : 'Hub'}
                  </Link>
                </>
              ) : (
                <Link
                  href={chrome === 'investor' ? '/vc/profile' : '/founder/dashboard'}
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'outline' }),
                    'h-8 rounded-full border-border/80 px-3 text-sm font-medium shadow-none'
                  )}
                >
                  {chrome === 'investor' ? 'Listing' : 'Hub'}
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/founder/onboarding"
              className={cn(buttonVariants({ size: 'sm' }), 'h-8 rounded-full px-3 text-sm font-medium shadow-none')}
            >
              Onboarding
            </Link>
          )}
          <Link
            href="/account"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'hidden h-8 rounded-full px-2.5 sm:inline-flex'
            )}
            aria-label="Account"
          >
            <User className="h-4 w-4" />
            <span className="hidden md:inline ml-1.5 text-sm">Account</span>
          </Link>
          <LogoutButton />
        </div>
      </div>
    )
  }

  const guestSessionPending = !mounted || loading

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        guestSessionPending && 'pointer-events-none opacity-60 motion-reduce:opacity-100'
      )}
      suppressHydrationWarning
      aria-busy={guestSessionPending}
      aria-label={guestSessionPending ? 'Checking sign-in status' : undefined}
    >
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 rounded-full px-3 text-sm font-medium')}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className={cn(buttonVariants({ size: 'sm' }), 'h-8 rounded-full px-3 text-sm font-medium shadow-none')}
      >
        Sign up
      </Link>
    </div>
  )
})
