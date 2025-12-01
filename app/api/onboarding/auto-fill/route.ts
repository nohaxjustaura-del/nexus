import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SECTORS = [
  'AI/ML', 'SaaS', 'Fintech', 'Healthcare', 'Climate Tech', 'Consumer',
  'Enterprise', 'Crypto/Web3', 'EdTech', 'DeepTech', 'Biotech', 'Hardware',
  'Marketplace', 'Developer Tools', 'Security', 'Infrastructure',
]

const STAGES = ['Idea', 'MVP', 'Revenue', 'Pre-Seed', 'Seed', 'Series A']

function pickFirstUrl(text: string, exclude: RegExp) {
  const urlRegex = /https?:\/\/[^\s)]+/gi
  const urls = text.match(urlRegex) || []
  const filtered = urls.filter(u => !exclude.test(u))
  return filtered[0] || null
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    let raw = ''
    try {
      // Works for txt/docx (in modern runtimes) and some PDFs (if text layer exists)
      raw = await file.text()
    } catch {
      raw = ''
    }

    const text = (raw || '').replace(/\r/g, ' ').replace(/\t/g, ' ')

    // Basic regex extractions
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
    const linkedinMatch = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)
    const phoneMatch = text.match(/\+?\d[\d\s().-]{7,}/)

    // Try to guess a name from the first lines
    let name = ''
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines.slice(0, 8)) {
      if (emailMatch && line.includes(emailMatch[0])) continue
      if (/https?:\/\//i.test(line)) continue
      if (line.length > 2 && line.length < 80) {
        name = line
        break
      }
    }

    // Stage detection
    let stage = ''
    const stageLower = STAGES.map(s => s.toLowerCase())
    const lower = text.toLowerCase()
    stageLower.forEach(s => {
      if (!stage && lower.includes(s)) stage = STAGES[stageLower.indexOf(s)]
    })

    // Sector detection (max 3)
    const sectors: string[] = []
    for (const s of SECTORS) {
      if (sectors.length >= 3) break
      const token = s.toLowerCase().replace(/\s+/g, '')
      if (lower.includes(token.replace('/', ''))) sectors.push(s)
    }

    // Business model guess
    let businessModel = ''
    if (/b2b/i.test(text)) businessModel = 'B2B'
    else if (/b2c/i.test(text)) businessModel = 'B2C'
    if (/saas/i.test(text)) businessModel = `${businessModel ? businessModel + ' ' : ''}SaaS`.trim()

    // Generic URLs
    const website = pickFirstUrl(text, /linkedin\.com/i) || ''

    return NextResponse.json({
      success: true,
      fields: {
        name: name || undefined,
        email: emailMatch?.[0] || undefined,
        phone: phoneMatch?.[0] || undefined,
        linkedin: linkedinMatch?.[0] || undefined,
        website: website || undefined,
        stage: stage || undefined,
        sectors: sectors.length > 0 ? sectors : undefined,
        businessModel: businessModel || undefined,
      },
    })
  } catch (error: any) {
    console.error('Auto-fill error:', error)
    return NextResponse.json({ error: 'Failed to parse resume', message: error?.message }, { status: 500 })
  }
}


