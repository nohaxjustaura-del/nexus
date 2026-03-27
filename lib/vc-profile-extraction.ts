import { getAIClient } from '@/lib/ai'
import { getModelName } from '@/lib/openrouter'
import { logger } from '@/lib/logger'

export type ExtractedVcProfile = {
  firmName: string | null
  thesis: string
  founderNotes: string
  checkMin: number | null
  checkMax: number | null
  fundSize: string | null
  stages: string[]
  sectors: string[]
  geoFocus: string[]
  leadFollow: 'lead' | 'follow' | 'either'
  applicationUrl: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  decisionSpeed: string | null
  valueAddTags: string[]
}

const EMPTY: ExtractedVcProfile = {
  firmName: null,
  thesis: '',
  founderNotes: '',
  checkMin: null,
  checkMax: null,
  fundSize: null,
  stages: [],
  sectors: [],
  geoFocus: [],
  leadFollow: 'either',
  applicationUrl: null,
  websiteUrl: null,
  linkedinUrl: null,
  decisionSpeed: null,
  valueAddTags: [],
}

function normalizeLead(v: unknown): 'lead' | 'follow' | 'either' {
  if (v === 'lead' || v === 'follow' || v === 'either') return v
  return 'either'
}

export async function extractVcProfileFromText(rawText: string): Promise<ExtractedVcProfile> {
  const text = rawText.trim().slice(0, 24_000)
  if (text.length < 40) {
    return { ...EMPTY, thesis: 'Paste more detail (at least a short paragraph) so we can extract your thesis.' }
  }

  try {
    const client = getAIClient()
    const model = getModelName('gpt-4o')

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.15,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You extract structured VC / angel / fund profile data from arbitrary text (website copy, investment memo, email, notes).
Return ONE JSON object with EXACTLY these keys and no others:
firmName (string|null),
thesis (string, 2–6 sentences on what you fund),
founderNotes (string, practical guidance for founders applying: process, what to send, timing, red flags — empty string if unknown),
checkMin (number|null, USD thousands),
checkMax (number|null, USD thousands),
fundSize (string|null, human readable e.g. "$120M fund III"),
stages (string[] — each must be one of: Pre-Seed, Seed, Series A, Series B),
sectors (string[] — short labels e.g. "SaaS", "Fintech"),
geoFocus (string[] — regions),
leadFollow ("lead"|"follow"|"either"),
applicationUrl (string|null),
websiteUrl (string|null),
linkedinUrl (string|null),
decisionSpeed (string|null, e.g. "2–3 weeks"),
valueAddTags (string[], short phrases beyond capital).

Use null or [] when unknown. Numbers are always in thousands of USD for checks.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    })

    const content = completion.choices[0]?.message?.content
    if (!content) return EMPTY

    const parsed = JSON.parse(content) as Record<string, unknown>
    return {
      firmName: typeof parsed.firmName === 'string' ? parsed.firmName : null,
      thesis: typeof parsed.thesis === 'string' ? parsed.thesis : '',
      founderNotes: typeof parsed.founderNotes === 'string' ? parsed.founderNotes : '',
      checkMin: typeof parsed.checkMin === 'number' && Number.isFinite(parsed.checkMin) ? parsed.checkMin : null,
      checkMax: typeof parsed.checkMax === 'number' && Number.isFinite(parsed.checkMax) ? parsed.checkMax : null,
      fundSize: typeof parsed.fundSize === 'string' ? parsed.fundSize : null,
      stages: Array.isArray(parsed.stages) ? parsed.stages.map(String).filter(Boolean) : [],
      sectors: Array.isArray(parsed.sectors) ? parsed.sectors.map(String).filter(Boolean) : [],
      geoFocus: Array.isArray(parsed.geoFocus) ? parsed.geoFocus.map(String).filter(Boolean) : [],
      leadFollow: normalizeLead(parsed.leadFollow),
      applicationUrl: typeof parsed.applicationUrl === 'string' ? parsed.applicationUrl : null,
      websiteUrl: typeof parsed.websiteUrl === 'string' ? parsed.websiteUrl : null,
      linkedinUrl: typeof parsed.linkedinUrl === 'string' ? parsed.linkedinUrl : null,
      decisionSpeed: typeof parsed.decisionSpeed === 'string' ? parsed.decisionSpeed : null,
      valueAddTags: Array.isArray(parsed.valueAddTags) ? parsed.valueAddTags.map(String).filter(Boolean) : [],
    }
  } catch (err: unknown) {
    logger.error('[VC-EXTRACT]', err instanceof Error ? err.message : err)
    return {
      ...EMPTY,
      thesis: 'We could not parse an extraction. Try pasting cleaner text or a shorter section.',
    }
  }
}
