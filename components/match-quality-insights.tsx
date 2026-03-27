'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  Target,
  Lightbulb,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BarChart3,
} from "lucide-react"
import Link from "next/link"

interface MatchQualityInsightsProps {
  analyses: any[]
  founderProfile: any
  matches: any[]
}

export function MatchQualityInsights({ analyses, founderProfile, matches }: MatchQualityInsightsProps) {
  // Calculate profile completeness
  const calculateCompleteness = () => {
    if (!founderProfile) return 0
    
    const fields = [
      founderProfile.name,
      founderProfile.startupName,
      founderProfile.bio,
      founderProfile.stage,
      founderProfile.sectors,
      founderProfile.location,
      founderProfile.fundingNeed,
      founderProfile.pitchDeck,
      founderProfile.videoPitchUrl,
      founderProfile.linkedinUrl,
    ]
    
    const filledFields = fields.filter(f => f && f !== '' && f !== '[]').length
    return Math.round((filledFields / fields.length) * 100)
  }

  const completeness = calculateCompleteness()

  // Get latest analysis
  const latestAnalysis = analyses.length > 0 ? analyses[0] : null
  const latestMatches = latestAnalysis?.result?.matches || matches || []

  // Extract match reasons
  const getMatchReasons = () => {
    if (latestMatches.length === 0) return []
    
    const reasons: string[] = []
    latestMatches.slice(0, 3).forEach((match: any) => {
      if (match.reasons && match.reasons.length > 0) {
        reasons.push(...match.reasons.slice(0, 2))
      }
    })
    return [...new Set(reasons)].slice(0, 5)
  }

  const matchReasons = getMatchReasons()

  // Get improvement suggestions
  const getImprovementSuggestions = () => {
    const suggestions: string[] = []
    
    if (completeness < 70) {
      suggestions.push('Complete your profile to unlock more matches')
    }
    
    if (!founderProfile?.videoPitchUrl) {
      suggestions.push('Add a video pitch to increase matches by 30%')
    }
    
    if (!founderProfile?.pitchDeck) {
      suggestions.push('Upload a pitch deck to get detailed feedback')
    }
    
    if (latestAnalysis && latestAnalysis.compatibilityScore < 70) {
      suggestions.push('Improve your pitch clarity and traction metrics')
    }
    
    if (latestMatches.length < 5) {
      suggestions.push('Refine your sector and stage to match more VCs')
    }
    
    return suggestions.slice(0, 4)
  }

  const suggestions = getImprovementSuggestions()

  // Calculate average match score
  const avgMatchScore = latestMatches.length > 0
    ? Math.round(latestMatches.reduce((sum: number, m: any) => sum + (m.score || 0), 0) / latestMatches.length)
    : 0

  // Track score improvement
  const getScoreTrend = () => {
    if (analyses.length < 2) return null
    
    const scores = analyses
      .filter(a => a.compatibilityScore > 0)
      .map(a => a.compatibilityScore)
      .slice(0, 5)
    
    if (scores.length < 2) return null
    
    const latest = scores[0]
    const previous = scores[1]
    const change = latest - previous
    
    return {
      change,
      percentage: previous > 0 ? Math.round((change / previous) * 100) : 0,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  const scoreTrend = getScoreTrend()

  return (
    <div className="space-y-6">
      {/* Profile Completeness */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Profile Completeness
            </CardTitle>
            <Badge variant={completeness >= 80 ? "default" : "secondary"}>
              {completeness}%
            </Badge>
          </div>
          <CardDescription>
            Complete your profile to unlock more VC matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completeness} className="mb-4" />
          {completeness < 100 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Missing fields:</p>
              <ul className="text-sm text-slate-600 space-y-1">
                {!founderProfile?.videoPitchUrl && (
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Video pitch URL
                  </li>
                )}
                {!founderProfile?.pitchDeck && (
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Pitch deck
                  </li>
                )}
                {!founderProfile?.bio && (
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Bio
                  </li>
                )}
                {!founderProfile?.linkedinUrl && (
                  <li className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    LinkedIn URL
                  </li>
                )}
              </ul>
              <Link href="/founder/onboarding">
                <Button variant="outline" size="sm" className="mt-3">
                  Complete Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match Quality Score */}
      {latestAnalysis && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Match Quality Score
              </CardTitle>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  {Math.round(latestAnalysis.compatibilityScore || 0)}
                </div>
                <div className="text-xs text-slate-600">out of 100</div>
              </div>
            </div>
            <CardDescription>
              {latestAnalysis.compatibilityScore >= 80
                ? 'Excellent! You\'re matching with top-tier VCs'
                : latestAnalysis.compatibilityScore >= 60
                ? 'Good matches. Focus on the suggestions below to improve'
                : 'Room for improvement. Check suggestions below'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scoreTrend && (
              <div className="mb-4 p-3 rounded-lg bg-slate-50 border">
                <div className="flex items-center gap-2">
                  {scoreTrend.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : scoreTrend.trend === 'down' ? (
                    <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-medium">
                    {scoreTrend.trend === 'up' ? 'Improved' : scoreTrend.trend === 'down' ? 'Decreased' : 'Stable'} by{' '}
                    {Math.abs(scoreTrend.change)} points ({Math.abs(scoreTrend.percentage)}%)
                  </span>
                </div>
              </div>
            )}
            {avgMatchScore > 0 && (
              <div className="text-sm text-slate-600">
                Average match score: <span className="font-semibold">{avgMatchScore}%</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Why You Matched */}
      {matchReasons.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Why You Matched
            </CardTitle>
            <CardDescription>
              Top reasons VCs are interested in your startup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {matchReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700">{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Improvement Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              How to Improve Your Matches
            </CardTitle>
            <CardDescription>
              Actionable steps to increase your VC match rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-amber-100 mt-0.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-slate-700 flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Link href="/founder/ai-analysis">
                <Button size="sm" variant="outline">
                  Analyze Pitch
                </Button>
              </Link>
              <Link href="/founder/discover">
                <Button size="sm">
                  View Matches
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


