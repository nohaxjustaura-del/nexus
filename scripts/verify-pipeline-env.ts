/**
 * One-shot: print whether Exa / Voyage / LLM research pipeline is configured (no secrets).
 * Run: npx tsx scripts/verify-pipeline-env.ts
 */
import '../lib/load-env'
import {
  hasOpenRouterKey,
  hasVcLlmConfigured,
  getVcLlmBackend,
  isOllamaVcConfigured,
} from '../lib/openrouter'
import { getVcResearchPipelineEnvStatus } from '../lib/vc-research-retrieval'

const pipe = getVcResearchPipelineEnvStatus()
console.log('NEXUS worker / research pipeline (no secrets)\n')
console.log({
  EXA_API_KEY: pipe.exa,
  VOYAGE_API_KEY: !!process.env.VOYAGE_API_KEY?.trim(),
  OPENROUTER_API_KEY: hasOpenRouterKey(),
  OLLAMA_CONFIGURED: isOllamaVcConfigured(),
  VC_LLM_PROVIDER: process.env.VC_LLM_PROVIDER?.trim() || '(auto: OpenRouter if key, else Ollama)',
  research_llm_ok: hasVcLlmConfigured(),
  active_extraction_backend: pipe.vcLlmBackend,
  retrieval: pipe,
})
