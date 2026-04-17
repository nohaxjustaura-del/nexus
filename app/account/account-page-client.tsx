'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AlertTriangle, ArrowRight, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FounderProfileEditor } from './profile/founder-profile-editor'
import { useAccountCapabilities } from '@/components/account-capabilities-provider'

export type AccountPageClientProps = {
  email: string
  emailVerified: boolean
  userType: string | null
  showFounderProfileEditor: boolean
}

export function AccountPageClient({
  email,
  emailVerified,
  userType,
  showFounderProfileEditor,
}: AccountPageClientProps) {
  const router = useRouter()
  const typeLabel = userType || 'founder'
  const isFounder = typeLabel === 'founder'
  const isMentor = typeLabel === 'mentor'
  const isVc = typeLabel === 'vc' || typeLabel === 'investor'

  const { capabilities: caps } = useAccountCapabilities()

  const canUseFounderWorkspace = isFounder && Boolean(caps?.hasFounderProfile)

  const investorHomeHref = caps?.hasInvestorProfile ? '/investor/dashboard' : '/investor/onboarding'
  const mentorHomeHref = '/mentor/dashboard'

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const emailNorm = email.trim().toLowerCase()
  const deleteEnabled = deleteConfirm.trim().toLowerCase() === emailNorm && !deleteSubmitting

  async function handleDeleteAccount() {
    if (!deleteEnabled) return
    setDeleteSubmitting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail: deleteConfirm.trim() }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setDeleteError(data.error || 'Something went wrong. Try again.')
        return
      }
      window.location.href = '/login'
    } catch {
      setDeleteError('Network error. Try again.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:py-14">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Account</h1>
          <p className="mt-2 text-muted-foreground">
            {showFounderProfileEditor
              ? 'Sign-in, profile, matching preferences, and workspace access'
              : 'Sign-in details and workspace access'}
          </p>
        </header>

        <div className="space-y-6">
          {!showFounderProfileEditor ? (
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
          ) : null}

          {showFounderProfileEditor ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Profile & settings</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Account type, contact, startup details, and matching preferences. Your sign-in email stays the same;
                  add an alternate email if you want founders or investors to reach you elsewhere.
                </p>
              </div>
              <FounderProfileEditor
                sessionEmail={email}
                account={{ email, emailVerified, userType }}
              />
            </div>
          ) : null}

          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Workspace</CardTitle>
              <CardDescription>
                {isVc
                  ? 'Investor accounts use the investor area: listing, matches, and extract tools.'
                  : isMentor
                    ? 'Mentor accounts use the mentor workspace for guidance and support workflows.'
                    : 'Founder accounts use the founder hub, discover, and analysis tools.'}
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
              ) : isMentor ? (
                <Button
                  type="button"
                  variant="default"
                  className="shadow-none"
                  onClick={() => router.push(mentorHomeHref)}
                >
                  Open mentor dashboard
                </Button>
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
                Plans & billing
              </CardTitle>
              <CardDescription>Add-ons, premium, and checkout</CardDescription>
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

          <Card className="border-destructive/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                Delete account
              </CardTitle>
              <CardDescription>
                Permanently remove your login and delete your profile, analyses, billing balance, messages tied to this
                account, and other data we store for you. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="delete-account-email">Type your email to confirm</Label>
                <Input
                  id="delete-account-email"
                  type="email"
                  autoComplete="off"
                  placeholder={email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  disabled={deleteSubmitting}
                  className="border-border"
                />
              </div>
              {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                disabled={!deleteEnabled}
                onClick={handleDeleteAccount}
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete my account permanently'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
