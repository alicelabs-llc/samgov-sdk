/**
 * samgov-sdk — TypeScript SDK for the SAM.gov Public Opportunities API
 *
 * A fully typed, production-ready client for searching and retrieving
 * federal contract opportunities from SAM.gov.
 *
 * @package samgov-sdk
 * @author AliceLabs LLC <legal@alicelabs.site>
 * @license MIT
 */

import type {
  SamClientConfig,
  SamSearchParams,
  SamSearchResponse,
  SamOpportunity,
  SamNoticeType,
  SamSetAside,
  ScoredOpportunity,
  CompanyProfile,
  ScoreBreakdown,
  RateLimitInfo,
} from './types.js'

export * from './types.js'

const DEFAULT_BASE_URL = 'https://api.sam.gov/opportunities/v2'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_LIMIT = 25
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1_000

// ── Error classes ──────────────────────────────────────────────

export class SamApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'SamApiError'
  }
}

export class SamRateLimitError extends SamApiError {
  constructor(
    public readonly retryAfter: number,
    public readonly rateLimit: RateLimitInfo,
  ) {
    super(`Rate limited. Retry after ${retryAfter}s`, 429, 'RATE_LIMITED')
    this.name = 'SamRateLimitError'
  }
}

export class SamTimeoutError extends SamApiError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`, 0, 'TIMEOUT')
    this.name = 'SamTimeoutError'
  }
}

// ── Main client ────────────────────────────────────────────────

export class SamGovClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly retries: number
  private requestCount = 0
  private lastRequestTime = 0

  constructor(config: SamClientConfig) {
    if (!config.apiKey) {
      throw new Error('SAM.gov API key is required. Get one at https://api.data.gov/signup/')
    }
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT
    this.retries = config.retries ?? MAX_RETRIES
  }

  // ── Search opportunities ───────────────────────────────────

  /**
   * Search for federal contract opportunities on SAM.gov.
   *
   * @example
   * ```ts
   * const results = await client.search({
   *   query: 'cloud infrastructure',
   *   naicsCode: '541512',
   *   noticeType: 'Solicitation',
   *   activeOnly: true,
   *   limit: 10,
   * })
   * ```
   */
  async search(params: SamSearchParams = {}): Promise<SamSearchResponse> {
    const query = new URLSearchParams({
      api_key: this.apiKey,
      limit: String(params.limit ?? DEFAULT_LIMIT),
      offset: String(params.offset ?? 0),
    })

    if (params.query) query.set('q', params.query)
    if (params.naicsCode) query.set('naicsCode', params.naicsCode)
    if (params.noticeType) query.set('noticeType', params.noticeType)
    if (params.agency) query.set('organizationName', params.agency)
    if (params.setAside) query.set('typeOfSetAside', params.setAside)
    if (params.activeOnly !== false) query.set('active', 'Yes')

    if (params.postedFrom) query.set('postedFrom', this.formatDate(params.postedFrom))
    if (params.postedTo) query.set('postedTo', this.formatDate(params.postedTo))
    if (params.deadlineFrom) query.set('rdlfrom', this.formatDate(params.deadlineFrom))
    if (params.deadlineTo) query.set('rdlto', this.formatDate(params.deadlineTo))

    const url = `${this.baseUrl}/search?${query}`
    const data = await this.request<{ totalRecords: number; opportunitiesData: SamOpportunity[] }>(url)

    return {
      total: data.totalRecords ?? 0,
      opportunities: data.opportunitiesData ?? [],
      hasMore: (params.offset ?? 0) + (params.limit ?? DEFAULT_LIMIT) < (data.totalRecords ?? 0),
      params,
    }
  }

  /**
   * Search and automatically paginate through all results.
   * Yields opportunities one at a time.
   *
   * @example
   * ```ts
   * for await (const opp of client.searchAll({ query: 'AI services' })) {
   *   console.log(opp.title)
   * }
   * ```
   */
  async *searchAll(params: SamSearchParams = {}): AsyncGenerator<SamOpportunity> {
    let offset = params.offset ?? 0
    const limit = params.limit ?? DEFAULT_LIMIT
    let hasMore = true

    while (hasMore) {
      const result = await this.search({ ...params, offset, limit })
      for (const opp of result.opportunities) {
        yield opp
      }
      offset += limit
      hasMore = result.hasMore
    }
  }

  /**
   * Search and score opportunities against a company profile.
   * Returns opportunities sorted by score (highest first).
   *
   * @example
   * ```ts
   * const scored = await client.searchAndScore(
   *   { query: 'software development' },
   *   { naicsCodes: ['541511'], capabilities: ['react', 'node.js'], certifications: ['Small Business'] }
   * )
   * scored.forEach(s => console.log(`${s.score}/100 — ${s.opportunity.title}`))
   * ```
   */
  async searchAndScore(
    params: SamSearchParams,
    profile: CompanyProfile,
  ): Promise<ScoredOpportunity[]> {
    const result = await this.search(params)
    return result.opportunities
      .map(opp => ({
        opportunity: opp,
        ...SamGovClient.scoreOpportunity(opp, profile),
      }))
      .sort((a, b) => b.score - a.score)
  }

  // ── Scoring engine ─────────────────────────────────────────

  /**
   * Score a single opportunity against a company profile.
   * Returns a score (0-100) with full breakdown.
   */
  static scoreOpportunity(
    opp: SamOpportunity,
    profile: CompanyProfile,
  ): ScoreBreakdown {
    let score = 50
    let naicsMatch = 0
    let certMatch = 0
    let capabilityMatch = 0
    let deadlinePenalty = 0
    const matchedCapabilities: string[] = []

    // NAICS match
    if (profile.naicsCodes.includes(opp.naicsCode)) {
      naicsMatch = 25
      score += naicsMatch
    }

    // Certification alignment
    const certs = profile.certifications.map(c => c.toLowerCase())
    const aside = opp.typeOfSetAsideDescription ?? ''

    if (aside.includes('Small Business') && certs.length > 0) certMatch = 10
    if (aside.includes('8(a)') && certs.includes('sba 8(a)')) certMatch = 15
    if (aside.includes('Women') && certs.includes('wosb')) certMatch = 15
    if (aside.includes('HUBZone') && certs.includes('hubzone')) certMatch = 15
    if (aside.includes('Service-Disabled') && certs.includes('sdvosb')) certMatch = 15
    score += certMatch

    // Capability keywords
    const desc = (opp.description ?? '').toLowerCase()
    for (const cap of profile.capabilities) {
      if (desc.includes(cap.toLowerCase())) {
        matchedCapabilities.push(cap)
      }
    }
    capabilityMatch = Math.min(matchedCapabilities.length * 5, 20)
    score += capabilityMatch

    // Deadline proximity
    if (opp.responseDeadLine) {
      const daysLeft = (new Date(opp.responseDeadLine).getTime() - Date.now()) / 86_400_000
      if (daysLeft < 3) deadlinePenalty = -35
      else if (daysLeft < 7) deadlinePenalty = -15
      score += deadlinePenalty
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      label: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      naicsMatch,
      certMatch,
      capabilityMatch,
      deadlinePenalty,
      matchedCapabilities,
    }
  }

  // ── Internal HTTP ──────────────────────────────────────────

  private async request<T>(url: string, attempt = 1): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      this.requestCount++
      this.lastRequestTime = Date.now()

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '60', 10)
        throw new SamRateLimitError(retryAfter, {
          limit: parseInt(res.headers.get('X-RateLimit-Limit') ?? '0', 10),
          remaining: parseInt(res.headers.get('X-RateLimit-Remaining') ?? '0', 10),
          reset: parseInt(res.headers.get('X-RateLimit-Reset') ?? '0', 10),
        })
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        if (attempt < this.retries && res.status >= 500) {
          await this.delay(RETRY_DELAY_MS * attempt)
          return this.request<T>(url, attempt + 1)
        }
        throw new SamApiError(
          `SAM.gov API error: ${res.status} ${res.statusText}`,
          res.status,
          'API_ERROR',
          body,
        )
      }

      return (await res.json()) as T
    } catch (err) {
      if (err instanceof SamApiError) throw err
      if ((err as Error).name === 'AbortError') {
        throw new SamTimeoutError(this.timeout)
      }
      throw new SamApiError(
        `Network error: ${(err as Error).message}`,
        0,
        'NETWORK_ERROR',
        err,
      )
    } finally {
      clearTimeout(timer)
    }
  }

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toISOString().split('T')[0]
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /** Get request statistics */
  get stats() {
    return {
      totalRequests: this.requestCount,
      lastRequestTime: this.lastRequestTime
        ? new Date(this.lastRequestTime).toISOString()
        : null,
    }
  }
}

// ── Factory ────────────────────────────────────────────────────

/**
 * Create a new SAM.gov API client.
 *
 * @example
 * ```ts
 * import { createClient } from 'samgov-sdk'
 *
 * const sam = createClient({ apiKey: process.env.SAM_GOV_API_KEY })
 * const results = await sam.search({ query: 'cybersecurity' })
 * ```
 */
export function createClient(config: SamClientConfig): SamGovClient {
  return new SamGovClient(config)
}
