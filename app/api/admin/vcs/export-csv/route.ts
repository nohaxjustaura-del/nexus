import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJSON } from '@/lib/utils'

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

// Helper function to convert array/JSON to readable string
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
      // Not JSON, return as is
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

export async function GET(request: NextRequest) {
  try {
    // Check authentication (optional - remove if you want public access)
    const user = await getCurrentUser()
    // Uncomment below if you want to restrict to admin only
    // if (!user || user.email !== 'adventa.counseling@gmail.com') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Fetch all investors
    const investors = await db.investor.findMany({
      orderBy: [
        { verified: 'desc' },
        { firmName: 'asc' }
      ],
    })

    // Define CSV headers
    const headers = [
      'ID',
      'Firm Name',
      'Contact Name',
      'Email',
      'Verified',
      'Fund Type',
      'Stages',
      'Sectors',
      'Geo Focus',
      'Check Min (K)',
      'Check Max (K)',
      'Fund Size',
      'Investment Thesis',
      'Value Add Tags',
      'Ethics Tags',
      'Personality Type',
      'Decision Speed',
      'Lead/Follow',
      'Ownership Target',
      'Proof Points',
      'Portfolio',
      'Notable Investments',
      'Website URL',
      'LinkedIn URL',
      'Application URL',
      'Twitter URL',
      'Crunchbase URL',
      'Logo URL',
      'Photo URL',
      'Bio',
      'Average Rating',
      'Total Ratings',
      'Profile Complete',
      'Discoverable',
      'Firm ID',
      'Firm Role',
      'Created At',
      'Updated At'
    ]

    // Convert investors to CSV rows
    const rows = investors.map(investor => {
      const stages = parseJSON<string[]>(investor.stages, [])
      const sectors = parseJSON<string[]>(investor.sectors, [])
      const geoFocus = parseJSON<string[]>(investor.geoFocus, [])
      const valueAddTags = parseJSON<string[]>(investor.valueAddTags, [])
      const ethicsTags = parseJSON<string[]>(investor.ethicsTags, [])
      const proofPoints = parseJSON<any>(investor.proofPoints, {})
      const portfolio = parseJSON<any[]>(investor.portfolio, [])
      const notableInvestments = parseJSON<string[]>(investor.notableInvestments, [])

      return [
        escapeCSV(investor.id),
        escapeCSV(investor.firmName),
        escapeCSV(investor.name),
        escapeCSV(investor.email),
        escapeCSV(investor.verified ? 'Yes' : 'No'),
        escapeCSV(investor.fundType || ''),
        escapeCSV(formatField(stages)),
        escapeCSV(formatField(sectors)),
        escapeCSV(formatField(geoFocus)),
        escapeCSV(investor.checkMin || ''),
        escapeCSV(investor.checkMax || ''),
        escapeCSV(investor.fundSize || ''),
        escapeCSV(investor.thesis || ''),
        escapeCSV(formatField(valueAddTags)),
        escapeCSV(formatField(ethicsTags)),
        escapeCSV(investor.personalityType || ''),
        escapeCSV(investor.decisionSpeed || ''),
        escapeCSV(investor.leadFollow || ''),
        escapeCSV(investor.ownershipTarget || ''),
        escapeCSV(formatField(proofPoints)),
        escapeCSV(formatField(portfolio)),
        escapeCSV(formatField(notableInvestments)),
        escapeCSV(investor.websiteUrl || ''),
        escapeCSV(investor.linkedinUrl || ''),
        escapeCSV(investor.applicationUrl || ''),
        escapeCSV(investor.twitterUrl || ''),
        escapeCSV(investor.crunchbaseUrl || ''),
        escapeCSV(investor.logoUrl || ''),
        escapeCSV(investor.photoUrl || ''),
        escapeCSV(investor.bio || ''),
        escapeCSV(investor.averageRating || ''),
        escapeCSV(investor.totalRatings || ''),
        escapeCSV(investor.profileComplete ? 'Yes' : 'No'),
        escapeCSV(investor.discoverable ? 'Yes' : 'No'),
        escapeCSV(investor.firmId || ''),
        escapeCSV(investor.firmRole || ''),
        escapeCSV(investor.createdAt?.toISOString() || ''),
        escapeCSV(investor.updatedAt?.toISOString() || '')
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

    // Return as downloadable file
    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vcs_database_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting VCs to CSV:', error)
    return NextResponse.json(
      { error: 'Failed to export VCs', message: error.message },
      { status: 500 }
    )
  }
}



