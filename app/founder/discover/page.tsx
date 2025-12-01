import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { parseJSON } from "@/lib/utils"
import { 
  Heart, 
  Target
} from "lucide-react"
import Link from "next/link"
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
      // Create table if needed (only once, can be optimized further)
      // Use $executeRawUnsafe with proper error handling
      try {
        await (db as any).$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS FounderVerification (
            email TEXT PRIMARY KEY,
            url TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            submittedAt TEXT NOT NULL,
            verifiedAt TEXT,
            reviewerEmail TEXT
          )`
        )
      } catch (tableError: any) {
        // Ignore if table already exists or other table creation errors
        // SQLite may return errors even for IF NOT EXISTS in some cases
      }
      
      // Parallel queries for better performance - combine all founder data queries
      let verificationRows: any[] = []
      let founder = null
      let prefs: any[] = []
      
      try {
        // Use Promise.allSettled to handle individual query failures gracefully
        const results = await Promise.allSettled([
          // Check if FounderVerification table exists before querying
          (async () => {
            try {
              const result = await (db as any).$queryRawUnsafe(
                `SELECT status FROM FounderVerification WHERE email = ? LIMIT 1`,
                user.email
              )
              return Array.isArray(result) ? result : []
            } catch {
              return []
            }
          })(),
          db.founder.findUnique({
            where: { email: user.email },
            select: { name: true, stage: true, sectors: true, location: true, gender: true, willingToDropOut: true, resumeAnalyses: { select: { id: true }, take: 1 } },
          }).catch(() => null),
          // Check if FounderPrefs table exists before querying
          (async () => {
            try {
              const result = await (db as any).$queryRawUnsafe(
                `SELECT geoPreference, decisionSpeedDays, targetOwnershipMax, fundTypePreference, leadPreference, isStudent, isImmigrant, isUnderrepresented, isVeteran FROM FounderPrefs WHERE email = ? LIMIT 1`,
                user.email
              )
              return Array.isArray(result) ? result : []
            } catch {
              return []
            }
          })()
        ])
        
        verificationRows = results[0].status === 'fulfilled' ? results[0].value : []
        founder = results[1].status === 'fulfilled' ? results[1].value : null
        prefs = results[2].status === 'fulfilled' ? results[2].value : []
      } catch (queryError) {
        // If queries fail, continue with empty data
        verificationRows = []
        founder = null
        prefs = []
      }
      
      if (Array.isArray(verificationRows) && verificationRows.length > 0 && verificationRows[0]?.status && verificationRows[0].status !== 'approved') {
        verificationBanner = { status: verificationRows[0].status }
      }
      
      let sectors: string[] = []
      try {
        sectors = founder?.sectors ? parseJSON<string[]>(founder.sectors, []) : []
      } catch (e) {
        sectors = []
      }
      profileComplete = !!founder?.name && !!founder?.stage && !!founder?.location && Array.isArray(sectors) && sectors.length > 0
      
      // Set preference defaults
      if (Array.isArray(prefs) && prefs.length > 0) {
        const p = prefs[0]
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
        hasResumeAnalysis = Array.isArray(founder.resumeAnalyses) && founder.resumeAnalyses.length > 0
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

  // Stage filter
  if (effectiveParams.stage) {
    filteredInvestors = filteredInvestors.filter(inv => {
      const stages = parseJSON<string[]>(inv.stages, [])
      return stages.some(s => s.toLowerCase().includes(String(effectiveParams.stage).toLowerCase()))
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

  // Advanced filters
  // Geographic restriction
  if (effectiveParams.geographicRestriction) {
    filteredInvestors = filteredInvestors.filter(inv => {
      const geoFocus = parseJSON<string[]>(inv.geoFocus, [])
      if (effectiveParams.geographicRestriction === 'us-only') {
        return geoFocus.some(g => g.toLowerCase().includes('us') || g.toLowerCase().includes('united states'))
      }
      if (effectiveParams.geographicRestriction === 'remote-ok') {
        return geoFocus.length === 0 || geoFocus.some(g => g.toLowerCase().includes('global') || g.toLowerCase().includes('remote'))
      }
      return true
    })
  }

  // Lead/Follow filter
  if (effectiveParams.willLead) {
    filteredInvestors = filteredInvestors.filter(inv => {
      if (effectiveParams.willLead === 'never') {
        return inv.leadFollow === 'follow'
      }
      if (effectiveParams.willLead === 'usually') {
        return inv.leadFollow === 'lead'
      }
      if (effectiveParams.willLead === 'sometimes') {
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        {/* Clean Title */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            1,038 Verified Investors
          </h1>
          <p className="text-slate-600 text-lg">
            Find the right investors for your startup
          </p>
        </div>

        {/* Clean Tab Navigation */}
        <div className="mb-6 border-b border-slate-200">
          <nav className="flex gap-6 -mb-px">
            <Link
              href="/founder/discover"
              className="px-1 py-3 text-sm font-semibold border-b-2 border-blue-600 text-blue-600 transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/founder/matches"
              className="px-1 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 transition-colors"
            >
              Matches
            </Link>
            <Link
              href="/founder/bookmarks"
              className="px-1 py-3 text-sm font-medium text-slate-600 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-300 transition-colors"
            >
              Bookmarks
            </Link>
            <Link
              href="/founder/my-analyses"
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              My Analyses
            </Link>
          </nav>
        </div>

        {/* Toggle Switch */}
        <div className="mb-6 flex items-center gap-2">
          <Link
            href="/founder/discover"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              !viewAll
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tailored
          </Link>
          <Link
            href="/founder/discover?all=1"
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewAll
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({investors.length})
          </Link>
        </div>

        {verificationBanner && (
          <Card className="mb-4 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4 text-sm text-yellow-800">
              Your identity verification is <strong>{verificationBanner.status}</strong>. You can still browse matches; some actions may require approval.
            </CardContent>
          </Card>
        )}


        {/* Results count */}
        <div className="mb-6">
          <p className="text-sm text-slate-600">
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

