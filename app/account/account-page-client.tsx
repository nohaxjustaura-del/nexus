'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, CreditCard, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type AccountPageClientProps = {
  email: string
  emailVerified: boolean
  userType: string | null
}

export function AccountPageClient({
  email,
  emailVerified,
  userType,
}: AccountPageClientProps) {
  const router = useRouter()
  const typeLabel = userType || 'founder'
  const isFounder = typeLabel === 'founder'
  const isMentor = typeLabel === 'mentor'
  const isVc = typeLabel === 'vc' || typeLabel === 'investor'
  const isFounderPortal = isFounder || isMentor

  const [caps, setCaps] = useState<{
    hasFounderProfile?: boolean
    hasInvestorProfile?: boolean
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/account/capabilities', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.authenticated) {
          setCaps({
            hasFounderProfile: Boolean(d.hasFounderProfile),
            hasInvestorProfile: Boolean(d.hasInvestorProfile),
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const canEditFounderProfile = isFounder || isMentor || Boolean(caps?.hasFounderProfile)

  const canUseFounderWorkspace = Boolean(caps?.hasFounderProfile) || userType === 'mentor'

  const investorHomeHref = caps?.hasInvestorProfile ? '/investor/dashboard' : '/investor/onboarding'

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:py-14">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Account</h1>
          <p className="mt-2 text-muted-foreground">Sign-in details and shortcuts to your workspace</p>
        </header>

        <div className="space-y-6">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Workspace</CardTitle>
              <CardDescription>
                {isVc
                  ? 'Investor accounts use the VC area: listing, matches, and extract tools.'
                  : 'Founder and mentor accounts use the founder hub, discover, and analysis tools.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {isVc ? (
                <>
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-600/90 shadow-none"
                    onClick={() => router.push(investorHomeHref)}
                  >
                    {caps?.hasInvestorProfile ? 'Open investor listing' : 'Finish investor setup'}
                  </Button>
                  {!caps?.hasInvestorProfile && (
                    <p className="text-sm text-muted-foreground">
                      <Link href="/investor/onboarding" className="text-primary underline-offset-4 hover:underline">
                        Complete your investor onboarding
                      </Link>{' '}
                      if you have not yet.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="default"
                    className="shadow-none"
                    disabled={!canUseFounderWorkspace}
                    onClick={() => {
                      if (!canUseFounderWorkspace) return
                      router.push('/founder/dashboard')
                    }}
                  >
                    Open founder hub
                  </Button>
                  {caps && !canUseFounderWorkspace && (
                    <p className="text-sm text-muted-foreground">
                      <Link href="/onboarding/founder" className="text-primary underline-offset-4 hover:underline">
                        Set up your founder profile
                      </Link>{' '}
                      to use the hub and matching.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Plans & credits
              </CardTitle>
              <CardDescription>Credit packs, premium, and checkout</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Link href="/pricing">
                <Button variant="default" className="w-full justify-between">
                  View pricing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your account</CardTitle>
              <CardDescription>Used for login and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</span>
                <p className="text-base font-medium text-foreground">{email}</p>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</span>
                <p className="text-base font-medium text-foreground capitalize">{typeLabel}</p>
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email status</span>
                <p className="text-base font-medium">
                  {emailVerified ? (
                    <span className="text-emerald-600 dark:text-emerald-400">Verified</span>
                  ) : (
                    <span className="text-destructive">Not verified</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {canEditFounderProfile && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  Founder profile
                </CardTitle>
                <CardDescription>Onboarding details investors see in matching</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <Link href="/account/profile">
                  <Button variant="default" className="w-full justify-between">
                    Edit profile & startup info
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick links</CardTitle>
              <CardDescription>Jump back into the product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {isVc ? (
                <>
                  <Link href="/investor/dashboard" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Matched founders
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {!caps?.hasInvestorProfile && (
                    <Link href="/investor/onboarding" className="block">
                      <Button variant="outline" className="w-full justify-between border-border shadow-none">
                        Complete investor onboarding
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : isFounderPortal ? (
                <>
                  <Link href="/founder/dashboard" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Founder hub
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/discover" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Discover investors
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/ai-analysis" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Pitch analysis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/credits" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Credits
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-2">No shortcuts for this account type yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
