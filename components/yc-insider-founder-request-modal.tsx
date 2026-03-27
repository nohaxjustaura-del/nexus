'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast-simple'
import { X } from 'lucide-react'

export type YcFounderKey = 'william' | 'inigo'
export type YcRequestType = 'ask' | 'book'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  founderKey: YcFounderKey
  founderName: string
  requestType: YcRequestType
}

export function YcInsiderFounderRequestModal({
  open,
  onOpenChange,
  founderKey,
  founderName,
  requestType,
}: Props) {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setMessage('')
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const title =
    requestType === 'ask'
      ? `Question for ${founderName}`
      : `Book time with ${founderName}`

  const description =
    requestType === 'ask'
      ? 'Describe your question or context. The team will route it appropriately.'
      : 'Share what you want to cover and any timing preferences (timezone + windows).'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (trimmed.length < 8) {
      toast.error('Please add a bit more detail before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/yc-insider/founder-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ founderKey, requestType, message: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not submit. Try again.')
        return
      }
      toast.success('Request submitted. We will follow up by email.')
      onOpenChange(false)
    } catch {
      toast.error('Could not submit. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="yc-founder-request-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={() => !submitting && onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="yc-founder-request-title" className="text-lg font-semibold text-zinc-50">
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="yc-founder-message" className="text-zinc-200">
              Your message
            </Label>
            <Textarea
              id="yc-founder-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              minLength={8}
              maxLength={8000}
              placeholder={
                requestType === 'ask'
                  ? 'e.g. We are pre-seed B2B SaaS and want feedback on our YC one-liner…'
                  : 'e.g. PT: free Tue/Thu afternoons for a 25-min intro call. Topic: application review…'
              }
              className="resize-y border-zinc-600 bg-zinc-950/80 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
            >
              {submitting ? 'Sending…' : 'Submit request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
