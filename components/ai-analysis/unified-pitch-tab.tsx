'use client'

import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { Sparkles, AlertCircle, Layers, User, Video, FileText } from 'lucide-react'
import { PitchAnalysisReport } from '@/components/analysis/PitchAnalysisReport'
import {
  STRUCTURED_QA_KEYS,
  hasAnyStructuredAnswer,
  type StructuredQaAnswers,
} from '@/lib/unified-pitch/structured-qa'
import { CREDIT_COSTS } from '@/lib/constants'
import {
  getUserCreditsClient,
  invalidateUserCreditsClientCache,
} from '@/lib/client/user-credits-client'
import { cn } from '@/lib/utils'

const UNIFIED_CREDITS = CREDIT_COSTS.UNIFIED_PITCH
const REVIEWER_CREDITS = CREDIT_COSTS.VIDEO_PITCH.REVIEWER

type CreditsState = { credits: number; isPremium: boolean }

type ReviewerOption = { id: string; name: string }

/** AI path: rubric + optional ids. Human path: submission ack. */
type UnifiedPitchResultState =
  | { reviewSubmitted: true; message?: string; videoPitchId?: string }
  | (Record<string, unknown> & { reviewSubmitted?: false; videoPitchId?: string })

async function refreshCreditsCache(setCredits: Dispatch<SetStateAction<CreditsState | null>>) {
  invalidateUserCreditsClientCache()
  const { ok, data } = await getUserCreditsClient()
  if (ok) setCredits(data as CreditsState)
}

function postFormDataWithUploadProgress(
  url: string,
  formData: FormData,
  onUploadProgress: (pct: number) => void,
  onUploadFinished: () => void,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    xhr.responseType = 'text'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onUploadProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)))
      }
    }
    xhr.upload.onloadend = () => {
      onUploadProgress(100)
      onUploadFinished()
    }

    xhr.onload = () => {
      let data: unknown
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {}
      } catch {
        data = { parseError: true, snippet: String(xhr.responseText).slice(0, 200) }
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
      })
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.onabort = () => reject(new Error('Request aborted'))

    onUploadProgress(0)
    xhr.send(formData)
  })
}

