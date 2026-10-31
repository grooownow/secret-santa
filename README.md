# Secret Santa

A web app for running a Secret Santa gift exchange: participants sign in,
the organiser draws the pairs, and mail and a wall keep everyone in the loop.
Built with Next.js (App Router), TypeScript strict, Tailwind + shadcn/ui,
Drizzle ORM (PGlite locally, Postgres in production) and next-auth.

The spec of record is `docs/superpowers/specs/2026-10-31-secret-santa-design.md`;
what is next lives in `docs/roadmap.md`.

## Quickstart

Prerequisites: Node >= 22, git, pnpm (optional: bootstrap can enable it via
corepack), [Claude Code](https://code.claude.com) if you want the skills below.

```bash
./scripts/bootstrap   # env file, deps, local database
pnpm dev              # http://localhost:3210
```

## Commands

Day to day you type skills in Claude Code, not shell commands:

| Skill               | What it does                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/feature <name>`   | Builds one feature end-to-end: spec, touch-point map, code, mandatory tests, gates, commit                                                                                              |
| `/design <surface>` | The visual loop: token contract read out of the CSS, 3-5 mockup variants side by side in a real browser, a taste profile that remembers picks, then a breakpoint review at 375/768/1280 |
| `/review`           | Adversarial review of the current diff, one lens per rules file, findings by severity with `file:line`                                                                                  |
| `/verify`           | The full gate sequence plus a browser smoke check of what changed, PASS/FAIL with quoted output as evidence                                                                             |
| `/doubt`            | Cross-examines one non-trivial decision with a fresh-context skeptic before it stands (schema migration, auth boundary, anything irreversible)                                          |
| `/deploy`           | Walks `docs/playbooks/deploy.md` checkpoint by checkpoint: Vercel, managed Postgres, domain                                                                                             |
| `/learn`            | Curates the project's cross-session memory in `docs/learnings.jsonl`: appends, searches, prunes what went stale                                                                         |

Underneath them, the shell commands the skills (and you) run:

| Command                | What it does                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./scripts/bootstrap`  | First-time setup: env file, deps, db                                                                                                                                                   |
| `pnpm dev`             | Dev server on port 3210 (or the next free one), prints the URL                                                                                                                         |
| `pnpm gates`           | The whole gate sequence in order, stopping at the first failure. Renders the PASS/FAIL table from exit codes and records the run in `.gridfin/runs/`; `pnpm gates:show` prints it back |
| `pnpm lint`            | The lint chain: oxlint, ESLint, Prettier, tsc                                                                                                                                          |
| `pnpm test`            | Unit + component + integration, all Vitest projects in one pass                                                                                                                        |
| `pnpm test:e2e`        | Playwright desktop + mobile against a production build                                                                                                                                 |
| `pnpm build` / `start` | Production build (followed by the function-trace size check) / serve it                                                                                                                |
| `pnpm db:reset`        | Rebuild the local db (migrate + seed)                                                                                                                                                  |

For occasional flows (deploy, Vercel setup, analytics, compliance) see
`docs/playbooks/`.

## Under the hood

- Feature-first architecture enforced by lint (`docs/rules/architecture.md`)
- Database: Drizzle ORM + PGlite locally, `GRIDFIN_DB=remote` for real Postgres
- Env-gated observability (Sentry) and analytics (PostHog) slots, off until
  you set their env vars
- `pnpm dev` serves on port 3210 (or the next free one) and prints the URL
- One gate: `pnpm lint` (oxlint, ESLint, Prettier, tsc) + `pnpm test`

## Quality gates

CI (and `pnpm lint`/`pnpm test` locally) enforce:

- **Lint chain**: `oxlint`, `eslint`, `prettier --check`, `tsc --noEmit`.
- **Tests** (`pnpm test`, Vitest projects): `unit` (node), `component`
  (jsdom + Testing Library), `integration` (real PGlite db, direct
  handler/action calls).
- **E2E** (`pnpm test:e2e`, Playwright): smoke and game flows, including an
  SPA-navigation assertion (client-side nav must not trigger a full reload).
- **Lighthouse budgets** (`lighthouserc.js`, CI job `lighthouse`):
  performance and accessibility >= 0.90, asserted against a production build.
- **Dependency audit** (`pnpm audit --audit-level high`): red on any
  high/critical advisory. Escape hatch for false positives or advisories
  without an available fix: an `overrides` entry in `pnpm-workspace.yaml` with a
  comment explaining why; see `docs/rules/security.md`. Currently
  applied: `tmp@<0.2.6: ^0.2.6` to override GHSA-ph9p-34f9-6g65 (via @lhci/cli,
  dev-only); remove when upstream updates.

## Testing

Three-level harness, one command: `pnpm test` runs all Vitest projects in one
pass; `pnpm test:e2e` runs the Playwright desktop + mobile suite against a
production build. See `docs/rules/testing.md` for the decision table (what
belongs at which level), the prove-can-fail rule, and anti-flaky conventions.

**Optional companion:** the [qa-pilot](https://github.com/grooownow/qa-pilot)
Claude Code plugin adds test-authoring/audit/coverage skills on top of this
harness. `docs/qa/project-profile.md` is already filled in for this stack, so
you can skip `qa-pilot:onboard` and go straight to `qa-pilot:cover`.

## Where your local data lives

Your local database is the `.pglite/` folder in this repo, a real embedded
Postgres. It **survives dev-server restarts and reboots**, but it is **not in
git**: deleting the folder or making a fresh clone starts you from an empty
database, and `pnpm db:reset` rebuilds it (migrations + seed) in one command.
To back it up, copy the folder. For longer-lived shared data, switch to a real
Postgres: `docker compose up -d` + `GRIDFIN_DB=remote` in `.env` (see
`docker-compose.yml`). Production always uses a managed Postgres; see the
deploy playbook.

## After the game

The daily job (`/api/cron/daily`, Vercel Cron, needs `CRON_SECRET`) purges all personal data on the close date (Jan 10): accounts, participants, pairs, posts, translations, sent-mail ledger and every photo. The settings row stays with `purgedAt` set. The Gmail mailbox used for sending is not touched by the app: the owner deletes it manually after Jan 10.

## License

MIT, see `LICENSE`.
