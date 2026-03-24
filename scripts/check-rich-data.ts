import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function check() {
  const total = await prisma.investor.count()
  const withAppUrl = await prisma.investor.count({ where: { applicationUrl: { not: null } } })
  const withWebsite = await prisma.investor.count({ where: { websiteUrl: { not: null } } })
  const withThesis = await prisma.investor.count({ where: { thesis: { not: null } } })
  const withBio = await prisma.investor.count({ where: { bio: { not: '' } } })
  
  console.log('📊 Database Status:')
  console.log('Total VCs:', total)
  console.log('With Application URL:', withAppUrl)
  console.log('With Website URL:', withWebsite)
  console.log('With Thesis:', withThesis)
  console.log('With Bio:', withBio)
  
  // Sample some with full data
  const samples = await prisma.investor.findMany({
    where: { applicationUrl: { not: null } },
    take: 5,
    select: { firmName: true, bio: true, applicationUrl: true, websiteUrl: true, thesis: true }
  })
  console.log('\n📝 Sample VCs with rich data:')
  samples.forEach((s, i) => {
    console.log(`\n${i+1}. ${s.firmName}`)
    console.log(`   App URL: ${s.applicationUrl}`)
    console.log(`   Website: ${s.websiteUrl}`)
    console.log(`   Bio: ${s.bio?.substring(0, 150)}...`)
  })
  
  await prisma.$disconnect()
}

check()