export function UnifiedPitchTab() {
  const [answers, setAnswers] = useState<StructuredQaAnswers>({})
  const [deckFile, setDeckFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadFinished, setUploadFinished] = useState(false)
  const [serverSyntheticPct, setServerSyntheticPct] = useState(0)
  const serverStartRef = useRef<number>(0)
  const [result, setResult] = useState<UnifiedPitchResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [credits, setCredits] = useState<CreditsState | null>(null)
  const [reviewType, setReviewType] = useState<'ai' | 'reviewer'>('ai')
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null)
  const [reviewers, setReviewers] = useState<ReviewerOption[]>([])
  const [reviewersLoading, setReviewersLoading] = useState(false)

  useEffect(() => {
    getUserCreditsClient()
      .then(({ ok, data }) => {
        if (ok) setCredits(data as CreditsState)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (reviewType !== 'reviewer') {
      setSelectedReviewer(null)
      return
    }
    setReviewersLoading(true)
    fetch('/api/reviewers', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setReviewers(Array.isArray(d.reviewers) ? d.reviewers : []))
      .catch(() => setReviewers([]))
      .finally(() => setReviewersLoading(false))
  }, [reviewType])

  useEffect(() => {
    if (reviewType !== 'ai' || !analyzing || !uploadFinished) return
    serverStartRef.current = Date.now()
    setServerSyntheticPct(35)
    const id = window.setInterval(() => {
      const elapsed = Date.now() - serverStartRef.current
      // Ease toward ~92% over ~3 minutes so the bar keeps moving during long server work
      const t = Math.min(1, elapsed / 180_000)
      const eased = 35 + t * 57
      setServerSyntheticPct((prev) => Math.max(prev, Math.min(92, eased)))
    }, 800)
    return () => window.clearInterval(id)
  }, [analyzing, uploadFinished, reviewType])

  const hasDeck = !!(deckFile && deckFile.size > 0)
  const hasVideo = !!(videoFile && videoFile.size > 0)
  const canSubmit = hasAnyStructuredAnswer(answers) || hasDeck || hasVideo
  const creditCost = reviewType === 'reviewer' ? REVIEWER_CREDITS : UNIFIED_CREDITS

  const hasLargeUpload = hasDeck || hasVideo
  const progressBarValue = !analyzing
    ? 0
    : !uploadFinished
      ? hasLargeUpload
        ? Math.round((uploadPct / 100) * 35)
        : 30
      : Math.min(100, Math.round(serverSyntheticPct))

  const progressLabel = !analyzing
    ? ''
    : !uploadFinished && hasLargeUpload
      ? `Uploading files… ${uploadPct}%`
      : !uploadFinished
        ? 'Sending request…'
        : 'Analyzing on server (matching, scoring, market intel)…'

  const handleAnalyze = async () => {
    if (!canSubmit) {
      setError(
        'Add at least one non-empty answer in structured Q&A, or upload a deck or video file (empty files do not count).',
      )
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
    setUploadPct(0)
    setUploadFinished(false)
    setServerSyntheticPct(0)
    setError(null)
    setWarnings([])

    try {
      const formData = new FormData()
      formData.append('qa', JSON.stringify(answers))
      if (deckFile) formData.append('deck', deckFile)
      if (videoFile) formData.append('video', videoFile)
      formData.append('reviewType', reviewType)
      if (reviewType === 'reviewer' && selectedReviewer) formData.append('reviewerId', selectedReviewer)

      const { ok, status, data } = await postFormDataWithUploadProgress(
        '/api/analyze-unified-pitch',
        formData,
        (pct) => setUploadPct(pct),
        () => setUploadFinished(true),
      )

      setServerSyntheticPct(100)

      const payload = data as Record<string, unknown>

      if (!ok) {
        if (status === 402) {
          setError((payload.message as string) || 'Insufficient credits.')
          await refreshCreditsCache(setCredits)
          return
        }
        if (status === 404 && typeof payload.redirectTo === 'string') {
          window.location.replace(payload.redirectTo as string)
          return
        }
        throw new Error(
          (payload.message as string) || (payload.error as string) || 'Analysis failed',
        )
      }

      if (payload.parseError) {
        throw new Error('Invalid response from server. Try again or check the dev console.')
      }

      if (payload.reviewId) {
        setResult({
          reviewSubmitted: true,
          message: typeof payload.message === 'string' ? payload.message : undefined,
          videoPitchId: typeof payload.videoPitchId === 'string' ? payload.videoPitchId : undefined,
        })
        setWarnings((payload.warnings as string[]) || [])
      } else {
        const analysis = (payload.analysis as Record<string, unknown> | undefined) ?? {}
        setResult({
          ...analysis,
          videoPitchId: typeof payload.videoPitchId === 'string' ? payload.videoPitchId : undefined,
          universityPrograms: Array.isArray(payload.universityPrograms) ? payload.universityPrograms : (analysis.universityPrograms ?? []),
          nichePrograms: Array.isArray(payload.nichePrograms) ? payload.nichePrograms : (analysis.nichePrograms ?? []),
        })
        setWarnings((payload.warnings as string[]) || [])
      }

      await refreshCreditsCache(setCredits)

      requestAnimationFrame(() => {
        document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setAnalyzing(false)
      setUploadFinished(false)
      setUploadPct(0)
      setServerSyntheticPct(0)
    }
  }

  const fileInputClass =
    'w-full max-w-full text-sm text-muted-foreground file:mr-3 file:inline-flex file:h-9 file:cursor-pointer file:items-center file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium file:text-foreground'

  return (
    <div className="w-full space-y-8">
      <Card className="overflow-hidden border-border/80 bg-card/80 shadow-sm ring-1 ring-border/40">
        <CardHeader className="space-y-3 border-b border-border/80 bg-muted/20 pb-6 pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <Layers className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-lg font-semibold tracking-tight">Unified pitch</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Add structured answers and any supporting files. At least one input is required.{' '}
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
              <h2 className="text-sm font-medium text-foreground">Structured Q&A</h2>
              <p className="mt-1 text-xs leading-normal text-muted-foreground">
                Optional but recommended: answer the prompts that fit your stage.
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
                Deck and/or recording: both optional if your Q&A is detailed enough.
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
            </div>
          </section>

          <div className="h-px bg-border" aria-hidden />

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Review type
            </div>
            <div
              role="radiogroup"
              aria-label="Review type"
              className="grid grid-cols-1 rounded-xl border border-border/80 bg-muted/10 md:grid-cols-2"
            >
              <button
                type="button"
                role="radio"
                aria-checked={reviewType === 'ai'}
                onClick={() => setReviewType('ai')}
                className={cn(
                  'relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-t-xl border-b border-border p-5 text-center transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0 md:rounded-l-xl md:border-b-0 md:border-r md:border-border md:p-6',
                  reviewType === 'ai'
                    ? 'z-[1] bg-primary/[0.08] shadow-[0_0_0_2px_hsl(var(--primary))]'
                    : 'hover:bg-muted/35',
                )}
              >
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                  AI analysis
                </div>
                <p className="max-w-[18rem] text-center text-xs leading-snug text-muted-foreground">
                  {UNIFIED_CREDITS} credits · rubric, feedback, and investor matching
                </p>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={reviewType === 'reviewer'}
                onClick={() => setReviewType('reviewer')}
                className={cn(
                  'relative flex min-h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-b-xl p-5 text-center transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:min-h-0 md:rounded-r-xl md:p-6',
                  reviewType === 'reviewer'
                    ? 'z-[1] bg-primary/[0.08] shadow-[0_0_0_2px_hsl(var(--primary))]'
                    : 'hover:bg-muted/35',
                )}
              >
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
                  <User className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                  Human reviewer
                </div>
                <p className="max-w-[18rem] text-center text-xs leading-snug text-muted-foreground">
                  {REVIEWER_CREDITS} credits · expert review of your submission
                </p>
              </button>
            </div>
            {reviewType === 'reviewer' && (
              <div className="space-y-2 pt-1">
                <Label htmlFor="reviewer">Reviewer</Label>
                {reviewersLoading ? (
                  <p className="text-sm text-muted-foreground">Loading reviewers…</p>
                ) : reviewers.length === 0 ? (
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">No reviewers are listed yet</p>
                    <p className="mt-1.5 text-xs">
                      Human review only shows people on your team who are onboarded as reviewers (active, verified, and
                      marked VC-accepted in the database). If this is a fresh environment, use{' '}
                      <span className="font-medium text-foreground">AI analysis</span> for now, or add{' '}
                      <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem] text-foreground">Reviewer</code> rows
                      via Prisma. In local <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem] text-foreground">npm run dev</code>, anyone with{' '}
                      <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem] text-foreground">active: true</code>{' '}
                      appears in this list.
                    </p>
                  </div>
                ) : (
                  <>
                    <select
                      id="reviewer"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={selectedReviewer || ''}
                      onChange={(e) => setSelectedReviewer(e.target.value || null)}
                    >
                      <option value="">Auto-assign next available</option>
                      {reviewers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Leave &quot;Auto-assign&quot; to pick the best available reviewer, or choose a specific person.
                    </p>
                  </>
                )}
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
            {warnings.map((w, i) => (
              <li key={`${i}-${w.slice(0, 48)}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {analyzing && reviewType === 'ai' && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">{progressLabel}</p>
          <Progress value={progressBarValue} className="h-3" />
          <p className="text-xs text-muted-foreground">
            Upload share of the bar is exact; server work is a time-based estimate (runs can take 30s–several minutes).
          </p>
        </div>
      )}

      {analyzing && reviewType === 'reviewer' && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium text-foreground">
            {!uploadFinished && hasLargeUpload
              ? `Uploading files… ${uploadPct}%`
              : !uploadFinished
                ? 'Sending request…'
                : 'Submitting for human review…'}
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <Button size="lg" onClick={handleAnalyze} disabled={analyzing || !canSubmit} className="gap-2">
          {analyzing ? (
            reviewType === 'reviewer' ? (
              'Submitting…'
            ) : (
              'Analyzing…'
            )
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
          <PitchAnalysisReport result={result} />
          {typeof result.videoPitchId === 'string' && result.videoPitchId.length > 0 && (
            <div className="space-y-3 border-t border-border pt-6">
              <p className="text-center text-sm text-muted-foreground">
                This run is saved to your account. Open the same breakdown anytime.
              </p>
              <Link href={`/founder/analyses/${result.videoPitchId}`} className="block">
                <Button variant="outline" className="w-full">
                  View full analysis
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
