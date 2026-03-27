'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, AlertCircle, User, Video, FileText, CheckCircle, Lightbulb, Layers } from 'lucide-react'
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
  const [narrative, setNarrative] = useState('')
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
  const hasNarrative = narrative.trim().length > 0
  const canSubmit = hasQa || hasNarrative || !!deckFile || !!videoFile
  const creditCost = reviewType === 'reviewer' ? REVIEWER_CREDITS : UNIFIED_CREDITS

  const fileInputClass =
    'w-full max-w-full text-sm text-muted-foreground file:mr-3 file:inline-flex file:h-9 file:cursor-pointer file:items-center file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium file:text-foreground'

  const handleAnalyze = async () => {
    if (!canSubmit) {
      setError('Add at least one: structured Q&A answers, a pitch narrative, a deck file, or a video.')
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
      if (narrative.trim()) formData.append('narrative', narrative.trim())
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
    <div className="w-full space-y-8">
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-sm ring-1 ring-border/40">
        <CardHeader className="space-y-3 border-b border-border/80 bg-muted/20 pb-6 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Layers className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Full pitch review</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Add structured answers and any supporting files or notes—at least one input is required.{' '}
                <span className="text-foreground">
                  {UNIFIED_CREDITS} credits (AI) · {REVIEWER_CREDITS} credits (human review)
                </span>
                .
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-10 pt-8">
          <section className="space-y-5">
            <div>
              <h2 className="text-sm font-medium text-foreground">Structured Q&amp;A</h2>
              <p className="mt-1 text-xs leading-normal text-muted-foreground">
                Optional but recommended—answer the prompts that fit your stage.
              </p>
            </div>
            <div className="space-y-5">
              {STRUCTURED_QA_KEYS.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="text-sm font-normal text-foreground">
                    {label}
                  </Label>
                  <Textarea
                    id={key}
                    rows={3}
                    value={answers[key] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                    placeholder="Your answer…"
                    className="min-h-[5.5rem] resize-y"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="h-px bg-border" aria-hidden />

          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-foreground">Supporting materials</h2>
              <p className="mt-1 text-xs leading-normal text-muted-foreground">
                Deck, recording, and written context live in one place—add any combination; all are optional if your
                Q&amp;A is enough.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/10">
              <div className="grid md:grid-cols-2 md:divide-x md:divide-border">
                <div className="flex flex-col gap-3 border-b border-border p-5 md:border-b-0 md:p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                    Deck file
                  </div>
                  <p className="text-xs text-muted-foreground">PDF or PPTX</p>
                  <input
                    type="file"
                    accept=".pdf,.pptx,.ppt,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    onChange={(e) => setDeckFile(e.target.files?.[0] || null)}
                    className={fileInputClass}
                  />
                  {deckFile && (
                    <p className="truncate text-xs text-muted-foreground" title={deckFile.name}>
                      {deckFile.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 p-5 md:p-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Video className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                    Video file
                  </div>
                  <p className="text-xs text-muted-foreground">MP4, MOV, or WebM</p>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className={fileInputClass}
                  />
                  {videoFile && (
                    <p className="truncate text-xs text-muted-foreground" title={videoFile.name}>
                      {videoFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-border bg-background/40 p-5 md:p-6">
                <div className="space-y-2">
                  <Label htmlFor="pitch-narrative" className="text-sm font-normal text-foreground">
                    Written pitch <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    One-pager, memo, or elevator pitch—anything not already covered above.
                  </p>
                  <Textarea
                    id="pitch-narrative"
                    rows={5}
                    value={narrative}
                    onChange={(e) => setNarrative(e.target.value)}
                    placeholder="Paste or type your pitch summary here…"
                    className="min-h-[7.5rem] resize-y"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-border" aria-hidden />

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Review type
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="reviewType"
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={reviewType === 'ai'}
                  onChange={() => setReviewType('ai')}
                />
                <span>AI analysis ({UNIFIED_CREDITS} credits)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="radio"
                  name="reviewType"
                  className="h-4 w-4 shrink-0 accent-primary"
                  checked={reviewType === 'reviewer'}
                  onChange={() => setReviewType('reviewer')}
                />
                <span>Human reviewer ({REVIEWER_CREDITS} credits)</span>
              </label>
            </div>
            {reviewType === 'reviewer' && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="reviewer">Reviewer</Label>
                <select
                  id="reviewer"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              </div>
            )}
          </section>
        </CardContent>
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
