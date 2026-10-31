# ADR 0001: Liftkit's baseline stack and architecture

This is the first decision record in this repo — it exists to document
choices already made in building this starter kit (the box you're reading
this in), not to propose new ones. It doubles as a worked example of the ADR format
(`docs/templates/decision.md`): read it once to see what "good enough detail"
looks like, then write your own decisions the same way.

## Context

Liftkit is a paid, agent-native SaaS starter: a buyer clones it, runs
`/liftoff`, and ends up with a running, tested app built around their own
idea. That constrains every baseline choice toward the same goal — an agent
(and, secondarily, a human) must be able to understand and safely extend the
whole box inside one session, with no hidden infrastructure to provision
first.

## Options considered and decisions

### Single Next.js codebase, not a monorepo

**Options:** a `packages/*` monorepo (shared UI/db packages, separate
deployables) vs. one Next.js app.
**Decision:** one app. A buyer's v1 has one deployable; monorepo tooling
(workspace graphs, cross-package versioning) is ceremony with no payoff at
this size.
**Consequences:** faster onboarding, one `pnpm install`, one CI pipeline. If a
slice ever needs to ship as a separate deployable, that's the trigger to
extract it later — see `docs/rules/architecture.md`'s evolutionary note; this
ADR is the place that decision would supersede.

### FSD-lite feature slices, not layered MVC or a flat `src/`

**Options:** flat `src/` (grows unstructured), full Feature-Sliced Design
(steep learning curve, more ceremony than one app needs), or a lightweight
subset.
**Decision:** FSD-lite — `app/` (thin routes), `features/<name>/` (ui +
actions + queries + tests, public API via `index.ts`), `components/ui/`
(shadcn, no business logic), `lib/` (cross-cutting), `db/` (schema,
migrations, client). Import direction enforced by `boundaries/dependencies`
in `eslint.config.mjs` (see `docs/rules/architecture.md`).
**Consequences:** a feature can grow (3 slices or 30) without restructuring,
and cross-feature coupling is a lint error, not a code-review guess. Cost:
one more import-direction rule for an agent to learn up front, paid back the
first time a refactor doesn't cascade across the whole tree.

### PGlite by default, real Postgres via a switch

**Options:** require a real Postgres from minute one (Docker/hosted) vs.
in-process embedded Postgres (PGlite) vs. SQLite.
**Decision:** PGlite (`@electric-sql/pglite`) as the default local db —
zero external services, `pnpm db:reset` rebuilds it in one command — with
`LIFTKIT_DB=remote` + `DATABASE_URL` switching the same Drizzle schema to a
real Postgres (Docker Compose locally, managed Postgres in prod).
**Consequences:** a buyer runs `/liftoff` with no accounts, no Docker, no
waiting on a cloud db — but local data lives in a gitignored `.pglite/`
folder that doesn't survive a fresh clone, and the switch to `remote` is a
deliberate step the deploy playbook walks through, not
something that "just works" by changing an env var alone.

### Stateless JWT auth, not database sessions

**Options:** Auth.js database sessions (session table, adapter lookup per
request) vs. JWT sessions (stateless cookie, decoded locally).
**Decision:** JWT strategy. `src/middleware.ts` decodes the cookie locally via
the edge-safe `src/lib/auth.config.ts` (no adapter, no db import); the
db-backed adapter (`src/lib/auth.ts`) only runs in the Node runtime for
sign-in/OAuth linking. Real authorization for protected data still goes
through `requireUser()` in the data layer, never middleware alone.
**Consequences:** no network/db round-trip on every navigation (spec's
responsiveness invariant #2, `docs/rules/frontend.md`) — but this means
revoking a session before its JWT expires isn't instant; that trade-off is
accepted for an MVP-stage product and re-visited if a buyer's product needs
hard session revocation.

### oxlint + ESLint split, not one linter

**Options:** ESLint alone (slower, one config) vs. oxlint alone (fast, but
smaller rule surface than the project's needs) vs. both, layered.
**Decision:** both. `oxlint` runs first (fast, catches the bulk — including
`jsx-a11y` and the `nextjs(no-html-link-for-pages)` rule) and `eslint` runs
second for rules oxlint doesn't implement yet, notably the
`boundaries/dependencies` import-direction check. `pnpm lint` runs
`oxlint . && eslint . && prettier --check . && tsc --noEmit` in that order —
fail fast on the cheapest check first.
**Consequences:** two lint configs to keep in sync conceptually (not
literally — they cover different rules), but a lint run stays fast even as
the rule set grows; if oxlint's rule coverage catches up, the ESLint layer
can shrink without changing the `pnpm lint` contract.

### Fixed-window in-memory rate limiter, not a store-backed one

**Options:** no rate limiting (ships an open door on public endpoints), a
store-backed limiter (Redis/Upstash — another provisioned service), or an
in-memory fixed-window limiter.
**Decision:** in-memory fixed-window (`src/lib/rate-limit.ts`,
`rateLimit(key, opts)`) for public, unauthenticated endpoints.
**Consequences:** zero extra infrastructure for a single-instance MVP deploy
— but the limit is per-instance and resets on redeploy/restart, so it is
**not** sufficient once a buyer's deploy scales to multiple instances; the
deploy playbook flags the store-backed upgrade at that
point rather than baking in infra no MVP needs yet.

## Status

Accepted — this documents the state already shipped by this starter kit's
baseline; it is not proposing a change.
