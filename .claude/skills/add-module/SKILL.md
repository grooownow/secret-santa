---
name: add-module
preamble-tier: 2
description: Installs a whole optional capability MODULE — currently `persistence` (the database + auth layer) or `observability` (Sentry error tracking) — into a Gridfin project you have ALREADY started, by running that module's `modules/<name>/module.md` apply-plan (`pnpm module:apply <name>`), resolving its `depends-on` first, reconciling any project-diverged module-owned file instead of clobbering it, then recording the module in the manifest `## Installed modules` and flipping `## Preset` from Landing to App when persistence lands. Use when the user wants to install the persistence or observability module, add the database-and-auth layer to a landing-page project, or wire in error tracking / crash reporting / Sentry — infrastructure that a module ships wholesale. NOT for building a single roadmap feature or screen, onboarding a fresh template, or deploying to production.
---

<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly. Regenerate: pnpm skills:gen -->

# Add module

A **module** is an optional capability the template ships pre-built under
`modules/<name>/` — `persistence` (Drizzle + next-auth) or `observability`
(Sentry) today. This skill installs one into a project that is **already
started**: the mechanical half is deterministic (`pnpm module:apply <name>`
copies files, merges deps, splices fragments), and the judgment half — resolving
dependencies, reconciling files the project has since diverged, recording the
install in the manifest — is what this skill owns.

The apply-plan lives in the module, not here. Each `modules/<name>/module.md`
has an `## Apply plan` written for exactly this moment; you read it fresh and
run it. If this skill and a module's plan ever disagree, the plan wins.

## Ground rules

<!-- Generated from the shared preamble (scripts/lib/codegen.ts). Edit it there, not here. -->

