# Contributing to samgov-sdk

Thank you for your interest in contributing! This guide explains how to get started.

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
git clone https://github.com/alicelabs-llc/samgov-sdk.git
cd samgov-sdk
npm install
```

## Development workflow

```bash
npm run build       # Compile TypeScript
npm test            # Run Vitest tests
npx tsc --noEmit    # Type-check without emitting
```

## Commit conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `refactor:` | Code change that isn't a fix or feature |
| `chore:` | Build process, tooling, deps |

Example: `feat: add deadlineFrom filter to search()`

## Submitting a PR

1. Fork the repo and create your branch from `master`
2. Add tests for any new functionality
3. Ensure all checks pass: `npm test && npx tsc --noEmit`
4. Open a PR — the template will guide you

## Reporting bugs

Use the [bug report template](https://github.com/alicelabs-llc/samgov-sdk/issues/new?template=bug_report.md).

---

Questions? → [contacto@alicelabs.site](mailto:contacto@alicelabs.site)
