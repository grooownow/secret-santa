# Rule: Security

**Applies to:** every server action, route handler, env var, and auth-adjacent
change (spec §5.8) — this is baseline, not opt-in.

## Validate every boundary

Every server action / route handler starts by validating its raw input with a
`zod` schema — exemplar: `src/features/profile/update-name-action.ts`
(`nameSchema.safeParse`, called before touching the database, with
authorization checked even earlier). Copy that file's shape for new mutations:
`requireUser()` first → `safeParse` → typed `{ ok: true } | { ok: false; error }`
result → db write scoped to the authenticated user's own id. Skipping
validation on a boundary is the anti-pattern this exists to prevent.
`(partly enforced — agent-side)`: no lint rule can prove a `zod` parse guards
the right input, so the `PreToolUse` hook (`scripts/hooks/pretooluse.ts`) takes
the honest half of the job — when an edit adds a server action or route handler
that takes input and carries no visible `zod` parse, the write is escalated to
`ask` rather than denied. A heuristic that blocks is a heuristic that gets
switched off. The review lens still owns the semantic question: is the _right_
boundary validated?

## Typed environment

All env vars are declared in the `zod` schema in `src/lib/env.ts`; an invalid
or missing required var throws at startup with a readable message
(`parseEnv`), not a runtime crash later. Adding a var means all three:
schema entry in `src/lib/env.ts`, a documented (commented, optional-by-default)
line in `.env.example`, and a case in `src/lib/env.test.ts`. Verified:
`env.test.ts` already asserts default-mode boots with zero config and that
`GRIDFIN_DB=remote` requires `DATABASE_URL`.

## Secrets hygiene

- Never put a secret in code or a commit — env vars only, read through
  `src/lib/env.ts`.
- `.env`/`.env.local` are gitignored (`.gitignore`); `.env.example` holds
  documented placeholders only, never real values.
- `(enforced — hook + CI)` Secret scanning runs twice: `secretlint` over every
  staged file in the pre-commit hook (`lefthook.yml`), and `pnpm secrets:scan`
  over the whole tree in the CI `quality` job — so a key smuggled past a
  `--no-verify` commit still burns red before merge. Config:
  `.secretlintrc.json` (recommend preset), exclusions: `.secretlintignore`.
  A finding is never waived inline — rotate the leaked credential first, then
  clean the file; the scanner has no ignore-comment escape hatch on purpose.
- `pnpm audit --audit-level high` runs in CI (`quality` job,
  `.github/workflows/ci.yml`) — red on any high/critical advisory. Two escape
  hatches, both in `pnpm-workspace.yaml`, both requiring a comment that names
  the advisory, says why, and says what removes it:
  1. **A fix exists but a parent pins it away** → an `overrides:` entry, kept
     inside the vulnerable package's own major so it stays a security patch and
     not a silent upgrade. Precedent: `tmp@<0.2.6: ^0.2.6`
     (GHSA-ph9p-34f9-6g65, via `@lhci/cli`, dev-only).
  2. **No version can satisfy the advisory** (a false positive, or a range
     spanning majors while only the newest is patched) → an entry under
     `auditConfig` → `ignoreGhsas`. Precedent: `GHSA-mh99-v99m-4gvg`, whose
     only patch is `brace-expansion@5.0.8` while the one path that needs it,
     `minimatch@3`, cannot call 5.x's CommonJS export.

  Prefer the override. Reach for the ignore only after checking that no
  reachable version fixes it — and write down what you checked.
  Both entries are debt: delete them once upstream moves.

## Headers and rate limiting

- Security headers (`X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`) are set globally in
  `next.config.ts`'s `headers()`. A full Content-Security-Policy is
  **deliberately deferred** — a naive CSP breaks agent-added inline scripts in
  a skeleton this young; see the comment in `next.config.ts` before adding one.
- Public endpoints that accept unauthenticated input use
  `src/lib/rate-limit.ts` (`rateLimit(key, opts)`). It's an in-memory,
  per-instance fixed-window limiter — fine for a single-instance MVP; a
  multi-instance production deploy needs a store-backed limiter (see the
  deploy playbook), not this module as-is.

## Auth

- Middleware (`src/middleware.ts`) does a **local-only** JWT/cookie check via
  the edge-safe `src/lib/auth.config.ts` — no adapter, no db import. Do not
  add a network/db call there (see frontend.md rule 2 and the header comment
  in `src/middleware.ts` for why).
- Every protected server component/action calls `requireUser()`
  (`src/features/auth/require-user.ts`) directly — this is the real,
  db-backed guard; middleware alone is never sufficient authorization.
- Any redirect built from a user-supplied `callbackUrl` goes through
  `safeCallbackUrl()` (`src/features/auth/callback-url.ts`), which rejects
  absolute/protocol-relative targets to close the open-redirect vector — see
  its header comment for the exact cases it blocks.
- Credentials login (bcrypt hash check, db lookup) lives only in
  `src/lib/auth.ts` — never in the edge-safe `src/lib/auth.config.ts`
  (imported by `src/middleware.ts`), which stays db-free.
- `AUTH_DEV_BYPASS` defaults to `false` and is switched on for local runs by
  `.env.development`, which Next loads only when `NODE_ENV=development`. It
  can never reach a build or a production server by default; if one is
  configured with it on, `src/lib/env.ts` throws at startup, so a
  misconfigured deploy fails loudly instead of shipping an open door. (The
  default is `false` rather than `true` precisely because `next build` runs
  with `NODE_ENV=production` and evaluates that module.)
- `scripts/seed.ts` refuses to run when `NODE_ENV=production` — the seeded
  admin (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`) is a dev-only convenience;
  the first real production user is created manually.
- The sign-in server action validates input with `zod` and calls
  `rateLimit()` **before** checking the password hash — never the reverse.

## Errors and observability (adjacent, checked here)

- `console.log`/`console.*` in product code is a red lint: `no-console` is
  `"error"` in `.oxlintrc.json` (scripts/** is exempted).
- Empty `catch` blocks are now enforced: `no-empty` is `"error"` in
  `.oxlintrc.json` (red `pnpm lint`). Unhandled/swallowed promises remain
  `(convention — checked at review)` — type-aware linting is not installed.

## Gates (self-check before done)

- [ ] New action/route validates input with `zod` before use
- [ ] New env var: schema + `.env.example` + `env.test.ts` case, all three
- [ ] No secret literal in a diff; `.env*` untouched in git
- [ ] `pnpm audit --audit-level high` green (or a documented override/ignore)
- [ ] New protected surface calls `requireUser()`, not just middleware
