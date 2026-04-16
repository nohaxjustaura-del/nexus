/**
 * Regression: unified AI analysis must not resolve an implicit admin Prisma user without a session.
 * Run: npx tsx lib/auth/__tests__/ai-analysis-auth-policy.test-runner.ts
 * CI: npm run test:auth-policy
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const authSrc = readFileSync(join(__dirname, '..', '..', 'auth.ts'), 'utf8')

assert.ok(
  !/\bgetAdminUser\b/.test(authSrc),
  'lib/auth.ts must not reference getAdminUser (removed insecure analysis fallback)',
)

const idx = authSrc.indexOf('export async function getUserForAiAnalysis')
assert.ok(idx >= 0, 'getUserForAiAnalysis not found')
const tail = authSrc.slice(idx)
assert.ok(
  tail.includes('return null'),
  'getUserForAiAnalysis should return null when no session / dev bypass',
)
assert.ok(
  !tail.includes('getAdminUser'),
  'getUserForAiAnalysis block must not call getAdminUser',
)

console.log('ai-analysis-auth-policy: ok')
