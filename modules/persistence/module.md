---
name: persistence
description: Database (Drizzle + PGlite/postgres) and auth (next-auth + middleware + signin/dashboard/profile).
depends-on: []
presets: [App, App+Billing]
---

# persistence

Adds the data + auth layer to a Landing project. Depends on nothing; `billing`
depends on this.

## Apply plan

> Install the `persistence` module into this project. Work on a branch
> (`feat/add-persistence`) and commit once at the end.
>
> 1. **Mechanical apply.** Run `pnpm module:apply persistence`. This copies
>    `modules/persistence/files/**` into place, which OVERWRITES the Landing
>    versions of `src/lib/env.ts`, `src/lib/env.test.ts`, `src/app/page.tsx`
>    (the `/signin` link returns), `playwright.config.ts` (db reset + auth
>    env for the e2e server), and `src/core-boundary.test.ts` (Landing's guard
>    asserts the stack is absent; the module's version asserts it landed) —
>    the db/auth/seed env vars, the signin link and the auth e2e wiring all
>    come back automatically — and adds the module's deps and `db:*` scripts
>    to `package.json`. (The module carries no marker splices: prettier and
>    the unused-import lint make in-place splicing of those files unreliable,
>    so it ships full copies instead.) Run `pnpm install`.
> 2. **Env.** Copy `modules/persistence/fragments/env-example.md` into your
>    `.env.example` and `.env`; set `AUTH_SECRET` (`openssl rand -base64 33`).
> 3. **Schema & migrations.** Confirm `src/db/schema.ts` compiles with your
>    domain tables, then `pnpm db:migrate` (or `pnpm db:generate` first if you
>    changed the schema) — read the generated SQL before applying.
> 4. **Wiring (judgment).** Confirm the `/signin` link is back on the landing
>    page, `src/lib/env.ts` has the auth block, and `src/middleware.ts` matcher
>    covers your protected routes. Reconcile anything the mechanical apply could
>    not (a landing page you rewrote, a custom `env.ts`). `lighthouserc.js`
>    picks up `/signin` automatically once `src/app/signin` exists — no edit
>    needed there.
> 5. **Verify.** `pnpm db:reset && pnpm lint && pnpm test && pnpm test:e2e`.
> 6. Commit as `feat(persistence): add database and auth`.
