'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast-simple'
import type { ExtractedVcProfile } from '@/lib/vc-profile-extraction'
import { FileText, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'vc_listing_draft_v1'

export default function VCExtractPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedVcProfile | null>(null)

  async function runExtract() {
    setLoading(true)
    setExtracted(null)
    try {
      let res: Response
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        if (text.trim()) fd.append('text', text.trim())
        res = await fetch('/api/vc/extract-from-text', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        })
      } else {
        res = await fetch('/api/vc/extract-from-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text }),
        })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed')
      }
      setExtracted(data.extracted as ExtractedVcProfile)
      toast.success('Extracted. Review and send to your listing.')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function applyToListing() {
    if (!extracted) return
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(extracted))
    } catch {
      toast.error('Could not save draft')
      return
    }
    router.push('/vc/profile')
  }

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-page-mesh" aria-hidden />
      <div className="page-shell-narrow">
        <header className="mb-10">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Investors</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Extract from memo or site copy
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Paste text from your website, LP deck, or internal thesis notes. We&apos;ll suggest fields you can edit on
            your listing before saving, so founders see accurate stage, checks, and how to apply.
          </p>
        </header>

        <div className="space-y-6 rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="vc-text" className="text-foreground">
              Text
            </Label>
            <Textarea
              id="vc-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste fund description, investment criteria, or application instructions…"
              rows={10}
              className="min-h-[200px] border-border bg-background text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vc-file" className="text-foreground">
              Optional PDF
            </Label>
            <input
              id="vc-file"
              type="file"
              accept=".pdf,application/pdf"
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">PDF text is combined with anything you pasted above.</p>
          </div>

          <Button
            type="button"
            className="w-full gap-2 sm:w-auto"
            disabled={loading || (!text.trim() && !file)}
            onClick={() => void runExtract()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Run extraction
          </Button>
        </div>

        {extracted && (
          <div className="mt-10 space-y-4 rounded-2xl border border-primary/25 bg-primary/5 p-6">
            <div className="flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Suggested listing</span>
            </div>
            <dl className="grid gap-3 text-sm text-muted-foreground">
              {extracted.firmName && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Firm</dt>
                  <dd className="text-foreground">{extracted.firmName}</dd>
                </div>
              )}
              {extracted.thesis && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Thesis</dt>
                  <dd className="text-foreground">{extracted.thesis}</dd>
                </div>
              )}
              {extracted.founderNotes && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">For founders (process / tips)</dt>
                  <dd className="text-foreground">{extracted.founderNotes}</dd>
                </div>
              )}
              {(extracted.checkMin != null || extracted.checkMax != null) && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Checks ($K)</dt>
                  <dd className="text-foreground">
                    {extracted.checkMin ?? '-'} - {extracted.checkMax ?? '-'}
                  </dd>
                </div>
              )}
              {extracted.stages?.length > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Stages</dt>
                  <dd className="text-foreground">{extracted.stages.join(', ')}</dd>
                </div>
              )}
              {extracted.sectors?.length > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Sectors</dt>
                  <dd className="text-foreground">{extracted.sectors.join(', ')}</dd>
                </div>
              )}
              {extracted.geoFocus?.length > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Geography</dt>
                  <dd className="text-foreground">{extracted.geoFocus.join(', ')}</dd>
                </div>
              )}
              {extracted.applicationUrl && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground/80">Apply URL</dt>
                  <dd className="break-all text-primary">{extracted.applicationUrl}</dd>
                </div>
              )}
            </dl>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" onClick={applyToListing}>
                Open listing editor with this draft
              </Button>
              <Link href="/vc/profile" className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}>
                Edit listing manually
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
