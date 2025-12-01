'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'

export default function AIMatchPage() {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/match-investors', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate analysis')
      }

      setAnalysis(data.analysis)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            AI-Powered Investor Matching 🤖
          </h1>
          <p className="text-lg text-slate-600">
            Get personalized feedback and investor matches powered by AI
          </p>
        </div>

        {!analysis && !loading && (
          <Card className="p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Ready to Find Your Perfect Investors?
              </h2>
              <p className="text-slate-600 mb-6">
                Our AI will analyze your startup, provide detailed feedback, and match you with the best VCs, accelerators, and funding programs from our database of 1000+ investors.
              </p>
              <Button
                onClick={runAnalysis}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                Generate My AI Analysis
              </Button>
            </div>
          </Card>
        )}

        {loading && (
          <Card className="p-12 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Analyzing Your Startup...
            </h3>
            <p className="text-slate-600">
              Our AI is reviewing your profile, analyzing your pitch, and matching you with the best investors. This may take 30-60 seconds.
            </p>
          </Card>
        )}

        {error && (
          <Card className="p-8 bg-red-50 border-red-200">
            <div className="text-red-600">
              <h3 className="font-semibold mb-2">Error</h3>
              <p>{error}</p>
              <Button
                onClick={runAnalysis}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {analysis && (
          <div className="space-y-6">
            <Card className="p-8">
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-slate-900 mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-slate-800 mt-6 mb-3" {...props} />,
                    h4: ({ node, ...props }) => <h4 className="text-lg font-semibold text-slate-700 mt-4 mb-2" {...props} />,
                    p: ({ node, ...props }) => <p className="text-slate-700 mb-4 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                    li: ({ node, ...props }) => <li className="text-slate-700" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                    table: ({ node, ...props }) => (
                      <div className="overflow-x-auto mb-6">
                        <table className="min-w-full divide-y divide-slate-200" {...props} />
                      </div>
                    ),
                    th: ({ node, ...props }) => <th className="px-4 py-2 bg-slate-100 text-left text-sm font-semibold text-slate-900" {...props} />,
                    td: ({ node, ...props }) => <td className="px-4 py-2 text-sm text-slate-700 border-t" {...props} />,
                  }}
                >
                  {analysis}
                </ReactMarkdown>
              </div>
            </Card>

            <div className="flex justify-center gap-4">
              <Button
                onClick={runAnalysis}
                variant="outline"
              >
                Regenerate Analysis
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                Export as PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

