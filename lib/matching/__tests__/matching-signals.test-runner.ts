/**
 * Run: npx tsx lib/matching/__tests__/matching-signals.test-runner.ts
 */
import assert from 'node:assert/strict'
import { buildFounderIdentitySignals, inferStudentFromText } from '../founder-identity-signals'
import { detectUniversityFromRegistry } from '../university-detection-registry'
import type { ComprehensiveFounderContext } from '@/lib/founder-context'

function baseFounder(partial: Partial<ComprehensiveFounderContext>): ComprehensiveFounderContext {
  return {
    id: 't',
    email: 't@test',
    name: 'T',
    isStudent: false,
    willingToDropOut: false,
    isImmigrant: false,
    isUnderrepresented: false,
    isVeteran: false,
    stage: 'pre-seed',
    sectors: ['saas'],
    location: 'US',
    fundingNeed: 500,
    ethicsTags: [],
    personalityTags: [],
    valueAddNeeds: [],
    profileCompleteness: 50,
    experienceLevel: 'early',
    techBackground: false,
    hasStrongTraction: false,
    ...partial,
  }
}

// --- Identity / student ---
assert.equal(inferStudentFromText(''), false)
assert.equal(inferStudentFromText("I'm a student at MIT"), true)
assert.equal(inferStudentFromText('We help enterprises migrate'), false)

const id1 = buildFounderIdentitySignals(baseFounder({ isImmigrant: true }), '')
assert.ok(id1.identityTags.includes('immigrant'))
assert.ok(id1.thesisAffinityPhrases.some((p) => p.includes('immigrant')))

const id2 = buildFounderIdentitySignals(baseFounder({ gender: 'female' }), '')
assert.ok(id2.identityTags.includes('woman_founder'))

const id3 = buildFounderIdentitySignals(baseFounder({}), 'I am a woman founder building a video tool')
assert.ok(id3.identityTags.includes('woman_founder'))

const id4 = buildFounderIdentitySignals(baseFounder({ isUnderrepresented: true }), '')
assert.ok(id4.identityTags.includes('underrepresented'))

// --- University registry ---
assert.equal(detectUniversityFromRegistry('at brown'), 'Brown University')
assert.equal(detectUniversityFromRegistry('studying at cal berkeley'), 'UC Berkeley')
assert.equal(
  detectUniversityFromRegistry('at cal haas student'),
  'UC Berkeley',
)
assert.equal(detectUniversityFromRegistry('the nelson center program'), 'Brown University')
assert.equal(detectUniversityFromRegistry('stanford cs'), 'Stanford University')

console.log('matching-signals tests: ok')
