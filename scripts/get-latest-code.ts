import { db } from '../lib/db'

async function main() {
  const code = await db.verificationCode.findFirst({
    where: { verified: false },
    orderBy: { createdAt: 'desc' },
  })
  
  if (code) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 Latest Verification Code')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Email: ${code.email}`)
    console.log(`Code:  ${code.code}`)
    console.log(`Expires: ${code.expiresAt}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } else {
    console.log('No pending verification codes found.')
  }
  
  await db.$disconnect()
}

main().catch(console.error)

