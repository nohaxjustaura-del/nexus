'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [topic, setTopic] = useState('')
  const [timezone, setTimezone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setTopic('')
      setTimezone('')
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
      ? 'Short subject plus details. The team will route it and reply by email.'
      : 'Topic, your timezone, and what you want to cover. We will follow up by email to schedule.'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTopic = topic.trim()
    const trimmedTz = timezone.trim()
    const trimmed = message.trim()

    if (trimmedTopic.length < 3) {
      toast.error('Please add a short topic or subject (at least 3 characters).')
      return
    }
    if (requestType === 'book' && trimmedTz.length < 2) {
      toast.error('Please add your timezone (e.g. America/Los_Angeles or CET).')
      return
    }
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
        body: JSON.stringify({
          founderKey,
          requestType,
          topic: trimmedTopic,
          timezone: trimmedTz,
          message: trimmed,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Could not submit. Try again.')
        return
      }
      toast.success('Request submitted. Check your email for confirmation.')
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 rounded-lg border border-zinc-700/80 bg-zinc-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Request</p>
            <div className="space-y-2">
              <Label htmlFor="yc-founder-topic" className="text-zinc-200">
                Topic / subject
              </Label>
              <Input
                id="yc-founder-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                minLength={3}
                maxLength={300}
                placeholder="e.g. YC one-liner feedback, or 25-min intro re: application"
                className="border-zinc-600 bg-zinc-950/80 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/40"
              />
            </div>
            {requestType === 'book' ? (
              <div className="space-y-2">
                <Label htmlFor="yc-founder-tz" className="text-zinc-200">
                  Your timezone
                </Label>
                <Input
                  id="yc-founder-tz"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="e.g. America/New_York or CET"
                  className="border-zinc-600 bg-zinc-950/80 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-amber-500/40"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yc-founder-message" className="text-zinc-200">
              Details
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
                  ? 'Context, links, and what you want answered…'
                  : 'What you want to cover, length of call, and any scheduling windows…'
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
