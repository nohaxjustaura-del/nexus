/**
 * Check and list VCs in the database
 */

import { db } from '../lib/db'

async function main() {
  console.log('🔍 Checking VCs in database...\n')
  
  const investors = await db.investor.findMany({
    where: { verified: true },
    select: {
      id: true,
      firmName: true,
      fundType: true,
      stages: true,
      sectors: true,
      thesis: true,
      checkSizeMin: true,
      checkSizeMax: true,
    },
    orderBy: { firmName: 'asc' },
  })
  
  console.log(`Found ${investors.length} verified VCs\n`)
  console.log('Top 30 VCs:')
  console.log('=' + '='.repeat(80))
  
  investors.slice(0, 30).forEach((vc, i) => {
    console.log(`\n${i + 1}. ${vc.firmName}`)
    console.log(`   Fund Type: ${vc.fundType || 'Not specified'}`)
    console.log(`   Stages: ${vc.stages || '[]'}`)
    console.log(`   Check Size: $${vc.checkSizeMin || 0}K - $${vc.checkSizeMax || 0}K`)
    console.log(`   Thesis: ${vc.thesis?.substring(0, 100) || 'Not specified'}...`)
  })
  
  console.log('\n' + '='.repeat(80))
  console.log(`\nTotal VCs: ${investors.length}`)
  
  // Export to file for web research
  const fs = require('fs')
  fs.writeFileSync(
    'vc-list-for-research.txt',
    investors.map((vc, i) => `${i + 1}. ${vc.firmName}`).join('\n')
  )
  console.log('\n✅ Exported VC list to vc-list-for-research.txt')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
