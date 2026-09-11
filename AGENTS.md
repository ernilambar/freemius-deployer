# AGENTS.md

## Overview

Deploy WordPress plugin zips to Freemius via CLI. Node.js ESM package (Node >= 22), zero runtime deps beyond chalk/compare-versions/dotenv, linted with `neostandard` (via ESLint).

## Setup

```sh
npm ci
```

Create `.env` with `FREEMIUS_PRODUCT_ID` and `FREEMIUS_API_TOKEN` (see README).

## Commands

```sh
npm run lint        # eslint (neostandard)
npm run format      # eslint --fix
npm test             # node --test
npm run test:coverage
```

## Conventions

- ESM only — every source file uses `import`/`export`, `"type": "module"`.
- One module per concern: `cli.js` parses flags, `run.js` orchestrates, `deploy.js` talks to Freemius, `config.js` resolves config, `version.js` compares versions, `errors.js` defines custom errors.
- No TypeScript — plain `.js` files, no build step, `main` points at `lib/index.js`.
- Linting uses `neostandard` through ESLint, configured in `eslint.config.mjs` — do not add Prettier configs.
- Tests live in `test/` as `*.test.js`, one per module, run via `node --test`.

## Quality gate

**All gates MUST pass before any task is marked complete. No exceptions.**

- `npm run format` — auto-formats
- `npm run lint` — must exit with zero errors; fix all errors and re-run until clean
- `npm run test` — must complete with zero errors

If a step fails: fix the issue, then re-run from that step.
