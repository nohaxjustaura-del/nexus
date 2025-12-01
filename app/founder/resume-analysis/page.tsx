'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Video, Presentation } from 'lucide-react'
import Link from 'next/link'

export default function ResumeAnalysisDisabledPage() {
  const router = useRouter()

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/founder/video-pitch')
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-orange-200">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-orange-100">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Feature No Longer Available</CardTitle>
              <CardDescription className="text-base mt-1">
                Resume analysis has been discontinued
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-slate-700">
              We've found that resumes don't effectively capture what makes founders and their startups compelling to investors. 
              Instead, we now offer two better ways to get AI-powered feedback and VC matches:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/founder/video-pitch" className="block">
              <Card className="h-full hover:shadow-lg transition-all border-2 hover:border-primary cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Video Pitch Analysis</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a video pitch and get expert feedback on your presentation, delivery, and content. 
                    Plus, get matched with VCs based on your pitch.
                  </p>
                  <Button className="w-full">
                    Analyze Video Pitch
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/founder/pitch-deck" className="block">
              <Card className="h-full hover:shadow-lg transition-all border-2 hover:border-primary cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Presentation className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Pitch Deck Analysis</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload your pitch deck and receive AI-powered feedback on your slides, messaging, and storytelling. 
                    Get VC recommendations too.
                  </p>
                  <Button className="w-full">
                    Analyze Pitch Deck
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Redirecting to Video Pitch Analysis in 5 seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
