import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { parseJSON } from "@/lib/utils"
import Link from "next/link"
import { redirect } from "next/navigation"
import DiscoverClient from "./discover-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { 
    fundType?: string
    sector?: string
    stage?: string
    min?: string
    max?: string
    all?: string
    search?: string
    [key: string]: string | undefined // Allow advanced filter params
  }
}) {
  let verificationBanner: { status: string } | null = null
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
      let verificationRow: { status: string } | null = null
      let founder = null
      let prefsRow: Awaited<ReturnType<typeof db.founderPrefs.findUnique>> = null

      try {
        const results = await Promise.allSettled([
          db.founderVerification
            .findUnique({
              where: { email: user.email },
              select: { status: true },
            })
            .catch(() => null),
          db.founder.findUnique({
            where: { email: user.email },
            select: {
              name: true,
              stage: true,
              sectors: true,
              location: true,
              gender: true,
              willingToDropOut: true,
              resumeAnalyses: { select: { id: true }, take: 1 },
              videoPitches: { select: { id: true }, take: 1 },
              pitchDeckAnalyses: { select: { id: true }, take: 1 },
            },
          }).catch(() => null),
          db.founderPrefs.findUnique({ where: { email: user.email } }).catch(() => null),
        ])

        verificationRow =
          results[0].status === 'fulfilled' ? results[0].value : null
        founder = results[1].status === 'fulfilled' ? results[1].value : null
        prefsRow = results[2].status === 'fulfilled' ? results[2].value : null
      } catch {
        verificationRow = null
        founder = null
        prefsRow = null
      }

      if (verificationRow?.status && verificationRow.status !== 'approved') {
        verificationBanner = { status: verificationRow.status }
      }
      
      let sectors: string[] = []
      try {
        sectors = founder?.sectors ? parseJSON<string[]>(founder.sectors, []) : []
      } catch (e) {
        sectors = []
      }
      profileComplete = !!founder?.name && !!founder?.stage && !!founder?.location && Array.isArray(sectors) && sectors.length > 0
      
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
        
        // Set background reasons from same query
        if (p?.isStudent || founder?.willingToDropOut) {
          backgroundReasons.push('Student-focused funds (Rough Draft, Neo, The House Fund, etc.)')
        }
        if (p?.isImmigrant) {
          backgroundReasons.push('Immigrant founder support (Unshackled Ventures, etc.)')
        }
        if (p?.isUnderrepresented || founder?.gender === 'female') {
          backgroundReasons.push('Diversity-focused funds (Backstage Capital, Harlem Capital, BBG Ventures, etc.)')
        }
        if (p?.isVeteran) {
          backgroundReasons.push('Veteran-focused funds (Scout Ventures, etc.)')
        }
        // University affiliation check removed - column doesn't exist yet
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

  // Get all investors from database (optimized: only fetch needed fields)
  // Wrap in try-catch to handle database errors gracefully
  let investors: any[]
  try {
    investors = await db.investor.findMany({
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
        geoFocus: true,
        valueAddTags: true,
        decisionSpeed: true,
        applicationUrl: true,
        websiteUrl: true,
        linkedinUrl: true,
        twitterUrl: true,
        fundType: true,
        thesis: true,
        leadFollow: true,
        ownershipTarget: true,
        proofPoints: true,
        portfolio: true,
        personalityType: true,
        notableInvestments: true,
        fundSize: true,
      },
      orderBy: [
        { verified: "desc" }, // Verified VCs first
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
  const viewAll = searchParams.all === '1' || searchParams.all === 'true'
  
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
  // Merge user defaults when not viewing all and param not provided
  const effectiveParams: any = { ...searchParams }
  if (!viewAll) {
    for (const [k, v] of Object.entries(prefDefaults)) {
      if (effectiveParams[k] == null || effectiveParams[k] === '') {
        effectiveParams[k] = v as any
      }
    }
  }

  // Search filter - filter by firm name (applied first before other filters)
  if (searchParams.search && searchParams.search.trim()) {
    const searchQuery = searchParams.search.toLowerCase().trim()
    filteredInvestors = filteredInvestors.filter(inv => {
      const firmName = (inv.firmName || '').toLowerCase()
      const name = (inv.name || '').toLowerCase()
      return firmName.includes(searchQuery) || name.includes(searchQuery)
    })
  }

  // Fund type filter
  if (effectiveParams.fundType) {
    filteredInvestors = filteredInvestors.filter(inv => inv.fundType === effectiveParams.fundType)
  }

  // Sector filter
  if (effectiveParams.sector) {
    filteredInvestors = filteredInvestors.filter(inv => {
      const sectors = parseJSON<string[]>(inv.sectors, [])
      return sectors.some(s => s.toLowerCase().includes(String(effectiveParams.sector).toLowerCase()))
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
      const stages = parseJSON<string[]>(inv.stages, [])
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
    filteredInvestors = filteredInvestors.filter(inv => {
      // If only min is set: VC's max must be >= user's min
      if (minCheck !== null && maxCheck === null) {
        return inv.checkMax >= minCheck
      }
      // If only max is set: VC's min must be <= user's max
      if (minCheck === null && maxCheck !== null) {
        return inv.checkMin <= maxCheck
      }
      // If both are set: ranges must overlap
      if (minCheck !== null && maxCheck !== null) {
        // Validate: min should be <= max
        if (minCheck > maxCheck) {
          return false // Invalid filter, show nothing
        }
        // Overlap exists if: VC's max >= user's min AND VC's min <= user's max
        return inv.checkMax >= minCheck && inv.checkMin <= maxCheck
      }
      return true
    })
  }

  // Advanced filters - ONLY apply geo/lead/speed filters if explicitly in URL params
  // (not from user defaults, which are too aggressive for the tailored view)
  // Geographic restriction - only if user explicitly set it in URL
  if (searchParams.geographicRestriction || (effectiveParams.geographicRestriction && viewAll)) {
    const geoRestriction = searchParams.geographicRestriction || effectiveParams.geographicRestriction
    filteredInvestors = filteredInvestors.filter(inv => {
      const geoFocus = parseJSON<string[]>(inv.geoFocus, [])
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
  if (searchParams.willLead) {
    filteredInvestors = filteredInvestors.filter(inv => {
      if (!inv.leadFollow) return true // Include investors with no lead/follow preference
      if (searchParams.willLead === 'never') {
        return inv.leadFollow === 'follow'
      }
      if (searchParams.willLead === 'usually') {
        return inv.leadFollow === 'lead'
      }
      if (searchParams.willLead === 'sometimes') {
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
  if (!viewAll && !searchParams.sector && filteredInvestors.length < 5) {
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
        const stages = parseJSON<string[]>(inv.stages, [])
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
  if (!viewAll && !hasResumeAnalysis && filteredInvestors.length > FREE_TAILORED_LIMIT) {
    // Take top 5 based on verification status
    filteredInvestors = filteredInvestors.slice(0, FREE_TAILORED_LIMIT)
    showLimitedTailored = true
  }

  return (
    <div className="min-h-screen bg-background text-foreground" data-page="discover">
      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
            1,002 Verified Investors
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Find the right investors for your startup
          </p>
        </div>

        <div className="mb-6 border-b border-border">
          <nav className="flex flex-wrap gap-x-6 gap-y-1 -mb-px">
            <Link
              href="/founder/discover"
              className="px-1 py-3 text-sm font-semibold border-b-2 border-foreground text-foreground transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/founder/matches"
              className="px-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/founder/bookmarks"
              className="px-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border transition-colors"
            >
              Bookmarks
            </Link>
            <Link
              href="/founder/my-analyses"
              className="px-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border transition-colors"
            >
              My Analyses
            </Link>
          </nav>
        </div>

        <div className="mb-6 inline-flex rounded-md border border-border p-0.5 bg-muted/40">
          <Link
            href="/founder/discover"
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
              !viewAll
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tailored
          </Link>
          <Link
            href="/founder/discover?all=1"
            className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
              viewAll
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({investors.length})
          </Link>
        </div>

        {verificationBanner && (
          <Card className="mb-4 border-border bg-muted/40">
            <CardContent className="py-4 text-sm text-muted-foreground">
              Your identity verification is <strong className="text-foreground">{verificationBanner.status}</strong>. You can still browse matches; some actions may require approval.
            </CardContent>
          </Card>
        )}

        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {filteredInvestors.length} {filteredInvestors.length === 1 ? 'investor' : 'investors'}
            {!viewAll && backgroundReasons.length > 0 && (
              <span className="ml-1">• Tailored to {backgroundReasons[0].toLowerCase()}</span>
            )}
          </p>
        </div>

        {/* Client Component Wrapper - handles all client-side rendering */}
        <DiscoverClient
          investors={filteredInvestors.map(inv => ({
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