- **Language:** chat with the user in the project's chat language
  (`docs/manifest.md` → _Chat language_; falls back to the language of the
  user's messages while unset). Every artifact that lives in the repo — code,
  docs, commit messages — is English.
- **Evidence, not adjectives.** Never report a command as green without quoting
  the line that proves it. "It should pass" is not a result, and the word
  _should_ in a status line is a red flag about your own honesty.
- **The hard invariants** (`CLAUDE.md`), which a `PreToolUse` hook
  (`scripts/hooks/pretooluse.ts`) enforces at the moment of the write — do not
  design around them, and do not treat a hook denial as a puzzle to route
  around:

  1. No internal `<a href>`/`window.location` navigation — always `<Link>`.
  2. No network/db call in `src/middleware.ts` — the JWT check stays local.
     Applies only once the `persistence` module is installed (`src/middleware.ts`
     does not exist in a Landing-preset project).
  3. No feature ships without a test proven able to fail.
  4. Every server action/route validates input with `zod` before use.
  5. Every commit follows Conventional Commits (one exception: `/gridfin`
     onboarding commits — see `docs/rules/git.md`).
  6. UI colors come from the design tokens in `src/app/globals.css` — no
     hardcoded hex/rgb/hsl or arbitrary-value color classes in components
     (Next metadata images are exempt; see `docs/rules/frontend.md`).

- **Read the rule that governs the step you are on, at the moment you reach it** —
  not from memory, and not all of them up front:

  - `docs/rules/architecture.md` — new routes, feature slices, data access, import direction, schema changes.
  - `docs/rules/definition-of-done.md` — every change, without exception — this is the standing bar, and the one rules file that is never out of scope.
  - `docs/rules/docs.md` — any change to `docs/`, `CLAUDE.md`/`AGENTS.md`, or a decision worth remembering across sessions. Docs are the interface between agent sessions — stale docs are worse than missing ones.
  - `docs/rules/frontend.md` — any page, component, mutation, or loading state — responsiveness is an invariant here, not a nice-to-have.
  - `docs/rules/git.md` — every commit, branch, and merge in this repo.
  - `docs/rules/modules.md` — any `modules/<name>/` directory and any skill that installs one.
  - `docs/rules/security.md` — every server action, route handler, env var, and auth-adjacent change — this is baseline, not opt-in.
  - `docs/rules/skills.md` — any change under `.claude/skills/**`, `.claude/skill-steps/**`, or the compiler that builds them (`scripts/lib/codegen.ts`, `scripts/gen-skills.ts`). The skills are the product — this is the contract they are written against.
  - `docs/rules/sources.md` — any line of code or prose that asserts how a third-party framework, library, or API behaves.
  - `docs/rules/testing.md` — every code change — no feature is done without tests.

- **The module owns its plan.** Read `modules/<name>/module.md`'s `## Apply
plan` at run time and follow its steps — never recite a plan from memory or
  invent steps the module does not list.
- **Apply, then reconcile — never blindly clobber.** `pnpm module:apply`
  OVERWRITES the module-owned shared files it ships (for `persistence`:
  `src/lib/env.ts`, `src/lib/env.test.ts`, `src/app/page.tsx`,
  `playwright.config.ts`, `src/core-boundary.test.ts`). If the project has
  DIVERGED one of those — a landing page you rewrote, a customized `env.ts` —
  do not accept the overwrite as-is: read the pre-apply version (via `git`),
  re-apply the module's intent, and keep the project's own additions. A module
  that ships no shared "owned" files — `observability` only adds its own new
  files plus one dependency, overwriting nothing — has nothing to reconcile:
  the reconcile step applies only to modules that overwrite shared files (e.g.
  `persistence`: `env.ts`/`page.tsx`/`playwright.config.ts`).
- **One question, not an interview.** If the user named no module, show the
  available choices once and ask which. Otherwise proceed. That question is
  this skill's only human checkpoint — a session that drops before the answer
  resumes at Step 1, with nothing applied.
- **Evidence per the `review` skill.** Do not report a step applied without a
  diff, a file on disk, or a green gate to quote. "Should be applied" is not
  applied.
- **Every fix-and-retry loop is bounded: two honest attempts at the same
  failure, then stop.** Report the exact command output, the state you are in,
  and what you would try next; let the user decide. A third attempt on the same
  red gate is not persistence — it is where you start changing code you have
  stopped understanding, and where a real failure gets buried under repair
  attempts.
- **A loop that waits on a person is not bounded by that budget** — it ends
  when they answer. It owes something else instead: say, before you ask, where
  the flow resumes if the session drops before the answer arrives.
- **Format before every commit.** Run `pnpm format` first — lefthook's
  pre-commit `prettier --check` rejects an unformatted file, and a commit
  rejected in the middle of a flow is how a step ends up half-applied.
- **A commit is a resume point, so only green steps get one.** Never commit
  over a red gate: a session that drops after a green commit resumes from a
  known state, and one that committed a red step leaves the next session
  trusting work that does not pass.

## Step 1 — Survey: what is installed, what is available

1. **List available modules** — one line each from every
   `modules/*/module.md` (its front-matter `description`).
2. **Read the manifest** `## Installed modules` in `docs/manifest.md` to see
   what this project already has.
3. **If the requested module is already installed, stop and say so** — there is
   nothing to apply. Do not re-run the plan.
4. **If the user named no module,** show the available-vs-installed list and ask
   which one to add (a single question). Then continue.

## Step 2 — Resolve dependencies

Read the target module's `depends-on` (front matter). For each dependency **not
yet in the manifest `## Installed modules`**, install it FIRST — run this same
flow (Steps 3-6) for the dependency before the target, in listed order. A
module whose dependencies are all present has nothing extra to do here.

## Step 3 — Apply the module's plan

Follow the target `modules/<name>/module.md` `## Apply plan`, in order:

1. **Mechanical apply.** `pnpm module:apply <name>` — copies the module's files,
   merges its `package.json` deps/scripts, splices its fragments. Then
   `pnpm install` for the new dependencies.
2. **The module's own env / wiring steps.** Do exactly what the plan lists
   (env vars to set, a schema to confirm, a matcher to widen). These are
   judgment steps the mechanical applier cannot do.
3. **Reconcile diverged files.** For every module-owned shared file the apply
   overwrote (see Ground rules), check whether the project had customised it.
   If so, read the pre-apply version with `git show HEAD:<path>`, merge the
   module's change into the project's version by hand, and confirm the result
   keeps both. For a fresh, undiverged project this is a no-op — the copy is
   already correct.

## Step 4 — Verify

Run the module's `## Verify` gates exactly as the plan lists them, then the
project's own `pnpm lint && pnpm test` (and `pnpm test:e2e` if the module added
e2e coverage — `persistence` does). Quote the passing output. A red gate is
part of this module's work: fix it (or surface it as a reconcile conflict per
Step 3) before recording or committing.

## Step 5 — Record in the manifest

1. **Append the module** to `docs/manifest.md` `## Installed modules`, in
   install order (dependencies before the module that needed them).
2. **If `persistence` was just added, change `## Preset`** from `Landing` to
   `App` — a project with a database and auth is no longer a Landing project.
   Other modules leave the preset alone.

## Step 6 — Commit

Commit with the module's own conventional subject (the plan names it, e.g.
`feat(persistence): add database and auth`). If a dependency was installed
first, it is its own commit — one module, one commit, in install order.

## STOP conditions

- The requested module is already in `## Installed modules` → stop, say so.
- No module named and the user has not picked one → ask, then continue.
- A module-owned file the apply would overwrite has been diverged and you
  cannot reconcile it cleanly → stop, show the specific conflict (template's
  change vs. the project's), and let the user decide. Do not flatten their work.
- A `## Verify` gate stays red after a genuine fix attempt → stop and report;
  do not record the install or commit over a red gate.

## Common rationalizations

| Rationalization                                                     | Reality                                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "`module:apply` copied the files, so the install is done"           | That is only the mechanical half. The env vars, schema, matcher, and manifest record are judgment steps the applier cannot do — the module's plan lists them. |
| "The apply overwrote `page.tsx`; the module's version is canonical" | Only for an undiverged project. If the project rewrote that page, blindly accepting the copy deletes their work. Read the pre-apply version and reconcile.    |
| "I'll skip the `depends-on` — the user only asked for this module"  | A module with a missing dependency does not work. Install dependencies first, in order, each as its own commit — that is what `depends-on` is for.            |
| "I added persistence; the manifest is close enough"                 | An unrecorded install is invisible to the next session, and a Landing preset with a database is a lie. Append to `## Installed modules` and flip the preset.  |

## Red flags

- A module-owned shared file overwritten without checking whether the project
  diverged it first
- `depends-on` skipped, or dependencies installed after the module that needs them
- The manifest `## Installed modules` not updated, or `## Preset` left `Landing`
  after `persistence` landed
- A step reported applied with no diff, file, or green gate to quote
- The install recorded or committed over a red `## Verify` gate
- A plan recited from memory instead of read fresh from `modules/<name>/module.md`
