# Rule: Git

**Applies to:** every commit, branch, and merge in this repo (spec §5.9).

## Conventional commits

Every commit message follows Conventional Commits (`feat:`, `fix:`, `docs:`,
`test:`, `chore:`, `ci:` + optional `(scope)`), following the convention this
repo uses (a couple of early docs commits predate it; `git log --oneline` shows
the pattern). `(enforced — agent-side)`: the `PreToolUse` hook registered in
`.claude/settings.json` (`scripts/hooks/pretooluse.ts`) denies a `git commit`
whose subject is not conventional. It is not a `commit-msg` hook — a human
committing by hand is still on the honour system, and `lefthook.yml`'s
`pre-commit` only runs `oxlint` and `prettier --check`.

## Commit cadence

Commit after every green step, not in one giant batch at the end — this is
what makes `git log` a usable resume point (the `feature` skill relies on
commit history to resume a multi-step flow).
A "green step" means the gates relevant to that step passed, not just that
the code compiles.

## Main and branches

- `main` is always in a working state — never push a red `main`.
- Non-trivial work happens on a feature branch, merged back only after
  `verify` (the skill: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`)
  is green on that branch.
- CI (`.github/workflows/ci.yml`) runs on every push to `main` and on every
  pull request — `quality`, `golden-path`, `remote-db`, `e2e`, and
  `lighthouse` jobs must all pass before merging.

## Pre-commit hook

`lefthook.yml`'s `pre-commit` runs `oxlint` and `prettier --check` on staged
files in parallel — fast, local checks only. Heavier gates (`eslint`,
`tsc --noEmit`, the full test suites, Lighthouse) stay in CI, not pre-commit,
so commits stay quick. Install it via `pnpm prepare` (runs automatically after
`pnpm install`, per the `prepare` script in `package.json`).

## What NOT to commit

- Anything under `.gitignore`: `node_modules/`, `.next/`, `.env`/`.env.local`,
  `.pglite/`, `coverage/`, `*.tsbuildinfo`, `test-results/`,
  `playwright-report/`, `.lighthouseci/`.
- Secrets of any kind — see security.md. `.env.example` documents var names
  only, never real values.
- Generated build output or lockfile drift unrelated to the change (don't
  bundle an unrelated `pnpm-lock.yaml` bump into a feature commit).
- A migration file edited in place after it has been applied anywhere shared
  — see architecture.md's migrations rule; that's a new migration, not an edit.

## Gates (self-check before done)

- [ ] Commit message is Conventional Commits format
- [ ] Working tree was green (relevant gates passed) before this commit
- [ ] No ignored/secret path staged
- [ ] Feature branch merges only after a green `verify` run
