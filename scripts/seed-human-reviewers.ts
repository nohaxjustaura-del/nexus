/**
 * Upsert default human reviewers (William Namgyal, Inigo Lenderking).
 * Usage: npm run db:seed-human-reviewers
 */

import { db } from '../lib/db'
import { seedDefaultHumanReviewers } from '../lib/seed-default-human-reviewers'

async function main() {
  console.log('Seeding default human reviewers (William Namgyal, Inigo Lenderking)…')
  await seedDefaultHumanReviewers(db)
  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
