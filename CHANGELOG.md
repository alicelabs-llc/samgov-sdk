# Changelog

All notable changes to `samgov-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-03-30

### Added
- `createClient()` factory with `apiKey`, `baseUrl`, `timeout`, `retries` options
- `sam.search()` — filter by NAICS, notice type, agency, set-aside, date range
- `sam.searchAll()` — async generator for automatic pagination
- `sam.searchAndScore()` — search + score results against a company profile in one call
- `SamGovClient.scoreOpportunity()` — static scoring method (0–100) with breakdown
- `SamGovClient.labelFromScore()` — maps score to `high` / `medium` / `low`
- Typed errors: `SamApiError`, `SamRateLimitError`, `SamTimeoutError`
- Rate-limit metadata on `SamRateLimitError` (`retryAfter`, `rateLimit.remaining`)
- Zero external dependencies — uses native `fetch` (Node.js 18+)
- MIT license

[1.0.0]: https://github.com/alicelabs-llc/samgov-sdk/releases/tag/v1.0.0
