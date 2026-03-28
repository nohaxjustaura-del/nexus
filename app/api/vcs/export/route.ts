import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import PDFDocument from 'pdfkit'
import { isAdminEmail } from '@/lib/constants'

export const dynamic = 'force-dynamic'

// Helper to escape CSV fields
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Helper to parse JSON arrays for CSV
function parseJSONArray(value: string | null): string {
  if (!value) return ''
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed.join('; ')
    }
    return String(parsed)
  } catch {
    return value
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin (only admins can download VC database)
    if (!isAdminEmail(user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const format = request.nextUrl.searchParams.get('format') || 'csv'

    // Get all public investors (same corpus as Discover / vector matching)
    const investors = await db.investor.findMany({
      where: {
        isPublic: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (format === 'pdf') {
      // Generate PDF using a promise-based approach
      return new Promise<NextResponse>((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
          const chunks: Buffer[] = []
          
          doc.on('data', (chunk) => chunks.push(chunk))
          doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks)
            resolve(new NextResponse(pdfBuffer, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="vc-database-${new Date().toISOString().split('T')[0]}.pdf"`,
              },
            }))
          })
          doc.on('error', (error) => {
            reject(error)
          })
          
          // Header
          doc.fontSize(20).font('Helvetica-Bold').text('VC Database', { align: 'center' })
          doc.moveDown()
          doc.fontSize(12).font('Helvetica').text(`Exported on ${new Date().toLocaleDateString()}`, { align: 'center' })
          doc.text(`Total VCs: ${investors.length}`, { align: 'center' })
          doc.moveDown(2)
          
          // Process each investor
          investors.forEach((investor, index) => {
            // Add page break if needed
            if (index > 0 && doc.y > 650) {
              doc.addPage()
            }
            
            // VC Card Border
            const startY = doc.y
            doc.rect(50, startY, 500, 0).stroke() // Top border
            doc.moveDown(0.3)
            
            // Firm Name (Bold, Large)
            doc.fontSize(16).font('Helvetica-Bold')
            doc.text(investor.firmName, { indent: 10, continued: false })
            doc.moveDown(0.2)
            
            // Name and Email
            doc.fontSize(11).font('Helvetica')
            doc.text(`Contact: ${investor.name}`, { indent: 10 })
            doc.text(`Email: ${investor.email}`, { indent: 10 })
            
            // Verification badge
            if (investor.verified) {
              doc.fontSize(9).fillColor('green')
              doc.text('✓ Verified', { indent: 10 })
              doc.fillColor('black')
            }
            
            doc.moveDown(0.4)
            
            // Investment Details
            doc.fontSize(10).font('Helvetica-Bold')
            doc.text('Investment Details:', { indent: 10 })
            doc.font('Helvetica')
            
            try {
              const stages = investor.stages ? JSON.parse(investor.stages) : []
              const sectors = investor.sectors ? JSON.parse(investor.sectors) : []
              const geoFocus = investor.geoFocus ? JSON.parse(investor.geoFocus) : []
              
              doc.text(`Stages: ${Array.isArray(stages) && stages.length > 0 ? stages.join(', ') : 'N/A'}`, { indent: 20 })
              doc.text(`Check Size: $${investor.checkMin}K - $${investor.checkMax}K`, { indent: 20 })
              const sectorsText = Array.isArray(sectors) && sectors.length > 0 
                ? sectors.slice(0, 3).join(', ') + (sectors.length > 3 ? '...' : '')
                : 'N/A'
              doc.text(`Sectors: ${sectorsText}`, { indent: 20 })
              const geoText = Array.isArray(geoFocus) && geoFocus.length > 0 ? geoFocus.join(', ') : 'N/A'
              doc.text(`Geography: ${geoText}`, { indent: 20 })
              doc.text(`Fund Type: ${investor.fundType || 'N/A'}`, { indent: 20 })
              doc.text(`Lead/Follow: ${investor.leadFollow || 'N/A'}`, { indent: 20 })
            } catch (parseError) {
              doc.text('Investment Details: N/A', { indent: 20 })
            }
            
            doc.moveDown(0.3)
            
            // Links
            if (investor.websiteUrl || investor.linkedinUrl || investor.applicationUrl) {
              doc.fontSize(9).font('Helvetica-Bold')
              doc.text('Links:', { indent: 10 })
              doc.font('Helvetica')
              if (investor.websiteUrl) doc.text(`Website: ${investor.websiteUrl}`, { indent: 20 })
              if (investor.linkedinUrl) doc.text(`LinkedIn: ${investor.linkedinUrl}`, { indent: 20 })
              if (investor.applicationUrl) doc.text(`Apply: ${investor.applicationUrl}`, { indent: 20 })
            }
            
            // Bio (truncated)
            if (investor.bio && investor.bio.length > 0) {
              doc.moveDown(0.3)
              doc.fontSize(9).font('Helvetica-Bold')
              doc.text('Bio:', { indent: 10 })
              doc.font('Helvetica')
              const bioText = investor.bio.length > 150 ? investor.bio.substring(0, 150) + '...' : investor.bio
              doc.text(bioText, { indent: 20, width: 480 })
            }
            
            // Bottom border
            doc.moveDown(0.5)
            doc.rect(50, doc.y, 500, 0).stroke()
            doc.moveDown(1)
          })
          
          // Finalize PDF
          doc.end()
        } catch (error) {
          reject(error)
        }
      })
    }
    
    if (format === 'json') {
      // Return JSON format
      const jsonData = investors.map(investor => ({
        id: investor.id,
        name: investor.name,
        email: investor.email,
        firmName: investor.firmName,
        verified: investor.verified,
        bio: investor.bio,
        photoUrl: investor.photoUrl,
        logoUrl: investor.logoUrl,
        stages: investor.stages ? JSON.parse(investor.stages) : [],
        checkMin: investor.checkMin,
        checkMax: investor.checkMax,
        checkSizeMin: investor.checkSizeMin,
        checkSizeMax: investor.checkSizeMax,
        sectors: investor.sectors ? JSON.parse(investor.sectors) : [],
        geoFocus: investor.geoFocus ? JSON.parse(investor.geoFocus) : [],
        geography: investor.geography ? JSON.parse(investor.geography) : [],
        leadFollow: investor.leadFollow,
        fundSize: investor.fundSize,
        fundType: investor.fundType,
        notableInvestments: investor.notableInvestments ? JSON.parse(investor.notableInvestments) : [],
        portfolio: investor.portfolio ? JSON.parse(investor.portfolio) : [],
        thesis: investor.thesis,
        proofPoints: investor.proofPoints ? JSON.parse(investor.proofPoints) : [],
        ownershipTarget: investor.ownershipTarget,
        valueAddTags: investor.valueAddTags ? JSON.parse(investor.valueAddTags) : [],
        ethicsTags: investor.ethicsTags ? JSON.parse(investor.ethicsTags) : [],
        personalityType: investor.personalityType,
        decisionSpeed: investor.decisionSpeed,
        linkedinUrl: investor.linkedinUrl,
        websiteUrl: investor.websiteUrl,
        website: investor.website,
        applicationUrl: investor.applicationUrl,
        twitterUrl: investor.twitterUrl,
        crunchbaseUrl: investor.crunchbaseUrl,
        responsivenessScore: investor.responsivenessScore,
        averageRating: investor.averageRating,
        totalRatings: investor.totalRatings,
        profileComplete: investor.profileComplete,
        profileCompleteness: investor.profileCompleteness,
        firmRole: investor.firmRole,
        createdAt: investor.createdAt.toISOString(),
        updatedAt: investor.updatedAt.toISOString(),
      }))

      return NextResponse.json({
        total: investors.length,
        exportedAt: new Date().toISOString(),
        data: jsonData,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="vc-database-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }

    // CSV format - matching the existing vc-database.csv format
    const headers = [
      'Firm Name',
      'Contact Name',
      'Email',
      'Verified',
      'Type',
      'Stages',
      'Sectors',
      'Check Min ($K)',
      'Check Max ($K)',
      'Geographic Focus',
      'Lead/Follow',
      'Decision Speed',
      'Personality',
      'Application URL',
      'Website URL',
      'Bio',
      'Thesis',
    ]

    const csvRows = [
      headers.join(','),
      ...investors.map(investor => {
        const stages = investor.stages ? JSON.parse(investor.stages) : []
        const sectors = investor.sectors ? JSON.parse(investor.sectors) : []
        const geoFocus = investor.geoFocus ? JSON.parse(investor.geoFocus) : []
        
        return [
          escapeCSV(investor.firmName),
          escapeCSV(investor.name),
          escapeCSV(investor.email),
          escapeCSV(investor.verified ? 'Yes' : 'No'),
          escapeCSV(investor.fundType || 'VC'),
          escapeCSV(Array.isArray(stages) ? stages.join('; ') : ''),
          escapeCSV(Array.isArray(sectors) ? sectors.join('; ') : ''),
          escapeCSV(investor.checkMin || 0),
          escapeCSV(investor.checkMax || 0),
          escapeCSV(Array.isArray(geoFocus) ? geoFocus.join('; ') : ''),
          escapeCSV(investor.leadFollow || ''),
          escapeCSV(investor.decisionSpeed || ''),
          escapeCSV(investor.personalityType || ''),
          escapeCSV(investor.applicationUrl || ''),
          escapeCSV(investor.websiteUrl || investor.website || ''),
          escapeCSV(investor.bio || ''),
          escapeCSV(investor.thesis || ''),
        ].join(',')
      }),
    ]

    const csvContent = csvRows.join('\n')
    const csvWithBOM = '\uFEFF' + csvContent // UTF-8 BOM for Excel compatibility

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vc-database-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    logger.error('[VC-EXPORT] Error exporting VC database:', error)
    return NextResponse.json(
      { error: 'Failed to export VC database' },
      { status: 500 }
    )
  }
}

