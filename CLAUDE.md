# Secret Santa entry map

Use the daily map below: `docs/roadmap.md` for what's next,
`/feature <name>` to build it, `/design <surface>` for the visual loop,
`/review` to self-review a diff, `/verify` to run the full gate sequence
before merging. Occasional: `/deploy` to ship, `/doubt` to cross-examine a
decision before it stands, `/learn` to record what a future session must not
relearn. Full list: `README.md` → _Commands_.

## Hard invariants (never violate)

1. No internal `<a href>`/`window.location` navigation — always `<Link>`.
2. No network/db call in `src/middleware.ts` — the JWT check stays local.
3. No feature ships without a test proven able to fail.
4. Every server action/route validates input with `zod` before use.
5. Every commit follows Conventional Commits (see `docs/rules/git.md`).
6. UI colors come from the design tokens in `src/app/globals.css` — no
   hardcoded hex/rgb/hsl or arbitrary-value color classes in components
   (Next metadata images are exempt; see `docs/rules/frontend.md`).

Five of these six are not requests: a `PreToolUse` hook
(`scripts/hooks/pretooluse.ts`, registered in `.claude/settings.json`) reads
every proposed edit and **denies** #1, #2 and #5 outright, and escalates #4
and #6 to `ask` where a heuristic could be wrong. #3 is the one a hook cannot
see, so it stays with the `feature` and `review` skills. The hook always exits 0 and fails
open — if it breaks, you lose the guard, not the session.

## Chat language

Chat with the user in the language recorded in `docs/manifest.md` → _Chat
language_. If that field is still unset, fall back to the language of the
user's messages.

## Rules — read the one matching your task

- `docs/rules/definition-of-done.md` — the standing bar every change clears
- `docs/rules/architecture.md` — FSD-lite slices, import direction, migrations
- `docs/rules/frontend.md` — responsiveness invariants, tokens, a11y
- `docs/rules/testing.md` — test levels, anti-flaky rules, false-green bans
- `docs/rules/security.md` — validation, env, secrets, auth
- `docs/rules/git.md` — commit cadence, branches, pre-commit hook
- `docs/rules/docs.md` — docs map, ADRs, actualization rule
- `docs/rules/sources.md` — framework claims are cited, never remembered
- `docs/rules/skills.md` — skill authoring: templates, step fragments,
  description routing, loop budgets, checkpoints

## Playbooks

`docs/playbooks/` — step-by-step guides for deploy, billing, pricing, and
other occasional flows.

## Key commands

- `./scripts/bootstrap` — first-time setup (env, deps, db)
- `pnpm dev` — dev server on port 3210 (or the next free one), prints the URL
- `pnpm gates` — the full sequence in order + a PASS/FAIL table rendered from
  exit codes, recorded in `.gridfin/runs/` (`gates:show`, `gates:note`)
- `pnpm lint` — oxlint → eslint → prettier → tsc
- `pnpm test` — unit + component + integration (Vitest)
- `pnpm test:e2e` — Playwright end-to-end
- `pnpm db:reset` — rebuild local db (migrate + seed)
- `pnpm skills:validate` / `skills:evals` — skill-harness gates (structure,
  Cyrillic, description routing). You don't call these by hand: the `verify`
  skill runs them automatically whenever a diff touches `.claude/skills/**`
  or `docs/rules/**`, and CI runs them on every push.
