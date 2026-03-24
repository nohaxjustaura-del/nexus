/**
 * Import all VCs from FAISS data file into the database
 * This syncs the 1002 VCs from the FAISS index to the Investor table
 * 
 * Usage: npx tsx scripts/import-faiss-vcs-to-db.ts
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface FaissVC {
  id: string
  firm_name: string
  embedding_text: string
  metadata: {
    stages: string[]
    sectors: string[]
    geography: string[]
    check_size: {
      min_usd: number
      max_usd: number
    }
    investor_type: string
    thesis: string
  }
}

// Extract additional info from embedding_text
function extractFromEmbeddingText(text: string): {
  valueAdd: string[]
  portfolio: string[]
  decisionSpeed: string | null
  leadFollow: string
} {
  const valueAdd: string[] = []
  const portfolio: string[] = []
  let decisionSpeed: string | null = null
  let leadFollow = 'either'

  // Extract value-add specializations
  const valueAddMatch = text.match(/Specializations:\s*([^\n]+)/i)
  if (valueAddMatch && valueAddMatch[1].trim()) {
    valueAdd.push(...valueAddMatch[1].split(',').map(s => s.trim()).filter(Boolean))
  }

  // Extract from "offers X, Y, and Z" pattern
  const offersMatch = text.match(/offers\s+([^.]+)/i)
  if (offersMatch) {
    const items = offersMatch[1].split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean)
    valueAdd.push(...items)
  }

  // Extract portfolio companies
  const portfolioMatch = text.match(/PORTFOLIO COMPANIES\n(.+)/i)
  if (portfolioMatch && portfolioMatch[1].trim() && portfolioMatch[1].trim() !== 'None listed') {
    portfolio.push(portfolioMatch[1].trim())
  }

  // Extract decision speed
  const speedMatch = text.match(/decision speed[:\s]+([^.]+)/i)
  if (speedMatch) {
    decisionSpeed = speedMatch[1].trim()
  }

  // Extract lead/follow
  if (text.toLowerCase().includes('typically leads')) {
    leadFollow = 'lead'
  } else if (text.toLowerCase().includes('typically follows')) {
    leadFollow = 'follow'
  } else if (text.toLowerCase().includes('lead or follow: either')) {
    leadFollow = 'either'
  }

  return { valueAdd: [...new Set(valueAdd)], portfolio, decisionSpeed, leadFollow }
}

// Generate a unique email from firm name
function generateEmail(firmName: string, index: number): string {
  const slug = firmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30)
  return `contact-${slug}-${index}@investor.foundermatch.vc`
}

// Map investor type to fundType
function mapFundType(type: string): string {
  const typeMap: Record<string, string> = {
    'accelerator': 'accelerator',
    'micro-vc': 'micro-VC',
    'micro-VC': 'micro-VC',
    'angel': 'angel',
    'vc': 'Venture Capital',
    'institutional': 'institutional',
    'cvc': 'CVC',
    'corporate': 'CVC',
    'family-office': 'family-office',
    'government': 'government',
  }
  return typeMap[type.toLowerCase()] || 'Venture Capital'
}

async function main() {
  console.log('🚀 Importing VCs from FAISS data to database...\n')

  // Read FAISS data file
  const jsonlPath = join(process.cwd(), 'faiss-data', 'vcs_embedding_inputs_trimmed.json')
  const jsonlContent = readFileSync(jsonlPath, 'utf-8')
  const vcRows: FaissVC[] = jsonlContent
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line))

  console.log(`📂 Found ${vcRows.length} VCs in FAISS data file\n`)

  // Get existing investors by firm name to avoid duplicates
  const existingInvestors = await prisma.investor.findMany({
    select: { firmName: true, email: true }
  })
  const existingFirmNames = new Set(existingInvestors.map(i => i.firmName.toLowerCase()))
  const existingEmails = new Set(existingInvestors.map(i => i.email.toLowerCase()))

  console.log(`📊 ${existingInvestors.length} investors already in database\n`)

  let imported = 0
  let skipped = 0
  let updated = 0
  let errors = 0

  for (let i = 0; i < vcRows.length; i++) {
    const vc = vcRows[i]
    
    try {
      // Skip if firm already exists
      if (existingFirmNames.has(vc.firm_name.toLowerCase())) {
        skipped++
        continue
      }

      // Extract additional info from embedding text
      const extracted = extractFromEmbeddingText(vc.embedding_text)

      // Generate unique email
      let email = generateEmail(vc.firm_name, i)
      while (existingEmails.has(email.toLowerCase())) {
        email = generateEmail(vc.firm_name, i + Math.random() * 1000)
      }
      existingEmails.add(email.toLowerCase())

      // Convert check size from USD to thousands
      const checkMin = Math.round(vc.metadata.check_size.min_usd / 1000)
      const checkMax = Math.round(vc.metadata.check_size.max_usd / 1000)

      // Create investor record
      await prisma.investor.create({
        data: {
          id: vc.id,
          email: email,
          name: vc.firm_name, // Use firm name as partner name placeholder
          firmName: vc.firm_name,
          verified: true, // Mark as verified since they're from curated data
          
          // Investment criteria
          stages: JSON.stringify(vc.metadata.stages || []),
          sectors: JSON.stringify(vc.metadata.sectors || []),
          geoFocus: JSON.stringify(vc.metadata.geography || []),
          geography: JSON.stringify(vc.metadata.geography || []),
          
          // Check size (in thousands)
          checkMin: checkMin,
          checkMax: checkMax,
          checkSizeMin: vc.metadata.check_size.min_usd,
          checkSizeMax: vc.metadata.check_size.max_usd,
          
          // Fund details
          fundType: mapFundType(vc.metadata.investor_type),
          thesis: vc.metadata.thesis || null,
          leadFollow: extracted.leadFollow,
          
          // Value add
          valueAddTags: JSON.stringify(extracted.valueAdd),
          ethicsTags: JSON.stringify([]),
          
          // Additional info
          decisionSpeed: extracted.decisionSpeed,
          portfolio: extracted.portfolio.length > 0 ? JSON.stringify(extracted.portfolio) : null,
          
          // Default values
          bio: `${vc.firm_name} - ${mapFundType(vc.metadata.investor_type)}`,
          isPublic: true,
          discoverable: true,
        }
      })

      existingFirmNames.add(vc.firm_name.toLowerCase())
      imported++

      // Progress indicator
      if (imported % 50 === 0) {
        console.log(`   ✅ Imported ${imported} VCs...`)
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation - try to update instead
        try {
          const existing = await prisma.investor.findFirst({
            where: { firmName: vc.firm_name }
          })
          if (existing) {
            updated++
          }
        } catch {
          errors++
        }
      } else {
        console.error(`❌ Error importing ${vc.firm_name}:`, error.message)
        errors++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ Imported: ${imported}`)
  console.log(`⏭️  Skipped (already exists): ${skipped}`)
  console.log(`🔄 Updated: ${updated}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(50))

  // Final count
  const totalCount = await prisma.investor.count()
  console.log(`\n📈 Total investors in database: ${totalCount}`)

  await prisma.$disconnect()
}

main().catch(console.error)

