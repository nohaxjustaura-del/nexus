import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, User, Settings, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Account</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                <p className="text-lg font-medium capitalize">{user.userType || 'Founder'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email Verified</label>
                <p className="text-lg font-medium">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>Access your features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.userType === 'founder' || !user.userType ? (
                <>
                  <Link href="/founder/discover">
                    <Button variant="outline" className="w-full justify-between">
                      Discover VCs
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/onboarding">
                    <Button variant="outline" className="w-full justify-between">
                      Complete Profile
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/ai-analysis">
                    <Button variant="outline" className="w-full justify-between">
                      AI Analysis (Resume, Pitch Deck, Video)
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/my-analyses">
                    <Button variant="outline" className="w-full justify-between">
                      My Analysis Reports
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/founder/bookmarks">
                    <Button variant="outline" className="w-full justify-between">
                      My Bookmarks
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              ) : user.userType === 'investor' ? (
                <>
                  <Link href="/vc/dashboard">
                    <Button variant="outline" className="w-full justify-between">
                      VC Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/vc/claim">
                    <Button variant="outline" className="w-full justify-between">
                      Edit VC Profile
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
    console.error('Account page error:', error)
    redirect('/login?redirect=/account')
  }
}

