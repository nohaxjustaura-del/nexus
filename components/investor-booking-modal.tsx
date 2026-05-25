'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast-simple'

export type InvestorBookingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerSlug: string
  founderName: string
  /** Shown under the name in the modal header for context. */
  founderRole: string
  calendlyUrl: string
}

export function InvestorBookingModal({
  open,
  onOpenChange,
  partnerSlug,
  founderName,
  founderRole,
  calendlyUrl,
}: InvestorBookingModalProps) {
  const [purpose, setPurpose] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const purposeRef = useRef<HTMLInputElement>(null)

  // Reset fields when modal opens/closes
  useEffect(() => {
    if (!open) {
      setPurpose('')
      setDetails('')
      setSubmitting(false)
    } else {
      // Auto-focus purpose input on next tick
      setTimeout(() => purposeRef.current?.focus(), 50)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onOpenChange(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, submitting, onOpenChange])

  if (!open) return null

  const purposeTrimmed = purpose.trim()
  const canSubmit = purposeTrimmed.length >= 3 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/network/booking-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partnerSlug,
          founderName,
          purpose: purposeTrimmed,
          details: details.trim() || undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg =
          res.status === 429
            ? "You've submitted several requests recently. Please wait before booking again."
            : res.status === 403
            ? 'Network access is required to book meetings.'
            : res.status === 401
            ? 'Your session expired. Please sign in again.'
            : typeof data.error === 'string'
            ? data.error
            : 'Could not save your request. Please try again.'
        toast.error(msg)
        return
      }

      const bookingId: string = typeof data.bookingId === 'string' ? data.bookingId : ''
      const sep = calendlyUrl.includes('?') ? '&' : '?'
      const enrichedUrl = bookingId
        ? `${calendlyUrl}${sep}utm_content=${encodeURIComponent(bookingId)}`
        : calendlyUrl

      onOpenChange(false)

      if (window.Calendly) {
        window.Calendly.initPopupWidget({ url: enrichedUrl })
      } else {
        window.open(enrichedUrl, '_blank', 'noopener,noreferrer')
        toast.info('Opening the scheduler in a new tab...')
      }
    } catch {
      toast.error('Could not save your request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="investor-booking-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => !submitting && onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="investor-booking-title"
              className="text-lg font-semibold text-zinc-50"
            >
              Book a meeting with {founderName}
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">{founderRole}</p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => !submitting && onOpenChange(false)}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 rounded-lg border border-zinc-700/80 bg-zinc-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Before scheduling
            </p>

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label
                htmlFor="booking-purpose"
                className="text-zinc-200"
              >
                What&apos;s the purpose of this meeting?{' '}
                <span className="text-zinc-500">(required)</span>
              </Label>
              <Input
                id="booking-purpose"
                ref={purposeRef}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value.slice(0, 200))}
                placeholder="e.g. Intro call to discuss seed round fit"
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/50"
                disabled={submitting}
                maxLength={200}
                autoComplete="off"
              />
              {purpose.length > 150 && (
                <p className="text-right text-xs text-zinc-500">
                  {purpose.length}/200
                </p>
              )}
            </div>

            {/* Details */}
            <div className="space-y-1.5">
              <Label
                htmlFor="booking-details"
                className="text-zinc-200"
              >
                Additional details{' '}
                <span className="text-zinc-500">(optional)</span>
              </Label>
              <Textarea
                id="booking-details"
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Company stage, specific questions, anything helpful for context"
                className="border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/50"
                rows={4}
                disabled={submitting}
                maxLength={1000}
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            After saving, you&apos;ll pick a time directly in the scheduling
            window. You&apos;ll receive a calendar invite once confirmed.
          </p>

          <Button
            type="submit"
            className="w-full bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
            disabled={!canSubmit}
          >
            {submitting ? 'Saving…' : 'Continue to scheduling →'}
          </Button>
        </form>
      </div>
    </div>
  )
}
