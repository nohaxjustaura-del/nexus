'use client'

import { useState, useEffect, memo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { NotificationBell } from '@/components/notification-bell'
import { User } from 'lucide-react'
import { useAuthSession } from '@/components/auth-session-provider'
import { cn } from '@/lib/utils'

export const NavAuth = memo(function NavAuth() {
  const pathname = usePathname()
  const { loading, authenticated, verified, isAdmin, user } = useAuthSession()
  const isInvestorPortal = user?.userType === 'vc' || user?.userType === 'investor'
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
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
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
                      'h-9 rounded-full px-4 text-sm font-semibold shadow-none',
                      onAdminPage && 'ring-2 ring-amber-500/45 dark:ring-amber-400/40'
                    )}
                  >
                    Admin
                  </Link>
                  {!onAdminPage && (
                    <Link
                      href={isInvestorPortal ? '/investor/profile' : '/founder/dashboard'}
                      className={cn(
                        'hidden sm:inline-flex lg:hidden',
                        buttonVariants({ size: 'sm', variant: 'outline' }),
                        'h-9 rounded-full border-border/80 px-3.5 text-sm font-medium shadow-none'
                      )}
                    >
                      {isInvestorPortal ? 'Profile' : 'Hub'}
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href={isInvestorPortal ? '/investor/profile' : '/founder/dashboard'}
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'outline' }),
                    'h-9 rounded-full border-border/80 px-3.5 text-sm font-medium shadow-none lg:hidden'
                  )}
                >
                  {isInvestorPortal ? 'Profile' : 'Hub'}
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/founder/onboarding"
              className={cn(buttonVariants({ size: 'sm' }), 'h-9 rounded-full px-4 text-sm font-semibold shadow-none')}
            >
              Onboarding
            </Link>
          )}
          {!onAdminPage && (
            <Link
              href="/account"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'hidden h-9 rounded-full px-3 sm:inline-flex'
              )}
              aria-label="Account"
            >
              <User className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5 text-sm">Account</span>
            </Link>
          )}
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
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-9 rounded-full border-border/60 bg-muted/20 px-4 text-sm font-medium shadow-none hover:bg-muted/40'
        )}
      >
        Log in
      </Link>
      <Link
        href="/signup"
        className={cn(buttonVariants({ size: 'sm' }), 'h-9 rounded-full px-4 text-sm font-semibold shadow-none')}
      >
        Sign up
      </Link>
    </div>
  )
})
