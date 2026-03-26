import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, User, Settings, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ADMIN_EMAIL } from '@/lib/constants'

export default async function AccountPage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/login?redirect=/account')
    }

    if (!user.emailVerified) {
      redirect(`/verify?redirect=/account&email=${encodeURIComponent(user.email)}`)
    }

    return (
    <div className="min-h-screen bg-card">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">Account</h1>
          <p className="text-muted-foreground">Manage your settings and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Info */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="text-base font-medium text-foreground mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Account Type</label>
                <p className="text-base font-medium text-foreground mt-1 capitalize">{user.userType || 'Founder'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Status</label>
                <p className="text-base font-medium mt-1">
                  {user.emailVerified ? (
                    <span className="text-green-600">✓ Verified</span>
                  ) : (
                    <span className="text-red-600">Not Verified</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.userType === 'founder' || !user.userType ? (
                <>
                  <Link href="/founder/discover">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Discover VCs
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/ai-analysis">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Pitch analysis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/my-analyses">
                    <Button variant="outline" className="w-full justify-between border-border">
                      My Analyses
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/bookmarks">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Bookmarks
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/credits">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Credits
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  {user.email === ADMIN_EMAIL && (
                    <Link href="/founder/vc-database">
                      <Button variant="outline" className="w-full justify-between border-border">
                        VC Database (Admin)
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </>
              ) : user.userType === 'investor' ? (
                <>
                  <Link href="/vc/dashboard">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/vc/claim">
                    <Button variant="outline" className="w-full justify-between border-border">
                      Edit Profile
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
  } catch (error) {
    const err = error as { digest?: string; message?: string }
    if (typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Account page error:', error)
    redirect('/login?redirect=/account')
  }
}

