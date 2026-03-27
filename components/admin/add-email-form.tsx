'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type AddEmailFormProps = {
  onSuccess?: () => void
}

export function AddEmailForm({ onSuccess }: AddEmailFormProps = {}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/users/add-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ type: 'success', text: `Added ${email} to pending approvals` })
        setEmail('')
        onSuccess?.()
        setTimeout(() => {
          router.refresh()
        }, 500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add email' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to add email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:gap-2">
        <Input
          type="email"
          placeholder="Email to add as pending"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={loading}
        />
        <Button type="submit" disabled={loading} size="sm" className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 sm:mr-1" />}
          <span className="hidden sm:inline">Add</span>
        </Button>
      </div>
      {message && (
        <p className={`text-sm sm:mt-1 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</p>
      )}
    </form>
  )
}
