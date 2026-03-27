'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, AlertCircle, Layers, User, Video, FileText, CheckCircle, Lightbulb } from 'lucide-react'
import SmartMatchResults from '@/components/smart-match-results'
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard'
import { STRUCTURED_QA_KEYS, type StructuredQaAnswers } from '@/lib/unified-pitch/structured-qa'
import { CREDIT_COSTS } from '@/lib/constants'
import {
  getUserCreditsClient,
  invalidateUserCreditsClientCache,
} from '@/lib/client/user-credits-client'

const UNIFIED_CREDITS = CREDIT_COSTS.UNIFIED_PITCH
const REVIEWER_CREDITS = CREDIT_COSTS.VIDEO_PITCH.REVIEWER

export function UnifiedPitchTab() {
  const [answers, setAnswers] = useState<StructuredQaAnswers>({})
  const [deckFile, setDeckFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [credits, setCredits] = useState<{ credits: number; isPremium: boolean } | null>(null)
  const [reviewType, setReviewType] = useState<'ai' | 'reviewer'>('ai')
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null)
  const [reviewers, setReviewers] = useState<any[]>([])

  useEffect(() => {
    getUserCreditsClient()
      .then(({ ok, data }) => {
        if (ok) setCredits(data as { credits: number; isPremium: boolean })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (reviewType === 'reviewer') {
      fetch('/api/reviewers')
        .then((r) => r.json())
        .then((d) => setReviewers(d.reviewers || []))
        .catch(() => {})
    }
  }, [reviewType])

  const hasQa = STRUCTURED_QA_KEYS.some(({ key }) => !!(answers[key]?.trim()))
  const canSubmit = hasQa || !!deckFile || !!videoFile
  const creditCost = reviewType === 'reviewer' ? REVIEWER_CREDITS : UNIFIED_CREDITS

  const handleAnalyze = async () => {
    if (!canSubmit) {
      setError('Add at least one: Q&A answers, a pitch deck, or a video.')
      return
    }
    if (!credits) {
      setError('Loading credits… try again in a moment.')
      return
    }
    if (!credits.isPremium && (credits.credits ?? 0) < creditCost) {
      setError(
        `Insufficient credits. This run costs ${creditCost} credits; you have ${credits.credits ?? 0}.`,
      )
      return
    }
    setAnalyzing(true)
    setError(null)
    setWarnings([])

    try {
      const formData = new FormData()
      formData.append('qa', JSON.stringify(answers))
      if (deckFile) formData.append('deck', deckFile)
      if (videoFile) formData.append('video', videoFile)
      formData.append('reviewType', reviewType)
      if (reviewType === 'reviewer' && selectedReviewer) formData.append('reviewerId', selectedReviewer)

      const res = await fetch('/api/analyze-unified-pitch', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setError(data.message || 'Insufficient credits.')
          invalidateUserCreditsClientCache()
          const { ok, data: cr } = await getUserCreditsClient()
          if (ok) setCredits(cr as { credits: number; isPremium: boolean })
          setAnalyzing(false)
          return
        }
        if (res.status === 404 && data.redirectTo) {
          window.location.replace(data.redirectTo)
          return
        }
        throw new Error(data.message || data.error || 'Analysis failed')
      }

      if (data.reviewId) {
        setResult({ reviewSubmitted: true, message: data.message, videoPitchId: data.videoPitchId })
        setWarnings(data.warnings || [])
      } else {
        setResult({ ...data.analysis, videoPitchId: data.videoPitchId })
        setWarnings(data.warnings || [])
      }

      invalidateUserCreditsClientCache()
      const { ok, data: cr } = await getUserCreditsClient()
      if (ok) setCredits(cr as { credits: number; isPremium: boolean })

      setTimeout(() => {
        document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="border border-primary/25 bg-gradient-to-br from-primary/8 via-background to-violet-500/8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            One analysis — all your materials
          </CardTitle>
          <CardDescription>
            Add structured answers, an optional deck, and/or a video. We combine everything you provide;{' '}
            <span className="font-medium text-foreground">the more you share, the richer the score and investor matches</span>.{' '}
            At least one source required.{' '}
            <span className="font-medium text-foreground">{UNIFIED_CREDITS} credits</span> (AI) or{' '}
            <span className="font-medium text-foreground">{REVIEWER_CREDITS}</span> with human review.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Structured Q&A</CardTitle>
          <CardDescription>Optional but recommended — answer any questions that apply.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {STRUCTURED_QA_KEYS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Textarea
                id={key}
                rows={3}
                value={answers[key] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                placeholder="Your answer…"
                className="resize-y min-h-[72px]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-4 w-4" />
            Pitch deck (optional)
          </CardTitle>
          <CardDescription>PDF or PPTX</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={(e) => setDeckFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {deckFile && <p className="mt-2 text-sm text-muted-foreground">{deckFile.name}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-4 w-4" />
            Video pitch (optional)
          </CardTitle>
          <CardDescription>MP4, MOV, or WebM</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          {videoFile && <p className="mt-2 text-sm text-muted-foreground">{videoFile.name}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-4 w-4" />
            Review type
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reviewType"
              checked={reviewType === 'ai'}
              onChange={() => setReviewType('ai')}
            />
            AI analysis ({UNIFIED_CREDITS} credits)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="reviewType"
              checked={reviewType === 'reviewer'}
              onChange={() => setReviewType('reviewer')}
            />
            Human reviewer ({REVIEWER_CREDITS} credits)
          </label>
        </CardContent>
        {reviewType === 'reviewer' && (
          <CardContent className="pt-0">
            <Label htmlFor="reviewer">Reviewer</Label>
            <select
              id="reviewer"
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedReviewer || ''}
              onChange={(e) => setSelectedReviewer(e.target.value || null)}
            >
              <option value="">Select…</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
          <p className="font-medium">Warnings (analysis continued)</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-center">
        <Button size="lg" onClick={handleAnalyze} disabled={analyzing || !canSubmit} className="gap-2">
          {analyzing ? (
            'Analyzing…'
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Run analysis ({creditCost} credits)
            </>
          )}
        </Button>
      </div>

      {result?.reviewSubmitted && (
        <Card id="analysis-results" className="border-primary/30">
          <CardHeader>
            <CardTitle>Submitted for review</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {result && !result.reviewSubmitted && (
        <div id="analysis-results" className="space-y-6">
          {result.rubricAnalysis ? (
            <AnalysisDashboard
              result={result.rubricAnalysis}
              finalScore={result.finalScore ?? result.overallScore}
            />
          ) : (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Analysis results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="text-sm text-muted-foreground">Overall score</div>
                  <div className="text-3xl font-bold text-primary">
                    {result.overallScore ?? result.finalScore ?? 0}/100
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!result.rubricAnalysis && (
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 dark:bg-green-950/20">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Strengths
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {(result.strengths || []).map((s: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-600">✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4 dark:bg-orange-950/20">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Improvements
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {(result.weaknesses || []).map((s: string, i: number) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                {result.improvements?.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:bg-blue-950/20">
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      Suggestions
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {result.improvements.map((s: string, i: number) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {result.transcript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Combined pitch (excerpt)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-xs">
                  {result.transcript}
                </pre>
              </CardContent>
            </Card>
          )}

          <SmartMatchResults matches={result.matchedVCs || []} />
        </div>
      )}
    </div>
  )
}
