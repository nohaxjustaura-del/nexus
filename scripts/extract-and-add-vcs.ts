import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Dynamic import for pdf-parse
const pdfParse = require('pdf-parse')

const prisma = new PrismaClient()

// Get all existing VC emails and firm names to check for duplicates
async function getExistingVCs() {
  const investors = await prisma.investor.findMany({
    select: {
      email: true,
      firmName: true,
    },
  })
  
  const emails = new Set(investors.map(i => i.email.toLowerCase()))
  const firmNames = new Set(investors.map(i => i.firmName.toLowerCase()))
  
  return { emails, firmNames }
}

// Parse VC data from text - improved parser
function parseVCsFromText(text: string): Array<{
  email: string
  name: string
  firmName: string
  fundType?: string
  stages?: string[]
  sectors?: string[]
  checkMin?: number
  checkMax?: number
  geoFocus?: string[]
  [key: string]: any
}> {
  const vcs: any[] = []
  
  // Extract emails
  const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g
  const emails = [...new Set(text.match(emailRegex) || [])]
  
  // Split into lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  // Try to identify firm names and VC entries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Look for potential firm names (capitalized, reasonable length)
    if (line.length > 3 && line.length < 100 && /^[A-Z]/.test(line)) {
      // Check if there's an email nearby
      const nearbyLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5))
      const nearbyText = nearbyLines.join(' ')
      const nearbyEmail = emails.find(e => {
        const emailPrefix = e.toLowerCase().split('@')[0]
        return nearbyText.toLowerCase().includes(emailPrefix) || 
               line.toLowerCase().includes(emailPrefix) ||
               emailPrefix.includes(line.toLowerCase().split(' ')[0].toLowerCase())
      })
      
      if (nearbyEmail) {
        // Try to extract more info
        const checkSizeMatch = nearbyText.match(/\$?(\d+)[KkMmBb]?\s*[-–]\s*\$?(\d+)[KkMmBb]?/i)
        const stageMatch = nearbyText.match(/(pre-seed|seed|series\s*[a-z]|early\s*stage)/i)
        const sectorMatch = nearbyText.match(/(AI|ML|SaaS|Fintech|Healthcare|Consumer|Enterprise|B2B|B2C|Climate|EdTech|DeepTech|Biotech|Hardware|Crypto|Web3)/i)
        
        // Determine fund type
        let fundType = 'institutional'
        const lowerText = nearbyText.toLowerCase()
        if (lowerText.includes('accelerator') || lowerText.includes('yc') || lowerText.includes('techstars')) {
          fundType = 'accelerator'
        } else if (lowerText.includes('angel') || lowerText.includes('angels')) {
          fundType = 'angel'
        } else if (lowerText.includes('micro') || lowerText.includes('micro-vc')) {
          fundType = 'micro-VC'
        } else if (lowerText.includes('fellowship')) {
          fundType = 'fellowship'
        }
        
        vcs.push({
          email: nearbyEmail.toLowerCase(),
          name: line.split(' ')[0] + ' Team',
          firmName: line,
          fundType,
          stages: stageMatch ? [stageMatch[1]] : ['Seed'],
          sectors: sectorMatch ? [sectorMatch[1]] : ['SaaS'],
          checkMin: checkSizeMatch ? parseInt(checkSizeMatch[1]) * (checkSizeMatch[0].toLowerCase().includes('m') ? 1000 : checkSizeMatch[0].toLowerCase().includes('b') ? 1000000 : 1) : 100,
          checkMax: checkSizeMatch ? parseInt(checkSizeMatch[2]) * (checkSizeMatch[0].toLowerCase().includes('m') ? 1000 : checkSizeMatch[0].toLowerCase().includes('b') ? 1000000 : 1) : 500,
          geoFocus: ['Global'],
        })
      }
    }
  }
  
  // Also try to find entries by email pattern (for emails without clear firm names)
  for (const email of emails) {
    const emailDomain = email.split('@')[1]
    const firmNameGuess = emailDomain.split('.')[0]
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    
    // Check if we already have this VC
    if (!vcs.find(vc => vc.email === email.toLowerCase())) {
      // Try to find context around this email
      const emailIndex = text.toLowerCase().indexOf(email.toLowerCase())
      if (emailIndex > -1) {
        const context = text.substring(Math.max(0, emailIndex - 200), Math.min(text.length, emailIndex + 200))
        const checkSizeMatch = context.match(/\$?(\d+)[KkMmBb]?\s*[-–]\s*\$?(\d+)[KkMmBb]?/i)
        const stageMatch = context.match(/(pre-seed|seed|series\s*[a-z]|early\s*stage)/i)
        const sectorMatch = context.match(/(AI|ML|SaaS|Fintech|Healthcare|Consumer|Enterprise|B2B|B2C|Climate|EdTech|DeepTech|Biotech|Hardware|Crypto|Web3)/i)
        
        vcs.push({
          email: email.toLowerCase(),
          name: firmNameGuess + ' Team',
          firmName: firmNameGuess,
          fundType: 'institutional',
          stages: stageMatch ? [stageMatch[1]] : ['Seed'],
          sectors: sectorMatch ? [sectorMatch[1]] : ['SaaS'],
          checkMin: checkSizeMatch ? parseInt(checkSizeMatch[1]) * (checkSizeMatch[0].toLowerCase().includes('m') ? 1000 : checkSizeMatch[0].toLowerCase().includes('b') ? 1000000 : 1) : 100,
          checkMax: checkSizeMatch ? parseInt(checkSizeMatch[2]) * (checkSizeMatch[0].toLowerCase().includes('m') ? 1000 : checkSizeMatch[0].toLowerCase().includes('b') ? 1000000 : 1) : 500,
          geoFocus: ['Global'],
        })
      }
    }
  }
  
  return vcs
}

