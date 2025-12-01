'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileVideo, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function VideoPitchAnalysisPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/founder/ai-analysis">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to AI Analysis
            </Button>
          </Link>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FileVideo className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Video Pitch Analysis</CardTitle>
                <CardDescription>
                  Analyze your video pitches with AI-powered insights
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To analyze your video pitch, please use the main AI Analysis page where you can upload and analyze your video pitch along with other analysis tools.
            </p>
            <Link href="/founder/ai-analysis">
              <Button className="w-full">
                Go to AI Analysis
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

