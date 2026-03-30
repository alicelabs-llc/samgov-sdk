/**
 * samgov-sdk type definitions
 * @package samgov-sdk
 */

// ── Client config ──────────────────────────────────────────────

export interface SamClientConfig {
  /** SAM.gov API key (get one at https://api.data.gov/signup/) */
  apiKey: string
  /** Base URL override (default: https://api.sam.gov/opportunities/v2) */
  baseUrl?: string
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Max retries on 5xx errors (default: 3) */
  retries?: number
}

// ── Search parameters ──────────────────────────────────────────

export interface SamSearchParams {
  /** Keyword search query */
  query?: string
  /** Filter by NAICS code */
  naicsCode?: string
  /** Filter by notice type */
  noticeType?: SamNoticeType
  /** Filter by agency name */
  agency?: string
  /** Filter by set-aside type */
  setAside?: string
  /** Only return active opportunities (default: true) */
  activeOnly?: boolean
  /** Posted date from */
  postedFrom?: Date | string
  /** Posted date to */
  postedTo?: Date | string
  /** Response deadline from */
  deadlineFrom?: Date | string
  /** Response deadline to */
  deadlineTo?: Date | string
  /** Number of results per page (default: 25, max: 1000) */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

// ── Search response ────────────────────────────────────────────

export interface SamSearchResponse {
  /** Total matching records */
  total: number
  /** Array of opportunity objects */
  opportunities: SamOpportunity[]
  /** Whether more results are available */
  hasMore: boolean
  /** The search params used */
  params: SamSearchParams
}

// ── Notice types ───────────────────────────────────────────────

export type SamNoticeType =
  | 'Solicitation'
  | 'Award'
  | 'Presolicitation'
  | 'Sources Sought'
  | 'Special Notice'
  | 'Intent to Bundle'
  | 'Sale of Surplus Property'
  | 'Combined Synopsis/Solicitation'
  | 'Fair Opportunity / Limited Sources Justification'

// ── Set-aside types ────────────────────────────────────────────

export type SamSetAside =
  | 'Total Small Business'
  | 'Small Business'
  | 'SBA Certified 8(a)'
  | '8(a) Competitive'
  | '8(a) Sole Source'
  | 'HUBZone'
  | 'Service-Disabled Veteran-Owned Small Business'
  | 'Women-Owned Small Business'
  | 'Economically Disadvantaged Women-Owned Small Business'

// ── Opportunity ────────────────────────────────────────────────

export interface SamOpportunity {
  noticeId: string
  title: string
  solicitationNumber: string
  fullParentPathName: string
  postedDate: string
  type: SamNoticeType
  baseType: string
  archiveType: string
  archiveDate: string
  typeOfSetAsideDescription: string
  responseDeadLine: string
  naicsCode: string
  naicsCodes: string[]
  classificationCode: string
  active: 'Yes' | 'No'
  award?: Award
  pointOfContact: PointOfContact[]
  description: string
  organizationHierarchy: OrganizationHierarchy
  placeOfPerformance?: PlaceOfPerformance
  links: SamLink[]
  uiLink: string
}

export interface OrganizationHierarchy {
  l1Name: string
  l2Name?: string
  l3Name?: string
  l4Name?: string
}

export interface PointOfContact {
  type: string
  title?: string
  fullName: string
  email: string
  phone?: string
  fax?: string
}

export interface PlaceOfPerformance {
  city?: { code: string; name: string }
  state?: { code: string; name: string }
  country?: { code: string; name: string }
  zip?: string
}

export interface Award {
  date: string
  number?: string
  amount: string
  awardee: {
    name: string
    duns?: string
    ueiSAM?: string
    location?: PlaceOfPerformance
  }
}

export interface SamLink {
  rel: string
  href: string
}

// ── Scoring ────────────────────────────────────────────────────

export interface CompanyProfile {
  naicsCodes: string[]
  capabilities: string[]
  certifications: string[]
}

export interface ScoreBreakdown {
  /** Overall score 0-100 */
  score: number
  /** Score label */
  label: 'high' | 'medium' | 'low'
  /** Points from NAICS code match */
  naicsMatch: number
  /** Points from certification alignment */
  certMatch: number
  /** Points from capability keyword matching */
  capabilityMatch: number
  /** Penalty from deadline proximity */
  deadlinePenalty: number
  /** Which capabilities matched */
  matchedCapabilities: string[]
}

export interface ScoredOpportunity extends ScoreBreakdown {
  opportunity: SamOpportunity
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
}
