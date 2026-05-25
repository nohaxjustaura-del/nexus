import { db } from "@/lib/db"
import { formatVerifiedInvestorCount } from "@/lib/investor-public-stats"
import { getCurrentUser } from "@/lib/auth"
import { parseJSON } from "@/lib/utils"
import Link from "next/link"
import { redirect } from "next/navigation"
/**
 * Investor JSON columns are stored as strings but may arrive pre-parsed (e.g. JsonValue).
 * Always return a real string[] so callers can use .some / .join safely.
 */
function parseJSONStringArray(value: unknown): string[] {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((x) => String(x))
  if (typeof value !== "string") return []
  const raw = parseJSON<unknown>(value, [])
  if (Array.isArray(raw)) return raw.map((x) => String(x))
  if (typeof raw === "string" && raw.trim()) return [raw.trim()]
  return []
}
import DiscoverClient from "./discover-client"
import { investorCheckRangeThousands, investorHasUnknownCheckSize } from "@/lib/investor-check-range"
import { isFounderCoreProfileComplete } from '@/lib/founder-profile-completeness'
import { compareInvestorsByDiscoverSearch } from '@/lib/discover-investor-search'

function searchableSlice(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

/** Searchable text for directory query (firm, partner, thesis, sectors, geo, etc.). */
function investorMatchesDirectorySearch(
  inv: {
    firmName: string | null
    name: string | null
    thesis: string | null
    sectors: string | null
    stages: string | null
    geoFocus?: unknown
    valueAddTags: string | null
    proofPoints: unknown
    portfolio: unknown
    notableInvestments: string | null
    fundType: string | null
    leadFollow: string | null
    decisionSpeed: string | null
  },
  rawQuery: string,
): boolean {
  const q = rawQuery.toLowerCase().trim()
  if (!q) return true
  const parts: string[] = [
    inv.firmName || '',
    inv.name || '',
    inv.thesis || '',
    inv.sectors || '',
    inv.stages || '',
    inv.valueAddTags || '',
    searchableSlice(inv.proofPoints),
    searchableSlice(inv.portfolio),
    inv.notableInvestments || '',
    inv.fundType || '',
    inv.leadFollow || '',
    inv.decisionSpeed || '',
  ]
  const geo = parseJSONStringArray(inv.geoFocus as string | null)
  parts.push(geo.join(' '))
  const hay = parts.join(' ').toLowerCase()
  const tokens = q.split(/\s+/).filter((t) => t.length > 0)
  return tokens.length === 0 ? true : tokens.every((t) => hay.includes(t))
}

export const runtime = "nodejs"

/** Next.js 15+: `searchParams` is async; normalize to single string values for this page. */
function flattenSearchParams(
  raw: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) out[k] = undefined
    else if (Array.isArray(v)) out[k] = v[0]
    else out[k] = v
  }
  return out
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    fundType?: string | string[]
    sector?: string | string[]
    stage?: string | string[]
    min?: string | string[]
    max?: string | string[]
    all?: string | string[]
    search?: string | string[]
    geographicRestriction?: string | string[]
    willLead?: string | string[]
    [key: string]: string | string[] | undefined
  }>
}) {
  const sp = flattenSearchParams(await searchParams)

  let profileComplete = true
  let prefDefaults: {
    fundType?: string
    sector?: string
    stage?: string
    geographicRestriction?: 'us-only' | 'remote-ok'
    decisionSpeed?: string
    targetOwnershipMax?: string
    willLead?: 'never' | 'sometimes' | 'usually'
  } = {}
  let founderGender: string | null = null
  let hasResumeAnalysis = false
  let backgroundReasons: string[] = []
  
  // Optimized: Single user fetch and combined queries
  let user
  try {
    user = await getCurrentUser(false)
  } catch (authError) {
    // If auth fails, continue without user - page should still load
    user = null
  }
  
  try {
    if (user?.email) {
      let founder = null
      let prefsRow: Awaited<ReturnType<typeof db.founderPrefs.findUnique>> = null

      try {
        const results = await Promise.allSettled([
          db.founder.findUnique({
            where: { email: user.email },
            select: {
              name: true,
              stage: true,
              sectors: true,
              location: true,
              countryCode: true,
              regionCode: true,
              gender: true,
              willingToDropOut: true,
              resumeAnalyses: { select: { id: true }, take: 1 },
              videoPitches: { select: { id: true }, take: 1 },
              pitchDeckAnalyses: { select: { id: true }, take: 1 },
            },
          }).catch(() => null),
          db.founderPrefs.findUnique({ where: { email: user.email } }).catch(() => null),
        ])

        founder = results[0].status === 'fulfilled' ? results[0].value : null
        prefsRow = results[1].status === 'fulfilled' ? results[1].value : null
      } catch {
        founder = null
        prefsRow = null
      }

      let sectors: string[] = []
      try {
        sectors = founder?.sectors ? parseJSONStringArray(founder.sectors) : []
      } catch (e) {
        sectors = []
      }
      profileComplete = isFounderCoreProfileComplete({
        name: founder?.name,
        stage: founder?.stage,
        location: founder?.location,
        countryCode: founder?.countryCode,
        regionCode: founder?.regionCode,
        sectors,
      })
      
      // CRITICAL: Redirect to onboarding if profile is not complete
      if (!profileComplete) {
        redirect('/founder/onboarding')
      }
      
      // Set preference defaults
      if (prefsRow) {
        const p = prefsRow
        if (p?.fundTypePreference && p.fundTypePreference !== 'either') prefDefaults.fundType = String(p.fundTypePreference)
        if (sectors?.length > 0) prefDefaults.sector = sectors[0]
        if (founder?.stage) prefDefaults.stage = String(founder.stage)
        if (p?.geoPreference) prefDefaults.geographicRestriction = p.geoPreference as any
        if (p?.decisionSpeedDays) prefDefaults.decisionSpeed = String(p.decisionSpeedDays)
        if (p?.targetOwnershipMax) prefDefaults.targetOwnershipMax = String(p.targetOwnershipMax)
        if (p?.leadPreference) prefDefaults.willLead = String(p.leadPreference) as "never" | "sometimes" | "usually" | undefined
        
        const genderLow = (founder?.gender ?? '').toLowerCase().trim()
        const derivedIsWoman = p?.isWoman || genderLow === 'female' || genderLow === 'woman'

        if (p?.isStudent || founder?.willingToDropOut) {
          backgroundReasons.push('Student-focused funds (Rough Draft, Neo, The House Fund, etc.)')
        }
        if (p?.isImmigrant) {
          backgroundReasons.push('Immigrant founder support (Unshackled Ventures, etc.)')
        }
        if (derivedIsWoman) {
          backgroundReasons.push('Women-focused funds (Female Founders Fund, BBG Ventures, The Artemis Fund, etc.)')
        }
        if (p?.isUnderrepresented || p?.isBipoc) {
          backgroundReasons.push('Diversity-focused funds (Backstage Capital, Harlem Capital, Kapor Capital, etc.)')
        }
        if (p?.isVeteran) {
          backgroundReasons.push('Veteran-focused funds (Scout Ventures, etc.)')
        }
        if (p?.isLgbtq) {
          backgroundReasons.push('LGBTQ+-focused funds (Gaingels, Pride Fund, etc.)')
        }
      } else {
        if (sectors?.length > 0) prefDefaults.sector = sectors[0]
        if (founder?.stage) prefDefaults.stage = String(founder.stage)
      }
      
      // Set gender and resume analysis from founder query
      if (founder) {
        founderGender = founder.gender || null
        // Check if user has done ANY analysis (resume, video pitch, or pitch deck)
        hasResumeAnalysis = 
          (Array.isArray(founder.resumeAnalyses) && founder.resumeAnalyses.length > 0) ||
          (Array.isArray((founder as any).videoPitches) && (founder as any).videoPitches.length > 0) ||
          (Array.isArray((founder as any).pitchDeckAnalyses) && (founder as any).pitchDeckAnalyses.length > 0)
      }
    }
  } catch (error) {
    // If any error occurs, continue - page should still load
    // Error handled silently to prevent page crashes
  }

  // Get all public investors from database (optimized: only fetch needed fields)
  // Note: `discoverable` is a quality/metadata flag (see lib/investor-pristine-gate.ts); matching uses
  // the same public corpus as this page. Sort still prefers discoverable for "For you" polish.
  // Wrap in try-catch to handle database errors gracefully
  let investors: any[]
  try {
    investors = await db.investor.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        name: true,
        firmName: true,
        email: true,
        verified: true,
        stages: true,
        sectors: true,
        checkMin: true,
        checkMax: true,
        checkSizeMin: true,
        checkSizeMax: true,
        geoFocus: true,
        valueAddTags: true,
        decisionSpeed: true,
        applicationUrl: true,
        websiteUrl: true,
        twitterUrl: true,
        fundType: true,
        thesis: true,
        leadFollow: true,
        ownershipTarget: true,
        proofPoints: true,
        portfolio: true,
        personalityType: true,
        notableInvestments: true,
      },
      orderBy: [
        { verified: "desc" }, // Verified VCs first
        { discoverable: "desc" }, // Pristine / match-eligible next
        { createdAt: "desc" }, // Then newest first
      ],
      // No take limit - show all investors
    })
  } catch (dbError) {
    // If database query fails, return empty array so page can still render
    investors = []
  }

  // Background reasons are now set in the earlier query block above

  // Apply filters if any
  const viewAll = sp.all === '1' || sp.all === 'true'
  const hasSearch = Boolean(sp.search?.trim())

  // PRIORITY: Sort investors to put Y Combinator at the top
  const sortedInvestors = [...investors].sort((a, b) => {
    const aIsYC = (a.firmName || '').toLowerCase().includes('y combinator')
    const bIsYC = (b.firmName || '').toLowerCase().includes('y combinator')
    if (aIsYC && !bIsYC) return -1
    if (!aIsYC && bIsYC) return 1
    return 0
  })
  
  let filteredInvestors = sortedInvestors
  const FREE_TAILORED_LIMIT = 5 // Show top 5 tailored matches for free
  // Merge profile defaults for "For you" — but not while searching (search should not be narrowed by hidden prefs)
  const effectiveParams: any = { ...sp }
  if (!viewAll && !hasSearch) {
    for (const [k, v] of Object.entries(prefDefaults)) {
      if (effectiveParams[k] == null || effectiveParams[k] === '') {
        effectiveParams[k] = v as any
      }
    }
  }

  // Search: match across firm, partner, thesis, sectors, stages, geo, tags, portfolio, etc.
  if (sp.search?.trim()) {
    const q = sp.search.trim()
    filteredInvestors = filteredInvestors.filter((inv) => investorMatchesDirectorySearch(inv, q))
    filteredInvestors = [...filteredInvestors].sort((a, b) =>
      compareInvestorsByDiscoverSearch(a, b, q),
    )
  }

  // Fund type filter
  if (effectiveParams.fundType) {
    filteredInvestors = filteredInvestors.filter(inv => inv.fundType === effectiveParams.fundType)
  }

  // Sector filter
  if (effectiveParams.sector) {
    filteredInvestors = filteredInvestors.filter(inv => {
      const sectorList = parseJSONStringArray(inv.sectors)
      return sectorList.some((s) =>
        s.toLowerCase().includes(String(effectiveParams.sector).toLowerCase()),
      )
    })
  }

  // Stage filter - with mapping for founder stages to VC investment stages
  if (effectiveParams.stage) {
    // Map founder stages to VC-compatible stage names
    // Founders select: idea, mvp, revenue, seed, seriesA
    // VCs list: Pre-Seed, Seed, Series A, Series B, Growth, etc.
    const stageMapping: Record<string, string[]> = {
      'idea': ['pre-seed', 'seed', 'angel'],
      'mvp': ['pre-seed', 'seed'],
      'revenue': ['seed', 'series a', 'pre-seed'],
      'pre-seed': ['pre-seed', 'seed', 'angel'],
      'seed': ['seed', 'pre-seed', 'series a'],
      'seriesa': ['series a', 'seed', 'series b'],
      'series a': ['series a', 'seed', 'series b'],
      'seriesb': ['series b', 'series a', 'growth'],
      'series b': ['series b', 'series a', 'growth'],
      'growth': ['growth', 'series b', 'series c'],
    }
    
    const founderStage = String(effectiveParams.stage).toLowerCase().replace(/\s+/g, '')
    const matchStages = stageMapping[founderStage] || stageMapping[String(effectiveParams.stage).toLowerCase()] || [String(effectiveParams.stage).toLowerCase()]
    
    filteredInvestors = filteredInvestors.filter(inv => {
      const stages = parseJSONStringArray(inv.stages)
      if (stages.length === 0) return true // Include investors with no stage specified
      return stages.some(s => matchStages.some(ms => s.toLowerCase().includes(ms)))
    })
  }

  // Check size filter - FIXED LOGIC
  // User wants: min to max (e.g., $100K to $500K)
  // VC offers: checkMin to checkMax (e.g., $50K to $300K)
  // Match if ranges overlap: VC's max >= user's min AND VC's min <= user's max
  const minCheck = effectiveParams.min ? parseInt(effectiveParams.min) : null
  const maxCheck = effectiveParams.max ? parseInt(effectiveParams.max) : null

  if (minCheck !== null || maxCheck !== null) {
    filteredInvestors = filteredInvestors.filter((inv) => {
      if (investorHasUnknownCheckSize(inv)) {
        return true
      }
      const { minK: vcMin, maxK: vcMax } = investorCheckRangeThousands(inv)
      // If only min is set: VC's max must be >= user's min
      if (minCheck !== null && maxCheck === null) {
        return vcMax >= minCheck
      }
      // If only max is set: VC's min must be <= user's max
      if (minCheck === null && maxCheck !== null) {
        return vcMin <= maxCheck
      }
      // If both are set: ranges must overlap
      if (minCheck !== null && maxCheck !== null) {
        // Validate: min should be <= max
        if (minCheck > maxCheck) {
          return false // Invalid filter, show nothing
        }
        // Overlap exists if: VC's max >= user's min AND VC's min <= user's max
        return vcMax >= minCheck && vcMin <= maxCheck
      }
      return true
    })
  }

  // Advanced filters - ONLY apply geo/lead/speed filters if explicitly in URL params
  // (not from user defaults, which are too aggressive for the tailored view)
  // Geographic restriction - only if user explicitly set it in URL
  if (sp.geographicRestriction || (effectiveParams.geographicRestriction && viewAll)) {
    const geoRestriction = sp.geographicRestriction || effectiveParams.geographicRestriction
    filteredInvestors = filteredInvestors.filter(inv => {
      const geoFocus = parseJSONStringArray(inv.geoFocus)
      if (geoFocus.length === 0) return true // Include investors with no geo specified
      if (geoRestriction === 'us-only') {
        return geoFocus.some(g => g.toLowerCase().includes('us') || g.toLowerCase().includes('united states') || g.toLowerCase().includes('north america') || g.toLowerCase().includes('global'))
      }
      if (geoRestriction === 'remote-ok') {
        return geoFocus.length === 0 || geoFocus.some(g => g.toLowerCase().includes('global') || g.toLowerCase().includes('remote'))
      }
      return true
    })
  }

  // Lead/Follow filter - only if user explicitly set it in URL
  if (sp.willLead) {
    filteredInvestors = filteredInvestors.filter(inv => {
      if (!inv.leadFollow) return true // Include investors with no lead/follow preference
      if (sp.willLead === 'never') {
        return inv.leadFollow === 'follow'
      }
      if (sp.willLead === 'usually') {
        return inv.leadFollow === 'lead'
      }
      if (sp.willLead === 'sometimes') {
        return inv.leadFollow === 'either' || inv.leadFollow === 'lead'
      }
      return true
    })
  }

  // Decision speed filter
  if (effectiveParams.decisionSpeed) {
    const maxDays = parseInt(effectiveParams.decisionSpeed)
    if (!isNaN(maxDays)) {
      filteredInvestors = filteredInvestors.filter(inv => {
        if (!inv.decisionSpeed) return false
        // Extract number from strings like "2 weeks", "14 days", "2-4 weeks"
        const speedMatch = inv.decisionSpeed.match(/(\d+)/)
        if (speedMatch) {
          const days = parseInt(speedMatch[1])
          // If it says "weeks", multiply by 7
          const isWeeks = inv.decisionSpeed.toLowerCase().includes('week')
          const actualDays = isWeeks ? days * 7 : days
          return actualDays <= maxDays
        }
        return false
      })
    }
  }

  // Target ownership filter
  if (effectiveParams.targetOwnershipMin || effectiveParams.targetOwnershipMax) {
    const minOwnership = effectiveParams.targetOwnershipMin ? parseFloat(effectiveParams.targetOwnershipMin) : null
    const maxOwnership = effectiveParams.targetOwnershipMax ? parseFloat(effectiveParams.targetOwnershipMax) : null

    filteredInvestors = filteredInvestors.filter(inv => {
      if (!inv.ownershipTarget) return false
      const ownershipMatch = inv.ownershipTarget.match(/(\d+)(?:\s*-\s*(\d+))?%/)
      if (!ownershipMatch) return false

      const vcMin = parseFloat(ownershipMatch[1])
      const vcMax = ownershipMatch[2] ? parseFloat(ownershipMatch[2]) : vcMin

      if (minOwnership !== null && maxOwnership !== null) {
        if (minOwnership > maxOwnership) return false
        return vcMax >= minOwnership && vcMin <= maxOwnership
      }
      if (minOwnership !== null) return vcMax >= minOwnership
      if (maxOwnership !== null) return vcMin <= maxOwnership
      return true
    })
  }

  // SAFETY: If filters are too aggressive and resulted in < 5 investors,
  // relax the sector filter (keep stage filter which is more important)
  if (!viewAll && !hasSearch && !sp.sector && filteredInvestors.length < 5) {
    // Re-filter from sorted investors with only stage filter
    filteredInvestors = sortedInvestors
    
    // Re-apply stage filter only
    if (effectiveParams.stage) {
      const stageMapping: Record<string, string[]> = {
        'idea': ['pre-seed', 'seed', 'angel'],
        'mvp': ['pre-seed', 'seed'],
        'revenue': ['seed', 'series a', 'pre-seed'],
        'pre-seed': ['pre-seed', 'seed', 'angel'],
        'seed': ['seed', 'pre-seed', 'series a'],
        'seriesa': ['series a', 'seed', 'series b'],
        'series a': ['series a', 'seed', 'series b'],
        'seriesb': ['series b', 'series a', 'growth'],
        'series b': ['series b', 'series a', 'growth'],
        'growth': ['growth', 'series b', 'series c'],
      }
      const founderStage = String(effectiveParams.stage).toLowerCase().replace(/\s+/g, '')
      const matchStages = stageMapping[founderStage] || stageMapping[String(effectiveParams.stage).toLowerCase()] || [String(effectiveParams.stage).toLowerCase()]
      
      filteredInvestors = filteredInvestors.filter(inv => {
        const stages = parseJSONStringArray(inv.stages)
        if (stages.length === 0) return true
        return stages.some(s => matchStages.some(ms => s.toLowerCase().includes(ms)))
      })
    }
  }

  // Gender-based filtering for diversity-focused VCs
  if (founderGender && !viewAll) {
    const diversityVCs = [
      'Backstage Capital', 'Harlem Capital', 'Kapor Capital', 'Female Founders Fund', 
      'BBG Ventures', 'Chingona Ventures', 'Gaingels', 'The Artemis Fund',
      'Visible Hands', 'Black Ambition', 'Morgan Stanley Inclusive', 'AWS Impact',
      'Cartier Women', 'Unshackled Ventures', 'Scout Ventures'
    ]
    filteredInvestors = filteredInvestors.map(inv => {
      const isDiversityVC = diversityVCs.some(name => inv.firmName.toLowerCase().includes(name.toLowerCase()))
      if (isDiversityVC && (founderGender === 'female' || founderGender === 'non-binary')) {
        return { ...inv, _boost: true }
      }
      return inv
    })
  }
  
  // Sort by boost flag if present (diversity VCs first for matching founders)
  if (founderGender && !viewAll) {
    filteredInvestors = filteredInvestors.sort((a, b) => {
      const aBoost = (a as any)._boost ? 1 : 0
      const bBoost = (b as any)._boost ? 1 : 0
      return bBoost - aBoost
    })
  }

  // Limit free tailored recommendations to top 5
  // If user hasn't done AI analysis, only show top 5 tailored matches
  // Limit free tailored recommendations to top 5 quality matches if no AI analysis
  // Show good tailored matches based on profile preferences, not necessarily the absolute best
  let showLimitedTailored = false
  if (!viewAll && !hasSearch && !hasResumeAnalysis && filteredInvestors.length > FREE_TAILORED_LIMIT) {
    filteredInvestors = filteredInvestors.slice(0, FREE_TAILORED_LIMIT)
    showLimitedTailored = true
  }

  const totalInDirectory = investors.length
  const verifiedInDirectory = investors.reduce((n, inv) => n + (inv.verified ? 1 : 0), 0)
  const verifiedLabel = formatVerifiedInvestorCount(verifiedInDirectory)

  // Cap payload for tailored / filtered views (RSC size + render cost). "All" must list everyone.
  const SERVER_PAGE_CAP = 120
  if (!viewAll && filteredInvestors.length > SERVER_PAGE_CAP) {
    filteredInvestors = filteredInvestors.slice(0, SERVER_PAGE_CAP)
  }

  return (
    <div className="min-h-screen bg-background" data-page="discover">
      <div className="page-shell-narrow">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <header>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Investors
            </h1>
            <p className="mt-1 text-sm text-muted-foreground md:text-base">
              {verifiedLabel} verified investors
              {totalInDirectory !== verifiedInDirectory
                ? ` · ${totalInDirectory.toLocaleString('en-US')} profiles in directory`
                : ' in directory'}
              {showLimitedTailored ? ' · run analysis to unlock full list' : ''}
            </p>
          </header>

          <div
            className="inline-flex shrink-0 rounded-xl border border-border/70 bg-card p-1"
            role="group"
            aria-label="List mode"
          >
            <Link
              href="/founder/discover"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                !viewAll ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              For you
            </Link>
            <Link
              href="/founder/discover?all=1"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewAll ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({totalInDirectory.toLocaleString('en-US')})
            </Link>
          </div>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {filteredInvestors.length} {filteredInvestors.length === 1 ? 'result' : 'results'}
          {!viewAll && backgroundReasons.length > 0 && (
            <span className="text-muted-foreground/80"> · {backgroundReasons[0]}</span>
          )}
        </p>

        <DiscoverClient
          viewAll={viewAll}
          investors={filteredInvestors.map((inv) => ({
            id: inv.id,
            firmName: inv.firmName,
            name: inv.name,
            email: inv.email,
            sectors: inv.sectors,
            stages: inv.stages,
            valueAddTags: inv.valueAddTags,
            proofPoints: inv.proofPoints,
            portfolio: inv.portfolio,
            notableInvestments: inv.notableInvestments,
            thesis: inv.thesis,
            fundType: inv.fundType,
            personalityType: inv.personalityType,
            decisionSpeed: inv.decisionSpeed,
            leadFollow: inv.leadFollow,
            ownershipTarget: inv.ownershipTarget,
            checkMin: inv.checkMin,
            checkMax: inv.checkMax,
            applicationUrl: inv.applicationUrl,
            websiteUrl: inv.websiteUrl,
            twitterUrl: inv.twitterUrl,
            verified: inv.verified,
          }))}
          profileComplete={profileComplete}
        />
      </div>
    </div>
  )
}
