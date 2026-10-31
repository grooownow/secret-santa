# QA Project Profile

> Pre-filled for this template on 2026-07-09. Other qa-pilot skills
> read this file instead of re-scanning the repo. Stack/frameworks/commands
> below are pre-filled for the box and stable across projects built on it;
> only the product-specific fields (marked `<!-- gridfin:fill -->`) change
> per project — `/gridfin` step 4f fills them from the PRD. Re-run
> `qa-pilot:onboard` only if the stack or conventions change materially.

## Stack

- Next.js 16 (App Router), TypeScript strict, Tailwind v4 + shadcn/radix-ui.
- Package manager: pnpm (single-app repo, no monorepo).
- Drizzle ORM; local db is PGlite (embedded Postgres, file-backed at
  `.pglite/`), or a real Postgres via `GRIDFIN_DB=remote` + `DATABASE_URL`
  (see `docker-compose.yml` for a local Postgres option). These db /
  testing-db sections apply to **App**/**App+Billing** projects only — a
  **Landing** project (see `docs/manifest.md` → `## Preset`) has no
  database; skip them.
- Auth: next-auth (Auth.js) v5 beta, JWT session, edge-safe config split from
  the Node adapter — see `docs/rules/architecture.md` (Framework notes).
- Run the app locally: `pnpm dev` (dev server, port 3210 — shifts to the
  next free port if taken).

## Test landscape

- **Vitest** (`vitest.config.ts`), three projects, one `pnpm test` run:
  - `unit` — `src/**/*.test.ts`, node env, db mocked (e.g. `src/lib/env.test.ts`).
  - `component` — `src/**/*.test.tsx`, jsdom + Testing Library, setup file
    `vitest.setup.ts` (e.g. `src/features/profile/profile-form.test.tsx`).
  - `integration` — `tests/integration/**/*.test.ts`, node env, real
    in-memory PGlite per test file (`fileParallelism: false` — PGlite doesn't
    like concurrency), e.g. `tests/integration/profile-action.test.ts`.
- **Playwright e2e** (`playwright.config.ts`), `tests/e2e/**/*.spec.ts`
  (currently `tests/e2e/smoke.spec.ts`), projects `desktop-chromium` and
  `mobile-chromium` (Pixel 7 viewport).
- Full decision table (what belongs at which level) + anti-flaky rules
  (no arbitrary sleeps, deferred-promise pattern for async UI, fake timers
  for time-based logic) + false-green bans (no assertion-free tests, no
  over-mocked integration tests) + factories/seed convention: see
  `docs/rules/testing.md` — do not duplicate that content here.
- **Prove-the-test-can-fail rule** (`docs/rules/testing.md`): a new test is
  not done until it's been watched to fail for the right reason, then pass —
  checked by the `feature`/`review` skills' test-honesty lens, not by a lint
  rule.

## Commands

- Run all tests: `pnpm test` (all three Vitest projects, no watch).
- Run one file: `pnpm exec vitest run <path>` (e.g.
  `pnpm exec vitest run src/lib/env.test.ts`).
- Run one Vitest project only: `pnpm exec vitest run --project <unit|component|integration>`.
- E2E: `pnpm test:e2e` (Playwright, both projects); one file:
  `pnpm exec playwright test tests/e2e/smoke.spec.ts`.
- Typecheck: `pnpm typecheck` (`tsc --noEmit`).
- Lint (full chain — oxlint → eslint → prettier --check → tsc):
  `pnpm lint`.
- Format: `pnpm format` (prettier --write).
- Start dev server: `pnpm dev` (port 3210).
- Local db reset (migrate + seed): `pnpm db:reset` — exists only once the
  `persistence` module is installed; Landing has no database.
- First-time setup: `./scripts/bootstrap`.

## Conventions

- Locators, fixtures, tagging, naming, factories/seed: see
  `docs/rules/testing.md` in full (this profile does not restate it).
- Architecture/import direction (relevant when tests touch feature slices):
  `docs/rules/architecture.md`.
- Data validation (zod at every boundary) and auth rules relevant to test
  setup (session mocking, `requireUser`): `docs/rules/security.md`.
- Commit convention (Conventional Commits) and gate cadence:
  `docs/rules/git.md`.
- Test-fixture emails use the `@gridfin.dev` domain (e.g. `a@gridfin.dev`)
  — a technical identifier, not a real domain; keep this pattern for new
  fixtures.

## Environments

- **Local** (App preset — the `persistence` module): PGlite (default,
  `GRIDFIN_DB=pglite`, zero external services); data lives in `.pglite/`
  (gitignored), reset via `pnpm db:reset`. Landing has no database at all.
- **Remote db option**: `docker compose up -d` + `GRIDFIN_DB=remote` +
  `DATABASE_URL=postgres://gridfin:gridfin@localhost:5432/gridfin` in `.env`.
- **E2E webServer**: Playwright's `webServer` runs `pnpm build && pnpm start`
  (the `persistence` module prepends `pnpm db:reset`) — a real production build on
  `http://localhost:3210`, not `next dev`; the suite always boots its own
  server (`reuseExistingServer: false`), so a running `pnpm dev` is never
  silently tested in its place. `AUTH_SECRET`/`AUTH_TRUST_HOST` are
  dummy/local-only values injected for the e2e server, not real secrets.
- **CI** (`.github/workflows/ci.yml`), 5 jobs: `quality` (lint + test +
  `pnpm audit --audit-level high`), `golden-path` (bootstrap from clean
  checkout + build), `remote-db` (test suite against a real Postgres
  service container), `e2e` (Playwright, uploads report on failure),
  `lighthouse` (perf/a11y budgets against a production build,
  `lighthouserc.js`).
- **Never touch production** — no production URL exists until the deploy
  playbook (`docs/playbooks/deploy.md`) is run; treat any deployed URL found
  in `docs/manifest.md` as read-only unless the user says otherwise.
- Credentials: no real secrets in the repo; `.env` (gitignored) is copied
  from `.env.example` by `scripts/bootstrap`; test/e2e auth uses dummy
  values, never real OAuth credentials.

## Tracker & access

<!-- gridfin:fill -->

## Priorities

<!-- gridfin:fill -->

(Product name, one-line domain description, and the 2-3 critical user paths
that matter most for coverage — filled by `/gridfin` step 4f from
`docs/prd.md`/`docs/specs/`; stack/commands/conventions above are the box's
and stay as-is regardless of the product built on it.)

## Open gaps

- Product priorities (above) are unknown until `/gridfin` runs.
