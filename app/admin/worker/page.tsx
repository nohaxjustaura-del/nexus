/**
 * WORKER STATUS DASHBOARD
 * 
 * Admin page to monitor background worker status
 */

'use client'

import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/toast-simple'

interface Job {
  id: string
  name: string
  status: 'idle' | 'running' | 'error'
  lastRun?: string
  nextRun?: string
  errorCount: number
}

interface WorkerStatus {
  running: boolean
  jobs: Job[]
}

export default function WorkerDashboard() {
  const [status, setStatus] = useState<WorkerStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/worker/status')
      if (!response.ok) throw new Error('Failed to fetch status')
      const data = await response.json()
      setStatus(data.status)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const triggerJob = async (jobType: string) => {
    setTriggering(jobType)
    try {
      const response = await fetch('/api/worker/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobType }),
      })
      
      if (!response.ok) throw new Error('Failed to trigger job')
      
      // Refresh status after trigger
      setTimeout(fetchStatus, 1000)
    } catch (err: any) {
      toast.error(`Failed to trigger job: ${err.message}`)
    } finally {
      setTriggering(null)
    }
  }

  useEffect(() => {
    fetchStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Background Worker Dashboard</h1>
          <p className="text-gray-400">Loading status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Background Worker Dashboard</h1>
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
            <p className="text-red-500">Error: {error}</p>
            <button
              onClick={fetchStatus}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statusEmoji = status?.running ? '✅' : '❌'
  const statusColor = status?.running ? 'text-green-500' : 'text-red-500'

  const getJobStatusColor = (job: Job) => {
    if (job.status === 'running') return 'bg-blue-500'
    if (job.status === 'error') return 'bg-red-500'
    return 'bg-gray-600'
  }

  const getJobStatusEmoji = (job: Job) => {
    if (job.status === 'running') return '🏃'
    if (job.status === 'error') return '❌'
    return '💤'
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleString()
  }

  const getJobType = (id: string): string => {
    if (id.includes('vc-thesis')) return 'vc-thesis-research'
    if (id.includes('vc-profile')) return 'vc-profile-research'
    if (id.includes('vc-directory')) return 'vc-directory-sync'
    if (id.includes('vc-research')) return 'vc-research'
    if (id.includes('yc-trends')) return 'yc-trends'
    if (id.includes('market-trends')) return 'market-trends'
    if (id.includes('embeddings')) return 'embeddings'
    if (id.includes('validation')) return 'data-validation'
    return ''
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Background Worker Dashboard</h1>
        
        {/* Overall Status */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Worker Status</h2>
              <p className={`text-xl ${statusColor}`}>
                {statusEmoji} {status?.running ? 'Running' : 'Stopped'}
              </p>
            </div>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Jobs ({status?.jobs.length})</h2>
          
          {status?.jobs.map((job) => (
            <div
              key={job.id}
              className="bg-gray-900 rounded-lg p-6 border border-gray-800"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getJobStatusEmoji(job)}</span>
                    <h3 className="text-xl font-bold">{job.name}</h3>
                    <span
                      className={`px-3 py-1 rounded text-sm ${getJobStatusColor(job)} bg-opacity-20`}
                    >
                      {job.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                    <div>
                      <p className="mb-1">
                        <span className="font-semibold">Last run:</span>{' '}
                        {formatDate(job.lastRun)}
                      </p>
                      <p>
                        <span className="font-semibold">Next run:</span>{' '}
                        {formatDate(job.nextRun)}
                      </p>
                    </div>
                    <div>
                      <p>
                        <span className="font-semibold">Errors:</span> {job.errorCount}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => triggerJob(getJobType(job.id))}
                  disabled={job.status === 'running' || triggering === getJobType(job.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {triggering === getJobType(job.id) ? '⏳ Triggering...' : '▶️ Trigger Now'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <button
              onClick={() => triggerJob('vc-research')}
              disabled={triggering === 'vc-research'}
              className="px-4 py-3 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-600"
            >
              🔍 Full VC research (manual list)
            </button>
            <button
              onClick={() => triggerJob('vc-thesis-research')}
              disabled={triggering === 'vc-thesis-research'}
              className="px-4 py-3 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:bg-gray-600"
            >
              📝 Thesis batch
            </button>
            <button
              onClick={() => triggerJob('vc-profile-research')}
              disabled={triggering === 'vc-profile-research'}
              className="px-4 py-3 bg-fuchsia-700 text-white rounded hover:bg-fuchsia-800 disabled:bg-gray-600"
            >
              📋 Profile fields batch
            </button>
            <button
              onClick={() => triggerJob('yc-trends')}
              disabled={triggering === 'yc-trends'}
              className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-600"
            >
              📊 Update YC Trends
            </button>
            <button
              onClick={() => triggerJob('market-trends')}
              disabled={triggering === 'market-trends'}
              className="px-4 py-3 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-600"
            >
              🤖 Market Analysis
            </button>
            <button
              onClick={() => triggerJob('data-validation')}
              disabled={triggering === 'data-validation'}
              className="px-4 py-3 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-600"
            >
              ✅ Validate Data
            </button>
            <button
              onClick={() => triggerJob('embeddings')}
              disabled={triggering === 'embeddings'}
              className="px-4 py-3 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:bg-gray-600"
            >
              🔄 Rebuild Embeddings
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-8 text-sm text-gray-400">
          <p>
            💡 The background worker runs automatically to keep data fresh and accurate.
            Use "Trigger Now" to run jobs manually.
          </p>
        </div>
      </div>
    </div>
  )
}
