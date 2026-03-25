/**
 * Give credits to a user
 * Usage: tsx scripts/give-credits.ts <email> <amount>
 */

import { db as prisma } from '../lib/db'

async function main() {
  const email = process.argv[2] || 'adventa.counseling@gmail.com'
  const amount = parseInt(process.argv[3] || '10000', 10)

  console.log(`\n🎁 Giving ${amount} credits to ${email}...\n`)

  // Find or create user
  let founder = await prisma.founder.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  })

  if (!founder) {
    console.log(`Creating founder account for ${email}...`)
    founder = await prisma.founder.create({
      data: {
        email,
        name: email.split('@')[0],
        stage: 'idea',
        sectors: '[]',
        location: 'US',
        fundingNeed: 0,
        ethicsTags: '[]',
        personalityTags: '[]',
        valueAddNeeds: '[]',
      },
      select: { id: true, name: true, email: true },
    })
    console.log(`✅ Created founder account`)
  }

  // Check if userCredits exists
  let userCredits = await prisma.userCredits.findUnique({
    where: { userId: founder.id },
  })

  if (!userCredits) {
    // Create userCredits record
    userCredits = await prisma.userCredits.create({
      data: {
        userId: founder.id,
        credits: amount,
        isPremium: false,
      },
    })
    console.log(`✅ Created userCredits and gave ${amount} credits to ${founder.name}`)
  } else {
    // Update existing
    userCredits = await prisma.userCredits.update({
      where: { userId: founder.id },
      data: {
        credits: { increment: amount },
      },
    })
    console.log(`✅ Added ${amount} credits to ${founder.name}`)
  }

  console.log(`\n📊 Current balance: ${userCredits.credits} credits\n`)
}

main()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
