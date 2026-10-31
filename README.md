# Gridfin

Agent-native SaaS starter for Claude Code. One command, one guided hour:
from idea to a running, tested app.

## Quickstart

Prerequisites: Node >= 22, git, pnpm (optional — bootstrap can install it via corepack), [Claude Code](https://code.claude.com).

**1. Get your own copy.** On GitHub, click **"Use this template" → "Create a new
repository"** (or run `gh repo create my-app --template grooownow/gridfin-template --private --clone`).
This gives your project its **own clean git history — a copy, not a fork**. That
is what lets `/update` pull future template releases into your code without ever
merging against an upstream. Then clone your new repo and `cd` into it.

**2. Set up, then onboard.**

```bash
./scripts/bootstrap
```

Then open Claude Code in this folder and type `/gridfin`.
The onboarding agent takes it from there: your idea → PRD → specs → a running app.

(Bootstrap is forgiving if you skipped step 1: if you cloned the template
directly it offers to reset git to your own history, and if you downloaded an
archive it initializes a repo for you.)

## Commands

Day to day you type skills in Claude Code, not shell commands. Ten ship with
the template:

| Skill                | What it does                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/gridfin`           | One-time onboarding: your idea → PRD → specs → an adapted, running app                                                                                                                        |
| `/feature <name>`    | Builds one feature end-to-end: spec → touch-point map → code → mandatory tests → gates → commit                                                                                               |
| `/design <surface>`  | The visual loop: token contract read out of your CSS, 3–5 mockup variants side by side in a real browser, a taste profile that remembers your picks, then a breakpoint review at 375/768/1280 |
| `/review`            | Adversarial review of the current diff — one lens per rules file, findings by severity with `file:line`                                                                                       |
| `/verify`            | The full gate sequence + a browser smoke check of what changed, PASS/FAIL with quoted output as evidence                                                                                      |
| `/doubt`             | Cross-examines one non-trivial decision with a fresh-context skeptic before it stands (schema migration, auth boundary, anything irreversible)                                                |
| `/add-module <name>` | Installs an optional capability module — `persistence` or `observability` — into a project you already started                                                                                |
| `/deploy`            | Walks `docs/playbooks/deploy.md` checkpoint by checkpoint: Vercel, managed Postgres, domain                                                                                                   |
| `/learn`             | Curates the project's cross-session memory in `docs/learnings.jsonl` — appends, searches, prunes what went stale                                                                              |
| `/update`            | Pulls newer template releases into your project — see _Updating a project you've already started_ below                                                                                       |

Underneath them, the shell commands the skills (and you) run:

| Command                    | What it does                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./scripts/bootstrap`      | First-time setup: env files, deps, db                                                                                                                                                              |
| `pnpm dev`                 | Dev server on port 3210 (or the next free one), prints the URL                                                                                                                                     |
| `pnpm gates`               | The whole gate sequence in order, stopping at the first failure. Renders the PASS/FAIL table from exit codes and records the run in `.gridfin/runs/` — `pnpm gates:show` prints it back days later |
| `pnpm lint`                | The lint chain: oxlint → ESLint → Prettier → tsc                                                                                                                                                   |
| `pnpm test`                | Unit + component + integration, all three Vitest projects in one pass                                                                                                                              |
| `pnpm test:e2e`            | Playwright desktop + mobile against a production build                                                                                                                                             |
| `pnpm build` / `start`     | Production build / serve it                                                                                                                                                                        |
| `pnpm module:apply <name>` | The raw module install `/add-module` drives — rarely called by hand                                                                                                                                |
| `pnpm db:reset`            | Rebuild the local db (migrate + seed). **Ships with the `persistence` module** — on a Landing project this script does not exist                                                                   |

For occasional flows — deploy, billing, pricing, analytics, compliance — see
`docs/playbooks/`.

## Presets & modules

A fresh clone boots as **Landing**: a themed page, no database, no auth — the
lightest thing that still passes every gate. Heavier capabilities (a
database + auth stack, billing, …) live under `modules/` and are added on top
when a project needs them, not carried by default. `persistence` (Drizzle +
PGlite/Postgres, next-auth, signin/dashboard/profile) is the first such
module; installing it turns a Landing project into **App**. `observability`
(Sentry error tracking) is the other one shipping today.

You install one by typing **`/add-module persistence`** in Claude Code: the
skill resolves the module's dependencies, runs its apply plan, reconciles any
file you have already diverged from the template instead of clobbering it, and
records the result in `docs/manifest.md`. See `docs/rules/modules.md` for the
module format and what an install does step by step.

## Under the hood

- Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui, with a
  themed Landing home page and a light/dark toggle out of the box
- Env-gated observability (Sentry) and analytics (PostHog) slots — off until
  you set their env vars
- Database (Drizzle ORM + PGlite locally, `GRIDFIN_DB=remote` for real
  Postgres) and email/password auth (a seeded admin, no OAuth account
  required) are **not** part of this core — they land when you install the
  `persistence` module (see above), which is what turns Landing into App
- `pnpm dev` serves on port 3210 (or the next free one) and prints the URL
- Feature-first architecture enforced by lint (`docs/rules/architecture.md`)
- One gate: `pnpm lint` (oxlint → ESLint → Prettier → tsc) + `pnpm test`

## Quality gates

CI (and `pnpm lint`/`pnpm test` locally) enforce:

- **Lint chain**: `oxlint` → `eslint` → `prettier --check` → `tsc --noEmit`.
- **Tests** (`pnpm test`, three Vitest projects): `unit` (node), `component`
  (jsdom + Testing Library), `integration` (real PGlite db, direct
  handler/action calls). On Landing alone, only `unit` has any tests to run
  (`component`/`integration` pass empty); the `persistence` module adds the
  db-backed component and integration coverage into the same three projects.
- **E2E** (`pnpm test:e2e`, Playwright): Landing ships one smoke spec (home
  render + 404), including an SPA-navigation assertion (client-side nav must
  not trigger a full reload); the `persistence` module adds the auth e2e spec.
- **Lighthouse budgets** (`lighthouserc.js`, CI job `lighthouse`):
  performance and accessibility ≥ 0.90 on `/` and `/signin`, asserted against
  a production build (`pnpm build` + `pnpm start`) — that CI job applies
  `persistence` first so `/signin` exists to audit.
- **Dependency audit** (`pnpm audit --audit-level high`): red on any
  high/critical advisory. Escape hatch for false positives or advisories
  without an available fix: an `overrides` entry in `pnpm-workspace.yaml` with a
  comment explaining why — see `docs/rules/security.md`. Currently
  applied: `tmp@<0.2.6: ^0.2.6` to override GHSA-ph9p-34f9-6g65 (via @lhci/cli,
  dev-only); remove when upstream updates.

## Testing

Built-in three-level harness, one command: `pnpm test` runs all three Vitest
projects (`unit`, `component`, `integration`) in one pass; `pnpm test:e2e`
runs the Playwright desktop + mobile smoke suite against a production build.
See `docs/rules/testing.md` for the decision table (what belongs at which
level), the prove-can-fail rule, and anti-flaky conventions.

**Optional companion:** the [qa-pilot](https://github.com/grooownow/qa-pilot)
Claude Code plugin adds test-authoring/audit/coverage skills on top of this
harness — `/plugin marketplace add grooownow/qa-pilot`. This repo ships with
`docs/qa/project-profile.md` already pre-filled for the stack above, so you
can skip `qa-pilot:onboard` and go straight to `qa-pilot:cover`.

## Where your local data lives

Landing on its own has no database — this section applies once you've
installed the `persistence` module (App preset). Your local database is
then the `.pglite/` folder in this repo — a real embedded
Postgres. It **survives dev-server restarts and reboots**, but it is **not in
git**: deleting the folder or making a fresh clone starts you from an empty
database — `pnpm db:reset` rebuilds it (migrations + seed) in one command. To back it up, copy the
folder. For longer-lived shared data, switch to a real Postgres:
`docker compose up -d` + `GRIDFIN_DB=remote` in `.env` (see `docker-compose.yml`).
Production always uses a managed Postgres — see the deploy playbook.

## Updating a project you've already started

Your project is a **copy** of the template, so updates don't arrive over git —
you pull them in on purpose, and it's safe to do on a project you're already
building. You don't have to watch for them: at the start of a session the agent
tells you when a newer version has shipped ("Gridfin 0.3.0 is available…").

To update, just type **`/update`** in Claude Code. The agent reads what changed
between your version and the latest, walks you through each release's apply plan,
adapts the changes around the code you've already written, and runs the gates —
stopping to ask before anything it can't cleanly reconcile. You can also read the
changes yourself first in `CHANGELOG.md`; every release after the initial one
carries an **Apply plan** — the exact prompt `/update` runs.

Both the notice and `/update` read the template repository over git, so they
need your GitHub credentials to still have access to it — the same access you
used to create your copy. If they don't, the check stays **silent by design**
(a startup hook that errors is a hook you'd disable), and `/update` fails at
the clone step. Seeing no update notices for a suspiciously long time is the
symptom: check `CHANGELOG.md` against your `.gridfin-version` by hand, and get
your access restored.

Your installed **template** version lives in `.gridfin-version`. That is
deliberately separate from `package.json`'s `version`, which is **your product's**
version — set it to whatever you like, ship your own 1.0.0, it won't confuse the
update check.

## After the game

The daily job (`/api/cron/daily`, Vercel Cron, needs `CRON_SECRET`) purges all personal data on the close date (Jan 10): accounts, participants, pairs, posts, translations, sent-mail ledger and every photo. The settings row stays with `purgedAt` set. The Gmail mailbox used for sending is not touched by the app: the owner deletes it manually after Jan 10.

## License

Gridfin is a commercial template: build unlimited products with it (yours
and clients'), own everything you build; don't resell the template itself —
full terms in `LICENSE.md`. Your purchase includes all future updates.
