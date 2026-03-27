'use client'

import Link from 'next/link'
import { ArrowRight, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type AccountPageClientProps = {
  email: string
  emailVerified: boolean
  userType: string | null
  isAdmin: boolean
}

export function AccountPageClient({
  email,
  emailVerified,
  userType,
  isAdmin,
}: AccountPageClientProps) {
  const typeLabel = userType || 'founder'
  const isFounder = typeLabel === 'founder'
  const isVc = typeLabel === 'vc' || typeLabel === 'investor'

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

          {isFounder && (
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
              {isFounder ? (
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
                      AI analysis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/credits" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Credits
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link href="/founder/vc-database" className="block">
                      <Button variant="outline" className="w-full justify-between border-border shadow-none">
                        VC database (admin)
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : isVc ? (
                <>
                  <Link href="/vc/dashboard" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/vc/claim" className="block">
                    <Button variant="outline" className="w-full justify-between border-border shadow-none">
                      Firm profile
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
