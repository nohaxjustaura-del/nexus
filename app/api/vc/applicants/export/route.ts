import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJSON } from '@/lib/utils'
import {
  founderMatchesInvestorThesis,
  matchScoreForFounderInvestor,
} from '@/lib/vc-founder-thesis-match'

export const dynamic = 'force-dynamic'

// Helper function to escape CSV values
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const stringValue = String(value)
  // If contains comma, newline, or quote, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

// Helper function to format arrays/JSON for CSV
function formatField(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.join('; ')
      }
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed)
      }
    } catch {
      return value
    }
  }
  if (Array.isArray(value)) {
    return value.join('; ')
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// GET: Export matched founders as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get VC profile
    const investor = await db.investor.findUnique({
      where: { email: user.email },
    })

    if (!investor) {
      return NextResponse.json(
        { error: 'VC profile not found' },
        { status: 404 }
      )
    }
    
    if (!investor.verified) {
      return NextResponse.json(
        { error: 'VC profile not verified. Please verify your account first.' },
        { status: 403 }
      )
    }

    // Get all founders with their analyses
    const founders = await db.founder.findMany({
      include: {
        resumeAnalyses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        videoPitches: {
          where: {
            analysisResult: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        applications: {
          where: { investorId: investor.id },
        },
      },
    })

    const matchedFounders = founders
      .filter((founder) => founderMatchesInvestorThesis(founder, investor))
      .map(founder => {
        const founderSectors = parseJSON<string[]>(founder.sectors, [])
        const matchScore = matchScoreForFounderInvestor(founder, investor)

        // Generate summary from available data
        let summary = ''
        const summaryParts: string[] = []
        
        // Add startup name and what they're building
        if (founder.startupName) {
          summaryParts.push(founder.startupName)
        }
        
        // Add bio if available
        if (founder.bio) {
          summaryParts.push(founder.bio.substring(0, 200))
        }
        
        // Add traction metrics if available
        const tractionParts: string[] = []
        if (founder.revenue) {
          const rev = founder.revenue >= 1000 ? `$${(founder.revenue/1000).toFixed(0)}K` : `$${founder.revenue}`
          tractionParts.push(`${rev} revenue`)
        }
        if (founder.users) {
          const users = founder.users >= 1000 ? `${(founder.users/1000).toFixed(0)}K` : founder.users
          tractionParts.push(`${users} users`)
        }
        if (founder.growthRate) {
          tractionParts.push(`${founder.growthRate} growth`)
        }
        if (tractionParts.length > 0) {
          summaryParts.push(`Traction: ${tractionParts.join(', ')}`)
        }
        
        // Try to get pitch analysis summary
        if (founder.videoPitches && founder.videoPitches.length > 0) {
          try {
            const analysisResult = JSON.parse(founder.videoPitches[0].analysisResult || '{}')
            if (analysisResult.marketAnalysis) {
              summaryParts.push(`Market: ${analysisResult.marketAnalysis}`)
            }
            if (analysisResult.productFit) {
              summaryParts.push(`Product: ${analysisResult.productFit}`)
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // Try to get resume analysis summary
        if (founder.resumeAnalyses && founder.resumeAnalyses.length > 0) {
          try {
            const fullResult = JSON.parse(founder.resumeAnalyses[0].fullResult || '{}')
            if (fullResult.analysis?.keywords && fullResult.analysis.keywords.length > 0) {
              summaryParts.push(`Focus: ${fullResult.analysis.keywords.slice(0, 3).join(', ')}`)
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // Combine into summary (max 300 chars)
        summary = summaryParts.join(' • ').substring(0, 300)
        if (summaryParts.length > 0 && summary.length >= 300) {
          summary += '...'
        }
        
        // If no summary generated, create a basic one
        if (!summary || summary.trim().length === 0) {
          summary = `${founder.startupName || 'Startup'} in ${founderSectors.join(', ')} at ${founder.stage} stage. Seeking $${founder.fundingNeed}K.`
        }

        return {
          id: founder.id,
          name: founder.name,
          email: founder.email,
          startupName: founder.startupName,
          stage: founder.stage,
          sectors: founderSectors,
          location: founder.location,
          fundingNeed: founder.fundingNeed,
          matchScore,
          summary,
          traction: tractionParts.length > 0 ? tractionParts.join(', ') : '',
          revenue: founder.revenue,
          users: founder.users,
          growthRate: founder.growthRate,
          hasResumeAnalysis: founder.resumeAnalyses.length > 0,
          hasPitchDeck: !!founder.pitchDeck,
          hasVideoPitch: founder.videoPitches.length > 0,
          applicationStatus: founder.applications.length > 0 ? founder.applications[0].status : null,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)

    // Define CSV headers - only essential information
    const headers = [
      'Name',
      'Email',
      'Startup Name',
      'Summary',
      'Stage',
      'Sectors',
      'Location',
      'Funding Need (K)',
      'Traction',
      'Revenue',
      'Users',
      'Growth Rate',
      'Match Score (%)',
      'Has Analysis',
      'Application Status',
    ]

    // Convert founders to CSV rows
    const rows = matchedFounders.map(founder => {
      const hasAnalysis = founder.hasResumeAnalysis || founder.hasPitchDeck || founder.hasVideoPitch
      
      return [
        escapeCSV(founder.name),
        escapeCSV(founder.email),
        escapeCSV(founder.startupName || ''),
        escapeCSV(founder.summary || ''),
        escapeCSV(founder.stage),
        escapeCSV(formatField(founder.sectors)),
        escapeCSV(founder.location || ''),
        escapeCSV(founder.fundingNeed || ''),
        escapeCSV(founder.traction || ''),
        escapeCSV(founder.revenue ? (founder.revenue >= 1000 ? `$${(founder.revenue/1000).toFixed(0)}K` : `$${founder.revenue}`) : ''),
        escapeCSV(founder.users ? (founder.users >= 1000 ? `${(founder.users/1000).toFixed(0)}K` : founder.users) : ''),
        escapeCSV(founder.growthRate || ''),
        escapeCSV(founder.matchScore),
        escapeCSV(hasAnalysis ? 'Yes' : 'No'),
        escapeCSV(founder.applicationStatus || 'Not Applied'),
      ]
    })

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Add BOM for UTF-8 to help Excel open it correctly
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent

    // Generate filename with VC firm name and date
    const firmName = investor.firmName?.replace(/[^a-zA-Z0-9]/g, '_') || 'VC'
    const date = new Date().toISOString().split('T')[0]
    const filename = `${firmName}_matched_founders_${date}.csv`

    // Return as downloadable file
    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('[VC-EXPORT] Error exporting founders:', error)
    return NextResponse.json(
      { 
        error: 'Failed to export founders', 
        message: error?.message || 'Unknown error' 
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

