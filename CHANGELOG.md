# Changelog

All notable changes to the Liftkit template are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/); versions
follow [semver](https://semver.org/).

## How updates reach you

Your project starts as a **copy** of this template, so updates don't arrive
automatically. Each release below ships two things:

1. **Release notes** — what changed and why.
2. **An apply plan** — a short prompt-plan written for your agent. Open your
   project in Claude Code, paste the plan, and the agent applies the update
   to your codebase (adapting around your own changes) and runs the gates.

New projects don't need any of this — just start from the latest template.

---

## [Unreleased]

_Nothing yet._

---

## [0.7.0] — 2026-07-31

**`pnpm gates` — the gate sequence runs itself, and writes down what it did.**
`verify` used to ask the agent to run four commands, decide which ones did not
apply, and then assemble a PASS/FAIL table with quoted evidence. The commands
were always mechanical; only the bookkeeping was left to the one party with an
incentive to read a red gate generously. Now a script runs the sequence and
renders the table from exit codes, and every run is recorded, so "were the
gates actually run on that branch?" has an answer next week.

### Apply plan

```
Adopt the gate runner from Liftkit 0.7.0:

1. Copy scripts/gates.ts, scripts/lib/gates.ts and scripts/gates.test.ts from
   the fresh clone.
2. Add three package.json scripts:
     "gates": "tsx scripts/gates.ts"
     "gates:show": "tsx scripts/gates.ts --show"
     "gates:note": "tsx scripts/gates.ts --note"
   and add `.liftkit/` to .gitignore — the ledger is a local record, not a
   project artifact.
3. If you added gates of your own (a typecheck split, a bundle-size budget),
   add them to the GATES array in scripts/lib/gates.ts, cheapest first. If your
   project has no e2e suite, remove that entry rather than waiving it on every
   run.
4. Take the clone's .claude/skills/verify and .claude/skills/feature templates,
   or — if you have rewritten them — port two things by hand: verify's
   "Gate sequence" section now says to run `pnpm gates` and paste its table
   instead of rebuilding it, and feature's Step 4 records the proven-able-to-fail
   evidence with `pnpm gates:note`.
5. Copy the two `pnpm gates` bullets into docs/rules/definition-of-done.md's
   Correctness checklist, and add `pnpm gates` to the command list in README.md,
   CLAUDE.md and AGENTS.md.
6. Run `pnpm skills:gen`, then `pnpm gates` — the runner's own first green run
   is the acceptance test for this update.
```

### Added

- **`pnpm gates`** — runs lint → test → (db:reset) → e2e → build → (skill
  harness) in order, stops at the first failure, and decides the two
  conditional gates itself: no `db:reset` script means N.A. on a Landing
  project, and the skill harness is N.A. unless the diff touches a skill, a
  step fragment, a rules file or an entry map. Evidence is one line quoted from
  each command's own output — the _result_ line, not the decoration a tool ends
  on. Exits non-zero if any gate failed.
- **A waiver instead of a silent skip** — `pnpm gates --waive e2e="no browser
on this box"` prints WAIVED, records the reason, and lists it under what the
  run did not cover. Skipping a gate is the user's call; skipping one invisibly
  is nobody's.
- **The run ledger** — every run writes `.liftkit/runs/<id>.json` (gitignored):
  which gates ran, their exit codes, durations, evidence, the branch and head
  they ran against. `pnpm gates:show [id]` prints it back.
- **`pnpm gates:note`** — records a step no command can check (a test watched
  failing, a page seen rendering) on the current run, with required evidence.
  It does not prove the step happened; it makes the absence visible, which is
  the half that was missing.
- **`--only <gates>`** for the fix-and-rerun loop: after a fix, rerun the gate
  that was red rather than the whole sequence.

### Changed

- **`verify`** now drives the runner instead of describing the sequence: run
  `pnpm gates`, paste its table, add the browser-smoke row it cannot produce,
  and record that row with `gates:note`. The per-gate troubleshooting prose
  (missing Chromium, port in use, a stale generated `SKILL.md`) stays — that is
  knowledge the runner does not have.
- **`feature`** Step 4 records the proven-able-to-fail evidence on the run, and
  Step 5 points at `pnpm gates --only <gate>` for the retry loop.
- **`docs/rules/definition-of-done.md`** replaces "the four commands, green,
  with quoted output" with the runner and the ledger.

---

## [0.6.0] — 2026-07-31

**The skills stop restating each other, and start saying what they are not
for.** Three changes to how skills are authored: shared step fragments, a
negative half in every description, and a retry budget that exists in more than
one skill. Nothing about what a skill does changed — this is about the rules
being in one place and being checkable.

### Apply plan

```
Adopt the skill-authoring changes from Liftkit 0.6.0:

1. Copy `.claude/skill-steps/commit-hygiene.md` and
   `.claude/skill-steps/loop-budget.md` from the fresh clone.
2. In scripts/lib/codegen.ts, add the `stepFragments()` loader and make
   `render()` fall back to it before throwing on an unknown placeholder (copy
   both from the clone; keep any resolver you added yourself). Copy the
   "step fragments" describe block from scripts/gen-skills.test.ts too — the
   unreferenced-fragment check is what keeps the mechanism honest.
3. Copy `docs/rules/skills.md`, and name it in CLAUDE.md and AGENTS.md's rules
   list (their entry-maps test fails until both do).
4. In each `.claude/skills/*/SKILL.md.tmpl` you still use unmodified, take the
   clone's version. For any skill you have rewritten for your product, port
   three things by hand instead of overwriting: the `{{STEP_COMMIT_HYGIENE}}`
   and `{{STEP_LOOP_BUDGET}}` placeholders where that skill commits or retries,
   the "NOT for X (that is <skill>)" clause in its description, and a matching
   negative case in its evals.json.
5. Run `pnpm skills:gen`, then
   `pnpm skills:check && pnpm skills:validate && pnpm skills:evals` and
   `pnpm lint && pnpm test`. If evals report a routing collision, the fix is the
   description — a negative clause written in too much of the neighbour's
   vocabulary pulls that neighbour's prompts to itself.
```

### Added

- **Step fragments** — `.claude/skill-steps/<name>.md` compiles into
  `{{STEP_<NAME>}}`, the same way `{{PREAMBLE}}` already did. Two ship:
  `commit-hygiene` (format before every commit; only green steps get one) and
  `loop-budget` (two honest attempts at the same failure, then stop and hand
  the decision back). A fragment no skill references fails `pnpm test` —
  shared text that nobody reads is debt, not reuse.
- **`docs/rules/skills.md`** — the authoring contract in one file: templates vs
  generated output, when a fragment earns its own file, both halves of a
  description, loop budgets, named human checkpoints, when a step needs a fresh
  context, and the size budget. Named in both entry maps.

### Fixed

- **Two skills could not have known to format before committing.**
  `commit-hygiene` was written in `feature`, `liftoff` and `review`, and absent
  from `add-module` and `update` — the two that commit most often, where a
  lefthook rejection lands in the middle of an apply plan.
- **Every fix loop except `feature`'s was unbounded by omission**, not by
  decision. The retry budget is now shared wording, referenced by `add-module`,
  `deploy`, `design`, `liftoff`, `review` and `update`.
- **Descriptions routed on their positive half only.** All ten now state what
  they are NOT for and name the skill that owns those prompts, each claim
  backed by a negative trigger case in `evals.json`. Routing stays at 100%
  rank-1 (`pnpm skills:evals`).
- **Human checkpoints did not say where a dropped session resumes.** Every stop
  for a person — spec approval, fit check, design pick, module choice, deploy
  checkpoint — now says it.

---

## [0.5.2] — 2026-07-29

**Ten high-severity advisories cleared, and the CI job that gates the App
preset unblocked.** `pnpm audit --audit-level high` had been red since the
nightly run of 2026-07-28 — four Next.js advisories plus postcss, sharp,
brace-expansion and fast-uri — and the `materialized-app` job never got past
its second module apply, so nothing had gated App end-to-end since 0.5.0.

### Apply plan

```
Bring this project's dependency floor and CI up to date:

1. Update Next.js and postcss to at least next@16.2.12 and postcss@8.5.24
   (`pnpm update next postcss sharp`), then run `pnpm audit --audit-level high`.
2. For every high advisory that remains, add an `overrides:` entry in
   pnpm-workspace.yaml pinned inside the vulnerable package's own major, with a
   comment naming the advisory and what removes it. The template's own set —
   brace-expansion (1.x and 5.x separately), fast-uri, sharp, postcss — is a
   working reference; copy only the entries your own tree still needs.
3. If an advisory has no version that satisfies it, use `auditConfig:
   ignoreGhsas:` instead, with the same comment discipline. See
   docs/rules/security.md, which now documents both hatches and when each one
   is the right call.
4. If you kept .github/workflows/ci.yml's materialized-app job, add
   `pnpm install --no-frozen-lockfile` BETWEEN the two `pnpm module:apply`
   steps: pnpm verifies the lockfile before running a package script, so the
   second apply aborts on the deps the first one added.
5. Run `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`.
```

### Fixed

- **Dependency advisories** — `next` 16.2.10 → 16.2.12 (GHSA-6gpp-xcg3-4w24,
  GHSA-m99w-x7hq-7vfj, GHSA-89xv-2m56-2m9x, GHSA-p9j2-gv94-2wf4) and `postcss`
  8.5.16 → 8.5.24, both as bumped floors in `package.json`. The four that a
  parent pinned away are `overrides:` entries in `pnpm-workspace.yaml`:
  `sharp@<0.35.0` (GHSA-f88m-g3jw-g9cj, libvips CVEs, reached through next's
  optional image dep), `postcss@<8.5.18` (GHSA-6g55-p6wh-862q,
  GHSA-r28c-9q8g-f849), `fast-uri@<3.1.4` (GHSA-v2hh-gcrm-f6hx, via shadcn),
  and `brace-expansion` per major (GHSA-3jxr-9vmj-r5cp).
- **`auditConfig.ignoreGhsas`** — a second, documented escape hatch, used once:
  GHSA-mh99-v99m-4gvg declares a single affected range spanning every major
  with only `brace-expansion@5.0.8` patched, and the one path that would need
  it (`@lhci/cli` → … → `minimatch@3`) cannot call 5.x's CommonJS export, which
  exports an object rather than a callable. `docs/rules/security.md` now
  documents when each hatch applies and demands the same comment discipline
  from both.
- **`materialized-app` CI job** — `pnpm install --no-frozen-lockfile` now runs
  between the `persistence` and `observability` applies. pnpm checks the
  lockfile against `package.json` before running a package script, so the
  second apply died on the nine dependencies the first one had just added, and
  the job's lint / migrate / test / e2e steps never ran at all.

---

## [0.5.1] — 2026-07-29

**Docs catch up with the skills that shipped in 0.4.0–0.5.0.** The README
named five of the ten skills — `/design`, `/doubt`, `/learn` and `/add-module`
existed, were tested, and were documented nowhere a buyer looks. Neither entry
map mentioned them either, and both listed `pnpm db:reset` as a key command
when that script only exists once the `persistence` module is installed: on a
fresh Landing project, the first command an agent read out of `CLAUDE.md`
failed.

### Apply plan

```
Update this project's docs to match the skills it actually ships:

1. In README.md, add a "## Commands" section right after the Quickstart, with
   one table of the ten skills (/liftoff, /feature, /design, /review, /verify,
   /doubt, /add-module, /deploy, /learn, /update) and one table of the shell
   commands (./scripts/bootstrap, pnpm dev/lint/test/test:e2e/build/start,
   pnpm module:apply). Mark `pnpm db:reset` as provided by the `persistence`
   module, not by the core.
2. In CLAUDE.md AND AGENTS.md (keep them in sync), name the skills the daily
   map omits — /design, /add-module, /deploy, /doubt, /learn, /update — and
   add the same `persistence`-only caveat to `pnpm db:reset` under
   "Key commands".
3. If your project is still on the Landing preset, check any other doc that
   promises a database command (e.g. docs/qa/project-profile.md) and add the
   same caveat.

Keep your own edits: if you have already rewritten these files for your
product, merge the missing entries in rather than replacing the file. Then run
`pnpm lint` and `pnpm test`.
```

### Fixed

- **README** — a `## Commands` section: every skill the template ships, with
  what it does, plus the `pnpm` scripts underneath them. `/design`, `/doubt`,
  `/learn` and `/add-module` appear for the first time; "Presets & modules"
  now says how a module is actually installed (`/add-module persistence`)
  instead of only pointing at the rules file, and names `observability`.
- **`CLAUDE.md` / `AGENTS.md`** — the daily map names all ten skills, and
  `pnpm db:reset` is marked as shipping with the `persistence` module. It does
  not exist in a Landing tree, so an agent following the entry map hit a
  missing script on a fresh project.
- **`docs/qa/project-profile.md`** — the same Landing caveat for `db:reset`,
  and the Playwright `webServer` command corrected to what the core config
  actually runs (`pnpm build && pnpm start`; the module prepends the reset).
- **README, update section** — states that the update notice and `/update`
  both need your GitHub access to the template repo to still work, and that
  the startup check stays silent by design when it doesn't, so a buyer who
  loses access knows what the silence means.

---

## [0.5.0] — 2026-07-16

**The template inverts to a minimal Landing core; database and auth become an
installable module.** A fresh clone used to carry Drizzle + PGlite +
migrations, next-auth + middleware + signin/dashboard/profile, and their
gates, whether or not the product needed them. Now a fresh clone is just
**Landing** — the themed page plus the observability/analytics slots, nothing
else — and the db+auth stack lives in `modules/persistence/`, materialized
into a project only when installed.

### Apply plan

None. This is a template-internal restructuring of the skeleton a fresh clone
starts from, not a change to any app's shipped code. If your project was
already onboarded (started as **App**, before this release), your `src/`
already contains the persistence stack — nothing in your codebase changes,
there is nothing for `/update` to apply, and this entry is safe to skip. Only
new clones from this point on start as Landing.

### Added

- **`modules/persistence/`** — the extracted database (Drizzle + PGlite or
  Postgres) and auth (next-auth + middleware + signin/dashboard/profile)
  layer, as an installable module: `files/` (the extracted source, copied
  verbatim on install), `fragments/` (env/schema/signin-link snippets), and
  `module.md` — a numbered apply-plan an agent follows, starting with the
  deterministic `pnpm module:apply persistence` (copies files, merges
  `package.json` deps/scripts, and overwrites the module-owned
  `src/lib/env.ts`, `src/app/page.tsx`, `src/lib/env.test.ts`, and
  `playwright.config.ts`) and ending in judgment "wiring" steps and a commit.
  See `docs/rules/modules.md` for the format every module under `modules/`
  must follow, and `docs/decisions/0002-complexity-tiers-mini-core-and-modules.md`
  for why the split is additive rather than subtractive.
- **`pnpm modules:validate`** and **`pnpm module:apply <name>`** — the
  deterministic half of a module install (structure validation and the
  mechanical copy/patch/splice), so CI can materialize the full stack without
  an agent.
- **Named presets.** Landing (this core, on its own), App (core +
  `persistence`), and App+Billing (core + `persistence` + a `billing` module,
  not yet extracted) are the three complexity tiers the template will offer.
- **Preset selection lands in `/liftoff`.** Step 1 now asks which preset the
  project is (Landing/App/App+Billing) as part of idea discussion, and a
  conditional Step 4 sub-path applies the preset's modules
  (`pnpm module:apply persistence` for App/App+Billing) before the usual
  adaptation work. `docs/manifest.md` gains `## Preset` and `## Installed
modules` — the source of truth later sessions and skills read.
- **Preset-aware `verify` and `deploy`.** `verify` skips the db-reset/db-smoke
  gate when `persistence` isn't installed (Landing has no database); core
  `lint`/`test`/`build`/e2e still run unconditionally on every preset. The
  `deploy` playbook branches — Landing ships without a managed Postgres, App
  provisions one as before.
- **CLAUDE.md invariant #2 scoped to `persistence`.** "No network/db call in
  `src/middleware.ts`" now reads as applicable only when the `persistence`
  module is installed — Landing has no middleware for the hook to guard.
- The feature is now end-to-end: a fresh clone can be onboarded through
  `/liftoff` as **Landing** or as a full **App**, with the right code surface,
  gates, and manifest fields for whichever preset was picked. Projects that
  already onboarded before this release keep their existing preset implicitly
  (their `/liftoff` run already happened) — still no apply-plan needed for
  them; see "Apply plan" above.
- **`modules/observability/`** — Sentry error tracking extracted out of core
  into its own installable module (`instrumentation.ts`, the client/server/edge
  configs, and `@sentry/nextjs`). Landing no longer carries Sentry at all; App
  (and App+Billing) auto-install it via their preset — every entry point stays
  a true no-op until a DSN is set, so installing it lights up no network
  traffic by default.
- **`add-module` skill** — installs a module (`persistence` or
  `observability`) into a Liftkit project you've already started, past
  `/liftoff`: it runs the module's `module.md` apply-plan, resolves
  `depends-on` first, reconciles any project-diverged module-owned file
  instead of clobbering it, and records the install in the manifest's
  `## Installed modules` (flipping `## Preset` from Landing to App when
  `persistence` lands).
- **App+Billing clarified as a roadmap intent, not a code module.** The preset
  means core + `persistence` + a billing roadmap entry — there is no
  `modules/billing/` to apply. Billing stays knowledge-not-code: it's built
  per-project via `/feature billing-checkout` against
  `docs/playbooks/billing.md`, the same way any other roadmap feature is
  built. Still no apply-plan needed for already-started projects — this is
  template-internal.

### Changed

- **A fresh clone boots as Landing, not App.** `src/` no longer ships
  `src/db/`, `src/middleware.ts`, or the `auth`/`profile` feature slices;
  `src/lib/env.ts` and `.env.example` drop the db/auth/seed variables;
  `package.json` drops the persistence dependencies and `db:*` scripts.
  `pnpm lint`, `pnpm test`, `pnpm test:e2e` (the Landing smoke spec), and
  `pnpm build` are all green on this stripped-down core. A new
  `src/core-boundary.test.ts` fails loudly if a db/auth import ever leaks back
  into `src/`.
- **CI gates both shapes.** `quality`/`golden-path` gate Landing as the core
  (plus a new `pnpm modules:validate` step checking every module's format);
  a new `materialized-app` job applies `persistence` to a clean checkout and
  gates the full db/auth/e2e surface, proving the round trip reproduces
  today's App and stays green; `remote-db` and `lighthouse` apply
  `persistence` first for the same reason.

### Fixed

- **`scripts/bootstrap` no longer fails inside a git worktree.** It decided a
  project was "downloaded as an archive" whenever `.git` was not a directory,
  but in a linked worktree `.git` is a file — so it re-ran `git init` over a
  real repo, the empty initial commit exited 1, and `set -e` killed bootstrap
  before `pnpm install`. It now asks git (`git rev-parse
--is-inside-work-tree`), which is true for a normal clone and a worktree
  alike.
- **Installing a module no longer breaks the first `pnpm lint`.** With
  `typedRoutes` on, Next generates route types from the app tree; a `.next`
  built as Landing (no `/signin`) made `tsc` reject the very links
  `persistence` adds. `pnpm module:apply` now clears the `.next` cache it
  invalidates, so the post-install gate the module's apply-plan tells you to
  run is green.

---

## [0.4.0] — 2026-07-15

**Starting a project is now foolproof, whichever way you grab the template.**
Your project has to be a standalone _copy_ of the template — its own git history,
no remote pointing back upstream — or `/update` can't pull future releases into
your code. GitHub's "Use this template" gives you exactly that, but nothing said
to use it: the README jumped straight to `./scripts/bootstrap`, so a raw
`git clone` left you wired to the template, and a ZIP download left no repo at
all. Bootstrap now sorts this out for you, and the README points you at the right
door in the first place.

### Apply plan

Run `/update`, or paste this into your project's Claude Code session. This
release only touches first-run onboarding and docs — it does **not** change your
running app, so for an already-started project it's low-risk housekeeping.

> Update this Liftkit project from 0.3.0 to 0.4.0. Work on a branch
> (`chore/update-0.4.0`) and commit once at the end. Stop and ask me before
> anything you cannot reconcile cleanly.
>
> 1. **Get the real files.** Clone the template into a temp dir —
>    `git clone --depth 1 https://github.com/grooownow/liftkit-template.git "$(mktemp -d)/liftkit"` —
>    and copy the files below OUT OF THAT CLONE. Do not write them from memory; if
>    the clone fails, stop and tell me.
> 2. **`scripts/bootstrap`** — take the template's version. It now normalizes git
>    on first run: initializes a fresh repo for an archive download, and for a raw
>    clone of the template offers (only at a real terminal) to reset to a clean
>    history, else safely detaches the template remote. It is a no-op for a project
>    that already has its own `origin` — which mine does — so nothing about my
>    running project changes. If I've customized `bootstrap`, reconcile rather than
>    clobber and show me the merge.
> 3. **`README.md`** — the Quickstart now leads with GitHub's "Use this template"
>    and explains the copy-not-fork model. If I've already replaced the README with
>    my own product's, SKIP this file — it's the template's onboarding doc, not
>    mine.
> 4. **Stamp the version.** Set `.liftkit-version` to exactly `0.4.0`. Leave
>    `package.json`'s `version` alone — that field is my product's.
> 5. **Check it works:** run `pnpm lint && pnpm test` and report what each printed.
> 6. Commit as `chore(update): apply Liftkit 0.4.0`.

### Changed

- **First run makes your project a standalone copy.** `scripts/bootstrap` now
  normalizes git before installing dependencies (so lefthook's prepare hook has a
  repo): it initializes a repository if you downloaded an archive, and if you
  cloned the template directly it offers — at a real terminal — to reset to a
  clean history, or safely detaches the template remote otherwise. A project
  created via "Use this template" is already correct, so bootstrap leaves it
  untouched. This is what keeps `/update` able to copy future releases in without
  ever merging against an upstream.
- **The README Quickstart starts with acquisition.** It leads with
  **"Use this template" → "Create a new repository"** (or `gh repo create
--template`) and spells out why your project is a copy, not a fork — the step
  that used to be silently assumed.

---

## [0.3.0] — 2026-07-13

**Updates you can find, and apply without reading anything.** Until now a new
release was invisible: the apply plan sat in a changelog you had no reason to
open. Now your project tells you, and one command adopts it.

### Apply plan

This is the last update you apply by hand. Copy everything below into Claude Code
in your project — after it lands you'll have `/update`, and every future release
is one command.

> Update this Liftkit project from 0.2.0 to 0.3.0. Work on a branch
> (`chore/update-0.3.0`), and commit once at the end. Stop and ask me before
> anything you cannot reconcile cleanly.
>
> 1. **Get the real files.** Clone the template into a temp dir —
>    `git clone --depth 1 https://github.com/grooownow/liftkit-template.git "$(mktemp -d)/liftkit"` —
>    and copy every file this plan names OUT OF THAT CLONE. Do not write any of
>    them from memory: if the clone fails, stop and tell me, don't reconstruct.
> 2. **The update system itself** — copy `scripts/hooks/update-check.ts`,
>    `scripts/hooks/session-update-check.ts`, `scripts/hooks/update-check.test.ts`,
>    and the whole `.claude/skills/update/` directory.
> 3. **Register the session hook.** Merge the `SessionStart` entry from the
>    template's `.claude/settings.json` into mine — merge, do not overwrite: my
>    file may already carry hooks I want to keep.
> 4. **Stamp the version.** Create `.liftkit-version` containing exactly `0.3.0`.
>    This tracks the TEMPLATE's version, and is deliberately separate from
>    `package.json`'s `version`, which is my own product's — leave that field
>    alone, whatever it currently says.
> 5. **Skills are compiled now** (this shipped in 0.2.0; skip this step if my
>    `.claude/skills/*/` already contain `SKILL.md.tmpl` files). Each `SKILL.md`
>    is generated from a `SKILL.md.tmpl` by `pnpm skills:gen`. If I customised any
>    `SKILL.md` by hand, move my edits into a new `.tmpl` for that skill (put
>    `{{PREAMBLE}}` as the first line of its `## Ground rules`) and show me
>    anything you are unsure about — do not discard a customisation.
> 6. **Check it works**: run `pnpm lint && pnpm test`, then
>    `pnpm exec tsx scripts/hooks/session-update-check.ts` — it should print
>    nothing (I'm on the latest). Report what each command actually printed.
> 7. Commit as `chore(update): apply Liftkit 0.3.0`.

### Added

- **A session-start notice.** Once a day at most, your agent tells you when a
  newer template has shipped: _"Liftkit 0.4.0 is available (you're on 0.3.0). Run
  /update…"_. Silent when there's nothing new, no network, or no access — a check
  that nags is a check you'd turn off.
- **The `/update` skill.** It reads what changed between your version and the
  latest, walks each release's apply plan in order, copies real files from a fresh
  template clone, adapts around the code you've already written, commits per
  version, and gates between each. Your project is a copy, not a fork, so it never
  merges or rebases against the template.
- **`.liftkit-version`** — the template version your project is on, tracked
  separately from `package.json`'s `version`, which stays yours. Ship your own
  1.0.0 whenever you like; the update check won't get confused.
- **`pnpm release <x.y.z>`** (maintainers only, not shipped in the template) cuts
  a release and propagates it to the template in one command — or refuses, if the
  version has no changelog section with an apply plan. No plan, no release.

---

## [0.2.0] — 2026-07-13

**The agent layer stops asking and starts enforcing.** Every rule in this
release moved from the prose column into the machine column: an invariant that
used to be a request an agent could talk itself out of is now a hook that
refuses the write, a test that fails the build, or a gate that goes red.

### Apply plan

Paste this into your project's Claude Code session. It adapts the changes around
whatever you have already built, and stops to ask before anything destructive.

> Update this project from Liftkit 0.1.0 to 0.2.0. Work on a branch, commit each
> step, and run `pnpm lint && pnpm test` before you finish.
>
> 1. **Invariant hook.** Copy `scripts/hooks/` and `.claude/settings.json` from
>    the template. If I already have a `.claude/settings.json`, merge the
>    `hooks.PreToolUse` entry into it rather than overwriting my file. Then
>    check my `src/` for code the hook would now deny — an internal `<a href>`,
>    a `window.location` assignment, any network or db call in
>    `src/middleware.ts` — and show me each one before fixing it.
> 2. **Skill compiler.** Copy `scripts/gen-skills.ts`, `scripts/lib/codegen.ts`
>    and the `skills:gen`/`skills:check` scripts. My `.claude/skills/*/SKILL.md`
>    files are now GENERATED: for each skill I have customised, move my edits
>    into a new `SKILL.md.tmpl` (put `{{PREAMBLE}}` as the first line of its
>    `## Ground rules`), then run `pnpm skills:gen`. Do not throw away a
>    customisation — show me anything you are unsure about.
> 3. **The rest**, in order, running the gates after each: the coverage floor and
>    size budget (`scripts/lib/skill-coverage.ts`, `scripts/skill-coverage.test.ts`,
>    `scripts/fixtures/skill-size-baseline.json` — regenerate the baseline from
>    MY skills, not the template's); the `learn` and `design` skills; the
>    detection eval and its `tests/fixtures/planted-defects/`; the updated
>    `review`, `feature` and `doubt` skills; the `CLAUDE.md`/`AGENTS.md` entry-map
>    test.
> 4. Add `docs/research/` to `.gitignore` if you keep competitor notes locally.

### Added

- **The hard invariants are enforced, not requested.** A `PreToolUse` hook
  (`scripts/hooks/pretooluse.ts`, registered in `.claude/settings.json`) reads
  every proposed edit and denies an internal `<a href>`/`window.location`
  navigation, any network or db call in `src/middleware.ts`, and a
  non-conventional commit subject; a server action that takes input with no
  visible `zod` parse is escalated to `ask`. The hook always exits 0 and fails
  open — a guard that can brick a session is a guard that gets uninstalled.
- **Skills are compiled, not copy-pasted.** `SKILL.md` is now generated from
  `SKILL.md.tmpl` (`pnpm skills:gen`), with the shared prelude written once and
  injected by tier. `pnpm skills:check` fails CI if a generated file was
  hand-edited. This landed because the "chat in the project's language" rule had
  drifted into five different wordings across five skills.
- **Two new skills.** `learn` — cross-session memory in `docs/learnings.jsonl`
  that garbage-collects itself (a note whose file is gone is stale; a note a
  newer one contradicts is superseded; nothing is deleted without asking).
  `design` — the visual loop: a token SSOT read out of the real stylesheet,
  variants that must differ on a named axis, a taste profile that decays 5% a
  week, and a 375/768/1280 review with a screenshot behind every finding.
- **The skill harness can now fail.** A coverage floor (every skill must be
  registered with what proves it works), a size budget against a committed
  baseline (a skill's body is a running token cost, and the shared preamble is a
  multiplier), and a detection eval (`pnpm skills:evals:detection`) that runs
  `review` against five planted defects and asserts a detection-rate floor.
  The eval is a **local** command run under your Claude subscription, not a CI
  job — Actions has no subscription to borrow, and a gate that is always red
  teaches people to ignore gates.
- **`feature` gained a plan artifact and a resume protocol.** The plan ends with
  the literal line `NO UNRESOLVED DECISIONS`, read back before implementing, so
  "did planning finish?" is a grep rather than a feeling.

- **Working login out of the box.** Email/password sign-in with a seeded admin
  (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, hashed with bcryptjs into a new
  nullable `users.password_hash` column). No OAuth account needed — Google and
  GitHub stay optional and are unreachable in some regions. The sign-in action
  validates with `zod` and rate-limits before checking the hash; the
  credentials check lives in `src/lib/auth.ts` so the edge-safe config and
  middleware stay database-free. A failed sign-in shows a generic error under
  the form and keeps the email you typed.
- **Dev bypass.** `pnpm dev` signs you in as the seeded admin automatically
  (`AUTH_DEV_BYPASS=true` in the new `.env.development`, which Next loads only
  when `NODE_ENV=development`). It defaults to off everywhere else, and the app
  refuses to boot if it is on in production. `scripts/seed.ts` refuses to run
  against production.
- **Onboarding shows you the app.** `/liftoff` Step 5 now starts the dev
  server, prints the URL, and waits for you to look before finishing —
  the server stays running afterwards. New sub-step 4f explains the auth mode
  and hands you the admin credentials.
- **Chat language is chosen, not guessed.** Step 0 asks which language the
  agent should chat in and records it in `docs/manifest.md`, so every later
  session — with or without skills — uses it. Repo artifacts stay English.

### Changed

- `review` now scores each finding for confidence and **drops** any it cannot
  quote a line for — not softened, not filed under "possible issues".
- `doubt` carries a one-way-door registry: whether a decision must be asked is a
  declared property of the decision, not a read on how confident the agent feels.
- `CLAUDE.md` and `AGENTS.md` are tested to name the same rules files. They had
  drifted: AGENTS.md silently omitted `definition-of-done.md` and `sources.md`.
- **One app port, 3210** (`config/ports.ts`), replacing the hardcoded `3000` in
  Playwright, Lighthouse, and env defaults. `pnpm dev` shifts to the next free
  port if 3210 is taken and prints the URL it actually bound.
- **The e2e suite always boots its own production build**
  (`reuseExistingServer: false`), so a running `pnpm dev` can no longer be
  tested by mistake in place of the real build. It runs with the dev bypass
  off, exercising the real login on every gate run.

### Fixed

- PGlite is loaded via native `require` (`serverExternalPackages`); bundled
  into a server chunk it crashed the credentials sign-in in a production build.
- Sign-in normalises email case and whitespace, so `Admin@example.local` logs
  in and the rate-limit bucket cannot be sidestepped by varying the case.

---

## [0.1.0] — 2026-07-09

Initial release.

### Added

- **Skeleton**: Next.js (App Router) + TypeScript strict + Tailwind v4 +
  shadcn/ui with two-theme design tokens; Drizzle ORM with PGlite by default
  (zero external services) and a `LIFTKIT_DB=remote` switch for real
  Postgres; Auth.js v5 with local-JWT sessions; error surfaces, structured
  logging (pino + `onRequestError`), env-gated Sentry and PostHog slots;
  security baseline (validated env, security headers, rate-limit helper);
  SEO minimum (metadata, sitemap, robots, OG template).
- **Quality gates**: one `pnpm lint` chain (oxlint → ESLint architecture
  boundaries → Prettier → tsc); three Vitest projects (unit / component /
  integration on real PGlite); Playwright e2e (desktop + mobile, including
  an SPA-navigation gate); Lighthouse budgets (perf & a11y ≥ 0.90);
  dependency audit gate; lefthook pre-commit.
- **Agent infrastructure**: `/liftoff` onboarding (idea → PRD → specs →
  adapted running app, resumable); daily skills `feature`, `review`,
  `verify`, `deploy`; six rules files with named enforcement;
  authoring templates and ADR system.
- **Playbooks**: deploy (Vercel + managed Postgres), billing (Stripe),
  pricing, landing, analytics, compliance, AI integration.
- **qa-pilot bridge**: pre-filled project profile for the optional QA
  copilot plugin.
