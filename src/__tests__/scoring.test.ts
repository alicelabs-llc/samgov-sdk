/**
 * samgov-sdk — Scoring engine tests
 */

import { SamGovClient } from '../index.js'
import type { SamOpportunity, CompanyProfile } from '../types.js'

// ── Test helpers ───────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${msg}`)
  } else {
    failed++
    console.log(`  ✗ ${msg}`)
  }
}

function makeOpp(overrides: Partial<SamOpportunity> = {}): SamOpportunity {
  return {
    noticeId: 'test-001',
    title: 'Test Opportunity',
    solicitationNumber: 'TEST-2026-001',
    fullParentPathName: 'Department of Defense',
    postedDate: '2026-03-01',
    type: 'Solicitation',
    baseType: 'Solicitation',
    archiveType: 'auto25',
    archiveDate: '2026-12-31',
    typeOfSetAsideDescription: '',
    responseDeadLine: new Date(Date.now() + 30 * 86400000).toISOString(),
    naicsCode: '541512',
    naicsCodes: ['541512'],
    classificationCode: 'D',
    active: 'Yes',
    pointOfContact: [],
    description: 'Cloud infrastructure modernization and software development services.',
    organizationHierarchy: { l1Name: 'Department of Defense' },
    links: [],
    uiLink: 'https://sam.gov/opp/test-001',
    ...overrides,
  } as SamOpportunity
}

const profile: CompanyProfile = {
  naicsCodes: ['541511', '541512', '541519'],
  capabilities: ['software development', 'cloud infrastructure', 'react', 'node.js'],
  certifications: ['Small Business', 'SBA 8(a)'],
}

// ── Tests ──────────────────────────────────────────────────────

console.log('\nsamgov-sdk — scoring engine tests\n')

console.log('NAICS matching:')
{
  const result = SamGovClient.scoreOpportunity(makeOpp({ naicsCode: '541512' }), profile)
  assert(result.naicsMatch === 25, 'Matching NAICS gives +25')
}
{
  const result = SamGovClient.scoreOpportunity(makeOpp({ naicsCode: '236220' }), profile)
  assert(result.naicsMatch === 0, 'Non-matching NAICS gives 0')
}

console.log('\nCertification alignment:')
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ typeOfSetAsideDescription: '8(a) Competitive' }),
    profile,
  )
  assert(result.certMatch === 15, '8(a) set-aside with SBA 8(a) cert gives +15')
}
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ typeOfSetAsideDescription: 'HUBZone' }),
    profile,
  )
  assert(result.certMatch === 0, 'HUBZone set-aside without cert gives 0')
}
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ typeOfSetAsideDescription: 'Small Business' }),
    profile,
  )
  assert(result.certMatch === 10, 'Small Business set-aside with certs gives +10')
}

console.log('\nCapability keywords:')
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ description: 'Need cloud infrastructure and software development with react and node.js expertise' }),
    profile,
  )
  assert(result.matchedCapabilities.length === 4, 'Finds all 4 matching capabilities')
  assert(result.capabilityMatch === 20, 'Caps at +20 (4 × 5)')
}
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ description: 'Construction services for building renovation' }),
    profile,
  )
  assert(result.matchedCapabilities.length === 0, 'No capabilities match construction')
  assert(result.capabilityMatch === 0, 'Zero capability match gives 0')
}

console.log('\nDeadline proximity:')
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ responseDeadLine: new Date(Date.now() + 2 * 86400000).toISOString() }),
    profile,
  )
  assert(result.deadlinePenalty === -35, 'Deadline in 2 days gives -35')
}
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ responseDeadLine: new Date(Date.now() + 5 * 86400000).toISOString() }),
    profile,
  )
  assert(result.deadlinePenalty === -15, 'Deadline in 5 days gives -15')
}
{
  const result = SamGovClient.scoreOpportunity(
    makeOpp({ responseDeadLine: new Date(Date.now() + 30 * 86400000).toISOString() }),
    profile,
  )
  assert(result.deadlinePenalty === 0, 'Deadline in 30 days gives no penalty')
}

console.log('\nScore labels:')
{
  const high = SamGovClient.scoreOpportunity(
    makeOpp({
      naicsCode: '541512',
      typeOfSetAsideDescription: '8(a) Competitive',
      description: 'cloud infrastructure and software development',
    }),
    profile,
  )
  assert(high.label === 'high', `Score ${high.score} labeled as "high"`)
}
{
  const low = SamGovClient.scoreOpportunity(
    makeOpp({
      naicsCode: '236220',
      description: 'building construction',
      responseDeadLine: new Date(Date.now() + 2 * 86400000).toISOString(),
    }),
    profile,
  )
  assert(low.label === 'low', `Score ${low.score} labeled as "low"`)
}

console.log('\nScore bounds:')
{
  const result = SamGovClient.scoreOpportunity(makeOpp(), profile)
  assert(result.score >= 0 && result.score <= 100, `Score ${result.score} is within 0-100`)
}

// ── Summary ────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
