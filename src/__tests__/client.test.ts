import { describe, it, expect, beforeEach } from 'vitest'
import { SamGovClient, createClient } from '../index'

// ---------------------------------------------------------------------------
// createClient factory
// ---------------------------------------------------------------------------

describe('createClient', () => {
  it('returns a SamGovClient instance', () => {
    const client = createClient({ apiKey: 'test-key' })
    expect(client).toBeInstanceOf(SamGovClient)
  })

  it('throws if no apiKey is provided', () => {
    // @ts-expect-error intentional missing arg
    expect(() => createClient({})).toThrow()
  })
})

// ---------------------------------------------------------------------------
// scoreOpportunity (static method)
// ---------------------------------------------------------------------------

describe('SamGovClient.scoreOpportunity', () => {
  const profile = {
    naicsCodes: ['541511', '541512', '541519'],
    capabilities: ['cloud infrastructure', 'react', 'node.js', 'api integration'],
    certifications: ['Small Business', 'SBA 8(a)'],
  }

  it('returns a score between 0 and 100', () => {
    const opp = {
      naicsCode: '541512',
      setAside: '8(a) Competitive',
      description: 'Cloud infrastructure and react development',
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const result = SamGovClient.scoreOpportunity(opp, profile)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('gives a high score for perfect match', () => {
    const opp = {
      naicsCode: '541512',
      setAside: 'Total Small Business',
      description: 'cloud infrastructure react node.js api integration services',
      responseDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const result = SamGovClient.scoreOpportunity(opp, profile)
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.label).toBe('high')
  })

  it('penalizes deadlines within 7 days', () => {
    const oppFarDeadline = {
      naicsCode: '541512',
      setAside: 'Total Small Business',
      description: 'cloud infrastructure',
      responseDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const oppCloseDeadline = {
      ...oppFarDeadline,
      responseDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const farResult = SamGovClient.scoreOpportunity(oppFarDeadline, profile)
    const closeResult = SamGovClient.scoreOpportunity(oppCloseDeadline, profile)
    expect(closeResult.score).toBeLessThan(farResult.score)
  })

  it('returns low label for mismatched opportunity', () => {
    const opp = {
      naicsCode: '111110', // Agriculture — unrelated
      setAside: 'None',
      description: 'Corn farming operations',
      responseDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const result = SamGovClient.scoreOpportunity(opp, profile)
    expect(result.label).toBe('low')
  })

  it('lists matched capabilities', () => {
    const opp = {
      naicsCode: '541519',
      setAside: 'None',
      description: 'We need react and node.js expertise',
      responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
    const result = SamGovClient.scoreOpportunity(opp, profile)
    expect(result.matchedCapabilities).toContain('react')
    expect(result.matchedCapabilities).toContain('node.js')
  })
})

// ---------------------------------------------------------------------------
// Score label thresholds
// ---------------------------------------------------------------------------

describe('score label thresholds', () => {
  it('labels 70+ as high', () => {
    const result = SamGovClient.labelFromScore(75)
    expect(result).toBe('high')
  })

  it('labels 40-69 as medium', () => {
    const result = SamGovClient.labelFromScore(55)
    expect(result).toBe('medium')
  })

  it('labels 0-39 as low', () => {
    const result = SamGovClient.labelFromScore(20)
    expect(result).toBe('low')
  })
})
