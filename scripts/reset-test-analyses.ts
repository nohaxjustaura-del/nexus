/**
 * Clears founder analysis rows for a clean local test slate.
 *
 * Usage (PowerShell):
 *   $env:I_AM_SURE='1'; $env:RESET_ALL_ANALYSIS_ROWS='1'; npx tsx scripts/reset-test-analyses.ts
 *
 * Or scope to one founder:
 *   $env:I_AM_SURE='1'; $env:RESET_FOUNDER_EMAIL='you@example.com'; npx tsx scripts/reset-test-analyses.ts
 *
 * Remote DB (e.g. Supabase): also set ALLOW_REMOTE_RESET=1
 */

import { db } from '../lib/db'

async function main() {
  if (process.env.I_AM_SURE !== '1') {
    console.error('Set I_AM_SURE=1 to run.')
    process.exit(1)
  }

  const url = process.env.DATABASE_URL || ''
  const looksLocal = /localhost|127\.0\.0\.1/.test(url)
  if (!looksLocal && process.env.ALLOW_REMOTE_RESET !== '1') {
    console.error(
      'DATABASE_URL does not look local. Set ALLOW_REMOTE_RESET=1 if you really want to purge this database.',
    )
    process.exit(1)
  }

  const founderEmail = process.env.RESET_FOUNDER_EMAIL?.trim()
  const allRows = process.env.RESET_ALL_ANALYSIS_ROWS === '1'

  if (!founderEmail && !allRows) {
    console.error('Set RESET_FOUNDER_EMAIL=<email> or RESET_ALL_ANALYSIS_ROWS=1')
    process.exit(1)
  }

  if (founderEmail && allRows) {
    console.error('Use only one of RESET_FOUNDER_EMAIL or RESET_ALL_ANALYSIS_ROWS')
    process.exit(1)
  }

  let founderId: string | null = null
  if (founderEmail) {
    const f = await db.founder.findUnique({ where: { email: founderEmail }, select: { id: true } })
    if (!f) {
      console.error(`No founder with email: ${founderEmail}`)
      process.exit(1)
    }
    founderId = f.id
    console.log(`Scoped to founder ${founderEmail} (${founderId})`)
  } else {
    console.log('RESET_ALL_ANALYSIS_ROWS: deleting all rows in analysis-related tables.')
  }

  const counts = await db.$transaction(async (tx) => {
    const r1 = founderId
      ? await tx.videoPitchReview.deleteMany({ where: { videoPitch: { founderId } } })
      : await tx.videoPitchReview.deleteMany()
    const r2 = founderId
      ? await tx.videoPitch.deleteMany({ where: { founderId } })
      : await tx.videoPitch.deleteMany()
    const r3 = founderId
      ? await tx.pitchDeckAnalysis.deleteMany({ where: { founderId } })
      : await tx.pitchDeckAnalysis.deleteMany()
    const r4 = founderId
      ? await tx.pitchIdeaAnalysis.deleteMany({ where: { founderId } })
      : await tx.pitchIdeaAnalysis.deleteMany()
    const r5 = founderId
      ? await tx.voiceRecording.deleteMany({ where: { founderId } })
      : await tx.voiceRecording.deleteMany()
    const r6 = founderId
      ? await tx.resumeAnalysis.deleteMany({ where: { founderId } })
      : await tx.resumeAnalysis.deleteMany()
    const r7 = founderId
      ? await tx.matchScore.deleteMany({ where: { founderId } })
      : await tx.matchScore.deleteMany()
    return { videoPitchReview: r1.count, videoPitch: r2.count, pitchDeck: r3.count, pitchIdea: r4.count, voice: r5.count, resume: r6.count, matchScore: r7.count }
  })

  console.log('Deleted:', counts)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
