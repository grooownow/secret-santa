# Rule: Architecture

**Applies to:** new routes, feature slices, data access, import direction, schema changes.

## The shape (FSD-lite, one architecture, no variants)

```
src/
├── app/            # routes + layouts only — thin, no business logic
├── features/       # <feature>/ slices: ui + actions + queries + tests
├── components/ui/  # reusable UI (shadcn) — no business logic, no feature imports
├── lib/            # cross-cutting core: auth, env, logger, rate-limit
└── db/             # drizzle schema, migrations, client, factories
```

Real example slice: `src/features/profile/` (`index.ts`, `profile-form.tsx`,
`profile-form.test.tsx`, `update-name-action.ts`). `src/features/auth/` is the
same shape (`index.ts`, `require-user.ts`, `sign-in-page.tsx`,
`callback-url.ts` + colocated `*.test.ts`).

A feature grows by adding slices, not by restructuring — 3 features or 30, the
rules below don't change.

## Import direction — enforced, not a convention

| From                         | May import                                                                        | Enforcement                                      |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| `app`                        | a feature's `index.ts`/`index.tsx` only, or `components/ui`\|`lib`\|`db`          | `boundaries/dependencies` in `eslint.config.mjs` |
| `feature`                    | `components/ui`\|`lib`\|`db`; another feature only via its `index.ts`/`index.tsx` | same rule                                        |
| `components/ui`, `lib`, `db` | each other only — never a feature                                                 | same rule                                        |

A feature's own internal files import each other freely; only _cross_-feature
imports are restricted to the public `index.ts`. Violating any of this is a
red `pnpm lint` (`eslint` step) — verified: importing another feature's
internal file directly throws `boundaries/dependencies` error, not a warning.

## Slice anatomy

- `index.ts` — the slice's **public API**: re-export only what other slices/
  `app` are allowed to use (see `src/features/profile/index.ts`).
- `*-action.ts` — server actions (`"use server"`), one exported async function
  set per file; see security.md for the required shape.
- `*.tsx` — UI; colocate `*.test.tsx`/`*.test.ts` next to the file they cover.
- Queries/reads that aren't a full action still go through the slice, never
  straight from `app/`.

## Data access

- The database is reached only via `src/db/client.ts` (`getDb()`), from a
  feature's actions/queries or from `lib/` — never imported directly into
  `app/` or `components/ui/`.
- Route files are **thin**: parse input → call a feature function → render.
  `src/app/dashboard/page.tsx` and `src/features/profile/update-name-action.ts`
  are the reference shape (parse/authorize → call → respond).

## Migrations (convention — checked at review)

- Never hand-edit a migration under `src/db/migrations/` once it has been
  applied to any shared environment (dev DB, CI, prod).
- Schema changes: edit `src/db/schema.ts` → `pnpm db:generate` (writes a new
  migration) → review the generated SQL → `pnpm db:migrate`. Never skip the
  review step for a generated migration touching existing columns.
- Breaking local schema changes: `pnpm db:reset` (drops `.pglite/`, re-runs
  migrate + seed) is the sanctioned reset path, not manual file surgery.

## Framework notes

- Next.js App Router: Server Components by default; add `"use client"` only
  for state/effects/browser APIs, and push it as low in the tree as possible.
- Auth wiring is split for a reason — see `src/middleware.ts`'s header comment
  and security.md before touching either `src/lib/auth.config.ts` (edge-safe)
  or `src/lib/auth.ts` (Node/db-backed adapter).

## Evolutionary note

A monorepo split (`packages/*`) is deliberately **not** part of the box — it's
extra ceremony a single-app SaaS starter doesn't need yet. If a slice
genuinely outgrows this repo (shared across multiple deployables), that's the
trigger to extract it; record the decision in `docs/decisions/` when it
happens rather than pre-building the scaffolding now.

## Gates (self-check before done)

- [ ] `pnpm lint` green (boundaries/dependencies, no cross-feature deep import)
- [ ] New route stays thin; logic lives in a feature or `lib/`
- [ ] Schema change went through generate → review → migrate
- [ ] New/changed feature has a colocated `index.ts` export surface
