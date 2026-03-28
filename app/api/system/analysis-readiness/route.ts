import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Safe pre-flight for demos: which analysis subsystems are configured (no secret values).
 * Requires a logged-in user.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const voyage = !!process.env.VOYAGE_API_KEY?.trim()
  const openRouter = !!process.env.OPENROUTER_API_KEY?.trim()
  const ollama = !!process.env.OLLAMA_BASE_URL?.trim()
  const gemini = !!(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim())
  const exa = !!process.env.EXA_API_KEY?.trim()

  const faissBase = (process.env.FAISS_SERVICE_URL || 'http://localhost:8001').replace(/\/$/, '')
  let faissReachable: boolean | null = null
  let faissError: string | null = null
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 2500)
    const res = await fetch(`${faissBase}/health`, { signal: ac.signal })
    clearTimeout(t)
    faissReachable = res.ok
    if (!res.ok) faissError = `HTTP ${res.status}`
  } catch (e: unknown) {
    faissReachable = false
    faissError = e instanceof Error ? e.message : String(e)
  }

  const scoringLlmReady = openRouter || ollama
  const matchNarrativesReady = openRouter || ollama
  const gatesReady = gemini

  return NextResponse.json({
    voyageApiKey: voyage,
    faissServiceUrl: faissBase,
    faissReachable,
    faissError: faissReachable ? null : faissError,
    openRouterApiKey: openRouter,
    ollamaBaseUrl: ollama,
    geminiApiKey: gemini,
    exaApiKey: exa,
    unifiedPitch: {
      embeddings: voyage,
      vectorSearchPrimary: faissReachable === true,
      vectorSearchFallbackInMemory: voyage,
      exaLiveEnrichment: exa,
      scoringMultiPass: scoringLlmReady,
      matchGates: gatesReady,
      matchNarratives: matchNarrativesReady,
    },
    notes: [
      'Pitch + VC vectors use Voyage voyage-3 (1024-d). FAISS index must match that dimension.',
      'Scoring uses OpenRouter when OPENROUTER_API_KEY is set; otherwise local Ollama via getLlmClient().',
      '12 gate questions use Google Gemini (GEMINI_API_KEY or GOOGLE_API_KEY).',
      'Match briefings use useVcPipeline: Ollama first if OLLAMA_BASE_URL is set, else OpenRouter.',
    ],
  })
}
