<div align="center">

# samgov-sdk

**TypeScript SDK for the SAM.gov Federal Opportunities API**

[![npm](https://img.shields.io/badge/npm-samgov--sdk-CB3837?style=flat-square&logo=npm)](https://www.npmjs.com/package/samgov-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-238636?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-0d1117?style=flat-square)](package.json)

Search, filter, paginate, and score federal contract opportunities with full type safety.

Built by [AliceLabs LLC](https://alicelabs.site)

</div>

---

## Install

```bash
npm install samgov-sdk
```

## Quick start

```typescript
import { createClient } from 'samgov-sdk'

const sam = createClient({
  apiKey: process.env.SAM_GOV_API_KEY!,
})

// Search for opportunities
const results = await sam.search({
  query: 'cloud infrastructure',
  naicsCode: '541512',
  noticeType: 'Solicitation',
  limit: 10,
})

console.log(`Found ${results.total} opportunities`)
results.opportunities.forEach(opp => {
  console.log(`${opp.title} — ${opp.agency}`)
})
```

## Features

### Search with filters

```typescript
const results = await sam.search({
  query: 'cybersecurity assessment',
  naicsCode: '541519',
  noticeType: 'Solicitation',
  agency: 'Department of Homeland Security',
  setAside: 'Total Small Business',
  activeOnly: true,
  deadlineFrom: new Date('2026-04-01'),
  deadlineTo: new Date('2026-06-30'),
  limit: 25,
  offset: 0,
})
```

### Auto-paginate all results

```typescript
for await (const opp of sam.searchAll({ query: 'AI services' })) {
  console.log(opp.title)
  // Automatically fetches next page when current page is exhausted
}
```

### Search and score against your company profile

```typescript
const scored = await sam.searchAndScore(
  { query: 'software development', limit: 50 },
  {
    naicsCodes: ['541511', '541512', '541519'],
    capabilities: ['react', 'node.js', 'cloud infrastructure', 'API integration'],
    certifications: ['Small Business', 'SBA 8(a)'],
  },
)

// Sorted by score (highest first)
scored.forEach(({ score, label, opportunity, matchedCapabilities }) => {
  console.log(`[${label.toUpperCase()}] ${score}/100 — ${opportunity.title}`)
  console.log(`  Matched: ${matchedCapabilities.join(', ')}`)
})
```

### Score a single opportunity

```typescript
import { SamGovClient } from 'samgov-sdk'

const breakdown = SamGovClient.scoreOpportunity(opportunity, myProfile)
// {
//   score: 85,
//   label: 'high',
//   naicsMatch: 25,
//   certMatch: 15,
//   capabilityMatch: 15,
//   deadlinePenalty: 0,
//   matchedCapabilities: ['react', 'node.js', 'cloud infrastructure']
// }
```

## Error handling

The SDK throws typed errors for different failure modes:

```typescript
import { SamApiError, SamRateLimitError, SamTimeoutError } from 'samgov-sdk'

try {
  const results = await sam.search({ query: 'test' })
} catch (err) {
  if (err instanceof SamRateLimitError) {
    console.log(`Rate limited. Retry after ${err.retryAfter}s`)
    console.log(`Remaining: ${err.rateLimit.remaining}/${err.rateLimit.limit}`)
  } else if (err instanceof SamTimeoutError) {
    console.log('Request timed out')
  } else if (err instanceof SamApiError) {
    console.log(`API error ${err.status}: ${err.message}`)
  }
}
```

## Configuration

```typescript
const sam = createClient({
  apiKey: 'your-api-key',     // Required — get one at https://api.data.gov/signup/
  baseUrl: 'https://...',     // Optional — override API base URL
  timeout: 30_000,            // Optional — request timeout in ms (default: 30s)
  retries: 3,                 // Optional — max retries on 5xx errors (default: 3)
})
```

## Scoring engine

The built-in scoring engine rates opportunities 0–100 against your company profile:

| Factor | Points | Logic |
|--------|--------|-------|
| NAICS match | +25 | Your NAICS codes include the opportunity's code |
| Set-aside alignment | +10–15 | Your certifications match the set-aside type |
| Capability keywords | +5 each (max +20) | Your capabilities appear in the description |
| Deadline proximity | -15 to -35 | Penalty for deadlines within 7 days |
| Base score | 50 | Starting point |

| Score | Label | Meaning |
|-------|-------|---------|
| 70–100 | `high` | Strong fit — prioritize |
| 40–69 | `medium` | Worth reviewing |
| 0–39 | `low` | Likely misaligned |

## API key

Get a free API key at [api.data.gov/signup](https://api.data.gov/signup/). The SAM.gov Opportunities API is free with rate limits (varies by tier).

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5.0+ (for full type inference)

## Related

- [`sam-gov-types`](https://github.com/alicelabsllc/sam-gov-types) — Standalone type definitions
- [`govcon-scoring`](https://github.com/alicelabsllc/govcon-scoring) — Standalone scoring engine

## License

MIT — [AliceLabs LLC](https://alicelabs.site)