async function main() {
  console.log('📄 Extracting VCs from PDFs...')
  console.log('Starting script...')
  console.log('Current directory:', process.cwd())
  
  try {
    
    const pdfFiles = [
      'VC list generation request.pdf',
      'VC list generation request (1).pdf'
    ]
  
    const allVCs: any[] = []
    
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(process.cwd(), pdfFile)
    
    if (!fs.existsSync(pdfPath)) {
      console.log(`⚠️  File not found: ${pdfFile}`)
      continue
    }
    
    try {
      console.log(`\n📖 Reading ${pdfFile}...`)
      const dataBuffer = fs.readFileSync(pdfPath)
      console.log(`   File size: ${dataBuffer.length} bytes`)
      const data = await pdfParse(dataBuffer)
      const text = data.text
      console.log(`   Extracted ${text.length} characters`)
      
      console.log(`✅ Extracted ${text.length} characters`)
      
      // Save extracted text for review
      const outputFile = pdfFile.replace('.pdf', '.txt')
      fs.writeFileSync(outputFile, text)
      console.log(`💾 Saved to ${outputFile}`)
      
      // Parse VCs from text
      const vcs = parseVCsFromText(text)
      console.log(`📊 Found ${vcs.length} potential VCs`)
      allVCs.push(...vcs)
      
      } catch (error: any) {
        console.error(`❌ Error processing ${pdfFile}:`, error.message)
      }
    }
    
    if (allVCs.length === 0) {
    console.log('\n⚠️  No VCs extracted. Please check the PDF format.')
    console.log('💡 Tip: The extracted .txt files are saved - you can manually parse them.')
    return
  }
  
    console.log(`\n🔍 Checking for duplicates...`)
    const { emails, firmNames } = await getExistingVCs()
    
    const newVCs = allVCs.filter(vc => {
    const emailExists = emails.has(vc.email.toLowerCase())
    const nameExists = firmNames.has(vc.firmName.toLowerCase())
    
    if (emailExists || nameExists) {
      console.log(`⏭️  Skipping duplicate: ${vc.firmName} (${vc.email})`)
      return false
    }
    return true
  })
  
    console.log(`\n✅ Found ${newVCs.length} new VCs to add (out of ${allVCs.length} total)`)
    
    if (newVCs.length === 0) {
      console.log('\n✨ All VCs already exist in database!')
      return
    }
    
    console.log('\n📝 New VCs:')
    newVCs.forEach((vc, i) => {
      console.log(`${i + 1}. ${vc.firmName} - ${vc.email}`)
    })
    
    // Add to database
    console.log('\n💾 Adding VCs to database...')
    let added = 0
    let errors = 0
    
    for (const vc of newVCs) {
    try {
      await prisma.investor.create({
        data: {
          email: vc.email,
          name: vc.name,
          firmName: vc.firmName,
          verified: false, // Will need admin approval
          stages: JSON.stringify(vc.stages || ['Seed']),
          checkMin: vc.checkMin || 100,
          checkMax: vc.checkMax || 500,
          sectors: JSON.stringify(vc.sectors || ['SaaS']),
          geoFocus: JSON.stringify(vc.geoFocus || ['Global']),
          leadFollow: 'either',
          fundType: vc.fundType || 'institutional',
          valueAddTags: JSON.stringify([]),
          ethicsTags: JSON.stringify([]),
          applicationUrl: `https://${vc.email.split('@')[1]}/apply`,
        },
      })
      added++
      console.log(`✅ Added: ${vc.firmName}`)
    } catch (error: any) {
      errors++
      console.error(`❌ Error adding ${vc.firmName}:`, error.message)
    }
  }
  
    console.log(`\n✨ Done! Added ${added} VCs, ${errors} errors`)
  } catch (error: any) {
    console.error('❌ Fatal error:', error)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
    console.log('Database connection closed')
  }
}

main()

