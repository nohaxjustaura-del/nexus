/**
 * Import VCs directly from the original vc-database.csv file
 * This preserves all the rich data (Bio, Website URL, Application URL, etc.)
 * that was lost in the FAISS condensation process
 * 
 * Usage: npx tsx scripts/import-csv-to-db.ts
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface CSVRow {
  firmName: string
  contactName: string
  email: string
  verified: string
  type: string
  stages: string
  sectors: string
  checkMin: string
  checkMax: string
  geoFocus: string
  leadFollow: string
  decisionSpeed: string
  personality: string
  applicationUrl: string
  websiteUrl: string
  bio: string
  thesis: string
}

// Parse CSV line handling quoted fields with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}

// Map CSV fund type to database fundType
function mapFundType(type: string): string {
  const typeMap: Record<string, string> = {
    'vc': 'Venture Capital',
    'micro-vc': 'Micro VC',
    'institutional': 'Institutional VC',
    'accelerator': 'Accelerator',
    'cvc': 'Corporate VC',
    'angel': 'Angel',
    'fellowship': 'Fellowship',
    'family office': 'Family Office',
  }
  return typeMap[type.toLowerCase()] || type || 'Venture Capital'
}

// Parse stages string to JSON array
function parseStages(stages: string): string[] {
  if (!stages) return []
  return stages.split(';').map(s => s.trim()).filter(Boolean)
}

// Parse sectors string to JSON array  
function parseSectors(sectors: string): string[] {
  if (!sectors) return []
  return sectors.split(';').map(s => s.trim()).filter(Boolean)
}

// Parse geography string to JSON array
function parseGeo(geo: string): string[] {
  if (!geo) return []
  return geo.split(';').map(s => s.trim()).filter(Boolean)
}

async function main() {
  console.log('🚀 Importing VCs from vc-database.csv...\n')

  // Read CSV file
  const csvPath = join(process.cwd(), 'vc-database.csv')
  const csvContent = readFileSync(csvPath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  
  // Skip header row
  const dataLines = lines.slice(1)
  
  console.log(`📂 Found ${dataLines.length} VCs in CSV file\n`)

  // Get existing investors
  const existingInvestors = await prisma.investor.findMany({
    select: { id: true, firmName: true, email: true }
  })
  const existingByFirmName = new Map(existingInvestors.map(i => [i.firmName.toLowerCase(), i]))
  const existingByEmail = new Map(existingInvestors.map(i => [i.email.toLowerCase(), i]))
  
  console.log(`📊 ${existingInvestors.length} investors already in database\n`)

  let imported = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]
    const fields = parseCSVLine(line)
    
    if (fields.length < 17) {
      console.log(`⚠️  Skipping line ${i + 2}: insufficient fields (${fields.length})`)
      skipped++
      continue
    }

    const row: CSVRow = {
      firmName: fields[0],
      contactName: fields[1],
      email: fields[2],
      verified: fields[3],
      type: fields[4],
      stages: fields[5],
      sectors: fields[6],
      checkMin: fields[7],
      checkMax: fields[8],
      geoFocus: fields[9],
      leadFollow: fields[10],
      decisionSpeed: fields[11],
      personality: fields[12],
      applicationUrl: fields[13],
      websiteUrl: fields[14],
      bio: fields[15],
      thesis: fields[16],
    }

    if (!row.firmName || !row.email) {
      console.log(`⚠️  Skipping line ${i + 2}: missing firm name or email`)
      skipped++
      continue
    }

    try {
      // Check if exists by firm name or email
      const existingByName = existingByFirmName.get(row.firmName.toLowerCase())
      const existingByMail = existingByEmail.get(row.email.toLowerCase())
      const existing = existingByName || existingByMail

      // Prepare data
      const stages = parseStages(row.stages)
      const sectors = parseSectors(row.sectors)
      const geoFocus = parseGeo(row.geoFocus)
      const checkMin = parseInt(row.checkMin) || 0
      const checkMax = parseInt(row.checkMax) || 0
      
      // Combine bio and thesis for rich description
      const fullBio = [row.bio, row.thesis].filter(Boolean).join('\n\n') || `${row.firmName} - ${mapFundType(row.type)}`

      const data = {
        email: row.email,
        name: row.contactName || row.firmName,
        firmName: row.firmName,
        verified: row.verified?.toLowerCase() === 'yes',
        
        // Rich content from CSV
        bio: fullBio,
        thesis: row.thesis || null,
        
        // URLs - the key data we were missing!
        applicationUrl: row.applicationUrl || null,
        websiteUrl: row.websiteUrl || null,
        website: row.websiteUrl || null,
        
        // Investment criteria
        stages: JSON.stringify(stages),
        sectors: JSON.stringify(sectors),
        geoFocus: JSON.stringify(geoFocus),
        geography: JSON.stringify(geoFocus),
        
        // Check size
        checkMin: checkMin,
        checkMax: checkMax,
        checkSizeMin: checkMin * 1000, // Convert to actual dollars
        checkSizeMax: checkMax * 1000,
        
        // Fund details
        fundType: mapFundType(row.type),
        leadFollow: row.leadFollow?.toLowerCase() || 'either',
        decisionSpeed: row.decisionSpeed || null,
        personalityType: row.personality || null,
        
        // Default values
        valueAddTags: JSON.stringify([]),
        ethicsTags: JSON.stringify([]),
        isPublic: true,
        discoverable: true,
      }

      if (existing) {
        // Update existing investor with rich data
        await prisma.investor.update({
          where: { id: existing.id },
          data: data,
        })
        updated++
        
        if (updated % 50 === 0) {
          console.log(`   🔄 Updated ${updated} VCs...`)
        }
      } else {
        // Create new investor
        await prisma.investor.create({
          data: data,
        })
        imported++
        
        if (imported % 50 === 0) {
          console.log(`   ✅ Imported ${imported} VCs...`)
        }
      }
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint - already exists, try update
        try {
          const existingInv = await prisma.investor.findFirst({
            where: { OR: [
              { firmName: row.firmName },
              { email: row.email }
            ]}
          })
          if (existingInv) {
            const stages = parseStages(row.stages)
            const sectors = parseSectors(row.sectors)
            const geoFocus = parseGeo(row.geoFocus)
            const fullBio = [row.bio, row.thesis].filter(Boolean).join('\n\n') || existingInv.bio

            await prisma.investor.update({
              where: { id: existingInv.id },
              data: {
                bio: fullBio,
                thesis: row.thesis || existingInv.thesis,
                applicationUrl: row.applicationUrl || existingInv.applicationUrl,
                websiteUrl: row.websiteUrl || existingInv.websiteUrl,
                website: row.websiteUrl || existingInv.websiteUrl,
                decisionSpeed: row.decisionSpeed || existingInv.decisionSpeed,
                personalityType: row.personality || existingInv.personalityType,
                stages: JSON.stringify(stages),
                sectors: JSON.stringify(sectors),
                geoFocus: JSON.stringify(geoFocus),
                geography: JSON.stringify(geoFocus),
              }
            })
            updated++
          }
        } catch {
          errors++
        }
      } else {
        console.error(`❌ Error processing ${row.firmName}:`, error.message)
        errors++
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(50))
  console.log(`✅ New imports: ${imported}`)
  console.log(`🔄 Updated with rich data: ${updated}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(50))

  // Final count
  const totalCount = await prisma.investor.count()
  console.log(`\n📈 Total investors in database: ${totalCount}`)

  // Show sample of updated data
  console.log('\n📝 Sample of updated VCs with rich data:')
  const samples = await prisma.investor.findMany({
    where: { 
      AND: [
        { applicationUrl: { not: null } },
        { applicationUrl: { not: '' } }
      ]
    },
    take: 5,
    select: {
      firmName: true,
      bio: true,
      applicationUrl: true,
      websiteUrl: true,
      thesis: true,
    }
  })
  
  samples.forEach((vc, i) => {
    console.log(`\n${i + 1}. ${vc.firmName}`)
    console.log(`   Bio: ${vc.bio?.substring(0, 100)}...`)
    console.log(`   Application: ${vc.applicationUrl}`)
    console.log(`   Website: ${vc.websiteUrl}`)
  })

  await prisma.$disconnect()
}

main().catch(console.error)

